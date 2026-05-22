/* ── POST /api/chat — streaming chat endpoint (SSE) ── */

import { NextRequest } from "next/server";
import { writeFileSync, mkdirSync, existsSync } from "fs";
import { join, dirname } from "path";
import { loadConfig, resolveModel } from "@/app/lib/config";
import { loadConversation, appendExchange, conversationDir } from "@/app/lib/conversations";
import { buildMessagesForApi } from "@/app/lib/messages";
import { callStreaming as openaiStream } from "@/app/lib/providers/openai";
import { callStreaming as openrouterStream } from "@/app/lib/providers/openrouter";
import type { ApiMessage, StreamChunk } from "@/app/lib/types";

/** Save a base64 data URL image to disk, return the file path. */
function saveImage(dataUrl: string, index: number): string {
  const dirPath = join(conversationDir(), "images");
  if (!existsSync(dirPath)) {
    mkdirSync(dirPath, { recursive: true });
  }

  const match = dataUrl.match(/^data:image\/(\w+);base64,(.+)$/);
  if (!match) return "";

  const ext = match[1];
  const b64 = match[2];
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").slice(0, 19);
  const filename = `${timestamp}_${index}.${ext}`;
  const filepath = join(dirPath, filename);

  writeFileSync(filepath, Buffer.from(b64, "base64"));
  return filepath;
}

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    content,
    model: modelStr,
    filepath,
    systemPrompt,
    thinking,
    attachments,
  } = body as {
    content: string;
    model?: string;
    filepath: string;
    systemPrompt?: string;
    thinking?: string;
    attachments?: { data: string; mime: string; name: string }[];
  };

  if (!content || !filepath) {
    return new Response(
      JSON.stringify({ error: "content and filepath are required" }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  }

  const config = loadConfig();
  const effectiveModel = modelStr ?? config.default_model ?? "gpt5";

  let provider: string;
  let modelId: string;
  try {
    [provider, modelId] = resolveModel(effectiveModel, config);
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return new Response(JSON.stringify({ error: msg }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Load conversation history
  let history: import("@/app/lib/types").ConversationMessage[] = [];
  let meta: import("@/app/lib/types").ConversationMeta | null = null;
  try {
    const conv = loadConversation(filepath);
    history = conv.messages;
    meta = conv.meta;
  } catch {
    // New or missing conversation — start fresh
  }

  // Build API messages, including any attached images
  const apiMessages = buildMessagesForApi({
    history,
    systemPrompt,
    currentContent: content,
    summary: meta?.summary ?? undefined,
    attachments,
  });

  // Pick streaming function based on provider
  const streamFn = provider === "openai" ? openaiStream : openrouterStream;

  // Create SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const textParts: string[] = [];
      const imagePaths: string[] = [];

      try {
        const gen: AsyncGenerator<StreamChunk> = streamFn(
          apiMessages,
          modelId,
          thinking
        );

        for await (const chunk of gen) {
          if (chunk.type === "text" && chunk.content) {
            textParts.push(chunk.content);
          } else if (chunk.type === "image" && chunk.content) {
            // Save image to disk, send path to client (and data URL for rendering)
            const savedPath = saveImage(chunk.content, imagePaths.length);
            if (savedPath) imagePaths.push(savedPath);
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }

        // Save the exchange to the conversation file
        const fullText = textParts.join("");
        if (fullText || imagePaths.length > 0) {
          const assistantMsg: Record<string, unknown> = {
            type: "assistant",
            sender: modelId,
            model: modelId,
            content: fullText,
          };
          if (imagePaths.length > 0) {
            assistantMsg.images = imagePaths;
          }
          appendExchange(
            filepath,
            { type: "user", sender: "user", content },
            assistantMsg as { type: "assistant"; sender: string; model: string; content: string }
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        controller.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ type: "error", content: msg })}\n\n`
          )
        );
      } finally {
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
