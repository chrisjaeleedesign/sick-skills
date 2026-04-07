/* ── OpenRouter provider ── */

import type { ApiMessage, StreamChunk } from "../types";

const API_URL = "https://openrouter.ai/api/v1/chat/completions";

function getApiKey(): string {
  const key = process.env.OPENROUTER_API_KEY;
  if (!key) {
    throw new Error(
      "OPENROUTER_API_KEY not set. Add it to .env at the repo root or set it in your shell."
    );
  }
  return key;
}

/**
 * Streaming call to OpenRouter.
 * Yields StreamChunk objects.
 */
export async function* callStreaming(
  messages: ApiMessage[],
  model: string,
  thinking?: string
): AsyncGenerator<StreamChunk> {
  const apiKey = getApiKey();

  const payload: Record<string, unknown> = {
    model,
    messages,
    stream: true,
  };

  if (thinking) {
    payload.reasoning = { effort: thinking };
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter API error ${response.status}: ${errorText.slice(0, 500)}`
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

      const choices = event.choices as {
        delta?: { content?: string; reasoning?: string };
      }[];

      if (!Array.isArray(choices)) continue;

      for (const choice of choices) {
        const delta = choice.delta;
        if (!delta) continue;

        if (delta.reasoning) {
          yield { type: "reasoning", content: delta.reasoning };
        }
        if (delta.content) {
          yield { type: "text", content: delta.content };
        }
      }
    }
  }

  yield { type: "done" };
}

/**
 * Non-streaming call.
 */
export async function call(
  messages: ApiMessage[],
  model: string,
  thinking?: string
): Promise<string> {
  const apiKey = getApiKey();

  const payload: Record<string, unknown> = {
    model,
    messages,
  };

  if (thinking) {
    payload.reasoning = { effort: thinking };
  }

  const response = await fetch(API_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(
      `OpenRouter API error ${response.status}: ${errorText.slice(0, 500)}`
    );
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content ?? "";
}
