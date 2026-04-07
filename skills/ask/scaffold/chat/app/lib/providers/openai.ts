/* ── OpenAI provider via Codex OAuth tokens ── */

import { readFileSync, existsSync } from "fs";
import { resolve } from "path";
import { execSync } from "child_process";
import jwt from "jsonwebtoken";
import type { ApiMessage, StreamChunk } from "../types";

const AUTH_PATHS = [
  resolve(process.env.HOME ?? "~", ".codex/auth.json"),
  resolve(process.env.HOME ?? "~", ".chatgpt-local/auth.json"),
];

const API_URL = "https://chatgpt.com/backend-api/codex/responses";

interface CodexTokens {
  access_token: string;
  refresh_token?: string;
  account_id?: string;
}

function findAuthFile(): string | null {
  for (const p of AUTH_PATHS) {
    if (existsSync(p)) return p;
  }
  return null;
}

function loadCodexAuth(): CodexTokens | null {
  const authPath = findAuthFile();
  if (!authPath) return null;
  try {
    const data = JSON.parse(readFileSync(authPath, "utf-8"));
    const tokens = data.tokens ?? {};
    if (!tokens.access_token) return null;
    return {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      account_id: tokens.account_id,
    };
  } catch {
    return null;
  }
}

function isTokenExpired(accessToken: string): boolean {
  try {
    const payload = jwt.decode(accessToken) as { exp?: number } | null;
    if (!payload?.exp) return true;
    return Date.now() / 1000 > payload.exp - 300;
  } catch {
    return true;
  }
}

function extractAccountId(accessToken: string): string | null {
  try {
    const payload = jwt.decode(accessToken) as Record<string, unknown> | null;
    const authClaim = payload?.["https://api.openai.com/auth"] as
      | { chatgpt_account_id?: string }
      | undefined;
    return authClaim?.chatgpt_account_id ?? null;
  } catch {
    return null;
  }
}

function runCodexLogin(): CodexTokens | null {
  console.error("Codex tokens expired or missing. Running `codex login`...");
  try {
    execSync("codex login", { stdio: "inherit", timeout: 120_000 });
    return loadCodexAuth();
  } catch {
    throw new Error("Codex CLI not found or login failed. Run: npm install -g @openai/codex");
  }
}

function getValidTokens(): CodexTokens {
  let tokens = loadCodexAuth();

  if (!tokens) {
    tokens = runCodexLogin();
    if (!tokens) throw new Error("Failed to obtain OpenAI tokens after login.");
    return tokens;
  }

  if (isTokenExpired(tokens.access_token)) {
    tokens = runCodexLogin();
    if (!tokens) throw new Error("Failed to refresh OpenAI tokens.");
  }

  return tokens;
}

/**
 * Convert chat messages to Codex Responses API format.
 */
function toResponsesFormat(messages: ApiMessage[]): {
  instructions: string;
  input: { role: string; content: string | unknown[] }[];
} {
  let instructions = "";
  const input: { role: string; content: string | unknown[] }[] = [];

  for (const msg of messages) {
    if (msg.role === "system") {
      instructions = typeof msg.content === "string"
        ? msg.content
        : JSON.stringify(msg.content);
    } else {
      input.push({ role: msg.role, content: msg.content });
    }
  }

  return { instructions, input };
}

/**
 * Streaming call to OpenAI via Codex OAuth.
 * Yields StreamChunk objects as SSE events arrive.
 */
export async function* callStreaming(
  messages: ApiMessage[],
  model: string,
  thinking?: string
): AsyncGenerator<StreamChunk> {
  const tokens = getValidTokens();
  const accountId =
    tokens.account_id ?? extractAccountId(tokens.access_token);

  const headers: Record<string, string> = {
    Authorization: `Bearer ${tokens.access_token}`,
    "Content-Type": "application/json",
    "OpenAI-Beta": "responses=experimental",
  };
  if (accountId) headers["chatgpt-account-id"] = accountId;

  const { instructions, input } = toResponsesFormat(messages);

  const payload: Record<string, unknown> = {
    model,
    instructions,
    input,
    store: false,
    stream: true,
  };

  if (thinking) {
    payload.reasoning = { effort: thinking, summary: "auto" };
  }

  let response = await fetch(API_URL, {
    method: "POST",
    headers,
    body: JSON.stringify(payload),
  });

  // Re-auth on 401
  if (response.status === 401) {
    console.error("Got 401, re-authenticating...");
    const newTokens = runCodexLogin();
    if (!newTokens) throw new Error("Re-authentication failed.");
    headers.Authorization = `Bearer ${newTokens.access_token}`;
    const newAccountId =
      newTokens.account_id ?? extractAccountId(newTokens.access_token);
    if (newAccountId) headers["chatgpt-account-id"] = newAccountId;

    response = await fetch(API_URL, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenAI API error ${response.status}: ${errorText.slice(0, 500)}`
    );
  }

  if (!response.body) throw new Error("No response body");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.startsWith("data: ")) continue;
      const dataStr = line.slice(6);
      if (dataStr === "[DONE]") {
        yield { type: "done" };
        return;
      }

      let event: Record<string, unknown>;
      try {
        event = JSON.parse(dataStr);
      } catch {
        continue;
      }

      const eventType = event.type as string;

      // Reasoning summary
      if (eventType === "response.reasoning_summary_text.delta") {
        const delta = event.delta as string;
        if (delta) yield { type: "reasoning", content: delta };
      }

      // Output text
      else if (eventType === "response.output_text.delta") {
        const delta = event.delta as string;
        if (delta) yield { type: "text", content: delta };
      } else if (eventType === "response.content_part.delta") {
        const delta = event.delta as { type?: string; text?: string };
        if (delta?.type === "output_text" && delta.text) {
          yield { type: "text", content: delta.text };
        }
      }

      // Chat completions fallback
      else if (Array.isArray((event as Record<string, unknown>).choices)) {
        const choices = event.choices as {
          delta?: { content?: string };
        }[];
        for (const choice of choices) {
          if (choice.delta?.content) {
            yield { type: "text", content: choice.delta.content };
          }
        }
      }
    }
  }

  yield { type: "done" };
}

/**
 * Non-streaming call. Collects all text and returns it.
 */
export async function call(
  messages: ApiMessage[],
  model: string,
  thinking?: string
): Promise<string> {
  const parts: string[] = [];
  for await (const chunk of callStreaming(messages, model, thinking)) {
    if (chunk.type === "text" && chunk.content) {
      parts.push(chunk.content);
    }
  }
  return parts.join("");
}
