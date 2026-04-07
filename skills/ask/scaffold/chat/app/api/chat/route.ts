/* ── POST /api/chat — streaming chat endpoint (SSE) ── */

import { NextRequest } from "next/server";
import { loadConfig, resolveModel } from "@/app/lib/config";
import { loadConversation, appendExchange } from "@/app/lib/conversations";
import { buildMessagesForApi } from "@/app/lib/messages";
import { callStreaming as openaiStream } from "@/app/lib/providers/openai";
import { callStreaming as openrouterStream } from "@/app/lib/providers/openrouter";
import type { StreamChunk } from "@/app/lib/types";

export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    content,
    model: modelStr,
    filepath,
    systemPrompt,
    thinking,
  } = body as {
    content: string;
    model?: string;
    filepath: string;
    systemPrompt?: string;
    thinking?: string;
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

  // Build API messages
  const apiMessages = buildMessagesForApi({
    history,
    systemPrompt,
    currentContent: content,
    summary: meta?.summary ?? undefined,
  });

  // Pick streaming function based on provider
  const streamFn = provider === "openai" ? openaiStream : openrouterStream;

  // Create SSE response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const textParts: string[] = [];

      try {
        const gen: AsyncGenerator<StreamChunk> = streamFn(
          apiMessages,
          modelId,
          thinking
        );

        for await (const chunk of gen) {
          if (chunk.type === "text" && chunk.content) {
            textParts.push(chunk.content);
          }

          controller.enqueue(
            encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`)
          );
        }

        // Save the exchange to the conversation file
        const fullText = textParts.join("");
        if (fullText) {
          appendExchange(
            filepath,
            { type: "user", sender: "user", content },
            {
              type: "assistant",
              sender: modelId,
              model: modelId,
              content: fullText,
            }
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
