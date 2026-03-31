import type {
  Conversation,
  ConversationMeta,
  ModelConfig,
  PersonaInfo,
  FlowInfo,
  StreamEvent,
} from "./types";

const BASE = "/api";

async function json<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${url}`, init);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export async function fetchConversations(): Promise<
  Array<ConversationMeta & { filename: string }>
> {
  return json("/conversations");
}

export async function fetchConversation(
  filename: string
): Promise<Conversation> {
  return json(`/conversations/${encodeURIComponent(filename)}`);
}

export async function createConversation(opts: {
  title?: string;
  tags?: string[];
  flow?: string;
  id?: string;
}): Promise<{ filename: string; meta: ConversationMeta }> {
  return json("/conversations", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
}

export async function sendMessage(
  filename: string,
  opts: {
    content: string;
    model?: string;
    persona?: string;
    thinking?: string;
    attachments?: Array<{ path: string; mime: string }>;
  }
): Promise<Response> {
  const res = await fetch(
    `${BASE}/conversations/${encodeURIComponent(filename)}/messages`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(opts),
    }
  );
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res;
}

export async function branchConversation(
  filename: string,
  fromExchange: number,
  id?: string
): Promise<{ filename: string; meta: ConversationMeta }> {
  return json(`/conversations/${encodeURIComponent(filename)}/branch`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ from_exchange: fromExchange, id }),
  });
}

export async function fetchConfig(): Promise<ModelConfig> {
  return json("/config");
}

export async function fetchPersonas(): Promise<PersonaInfo[]> {
  return json("/personas");
}

export async function fetchFlows(): Promise<FlowInfo[]> {
  return json("/flows");
}

export function parseSSEStream(
  response: Response,
  onEvent: (event: StreamEvent) => void,
  onError: (error: Error) => void
): () => void {
  let cancelled = false;

  async function read() {
    const reader = response.body?.getReader();
    if (!reader) {
      onError(new Error("No response body"));
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (!cancelled) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          const trimmed = line.trim();
          if (!trimmed || !trimmed.startsWith("data: ")) continue;
          const payload = trimmed.slice(6);
          if (payload === "[DONE]") {
            onEvent({ type: "done" });
            return;
          }
          try {
            const event: StreamEvent = JSON.parse(payload);
            onEvent(event);
          } catch {
            // skip malformed lines
          }
        }
      }
    } catch (err) {
      if (!cancelled) {
        onError(err instanceof Error ? err : new Error(String(err)));
      }
    } finally {
      reader.releaseLock();
    }
  }

  read();

  return () => {
    cancelled = true;
  };
}
