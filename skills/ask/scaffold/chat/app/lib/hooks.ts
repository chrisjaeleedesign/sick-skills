"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import type { ConversationListItem, ConversationMeta, ConversationMessage } from "./types";

/* ── useModels ── */

interface ModelInfo {
  alias: string;
  provider: string;
  modelId: string;
}

export function useModels() {
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [defaultModel, setDefaultModel] = useState("gpt5");

  useEffect(() => {
    fetch("/api/models")
      .then((r) => r.json())
      .then((data) => {
        if (data.ok) {
          setModels(data.models);
          setDefaultModel(data.default);
        }
      })
      .catch(console.error);
  }, []);

  return { models, defaultModel };
}

/* ── useConversations ── */

export function useConversations(project?: string) {
  const [conversations, setConversations] = useState<ConversationListItem[]>([]);
  const [projects, setProjects] = useState<{ id: string; name: string; conversationCount: number }[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchConversations = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (project) params.set("project", project);
    const res = await fetch(`/api/conversations?${params}`);
    const data = await res.json();
    if (data.ok) {
      setConversations(data.conversations);
      setProjects(data.projects);
    }
    setLoading(false);
  }, [project]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  const createConversation = useCallback(
    async (opts: { title?: string; project?: string }) => {
      const res = await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "create", ...opts }),
      });
      const data = await res.json();
      if (data.ok) {
        await fetchConversations();
        return data as { meta: ConversationMeta; filepath: string };
      }
      return null;
    },
    [fetchConversations]
  );

  const deleteConversation = useCallback(
    async (filepath: string) => {
      await fetch("/api/conversations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "delete", filepath }),
      });
      await fetchConversations();
    },
    [fetchConversations]
  );

  return { conversations, projects, loading, fetchConversations, createConversation, deleteConversation };
}

/* ── useConversation (single) ── */

export function useConversation(filepath: string | null) {
  const [meta, setMeta] = useState<ConversationMeta | null>(null);
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchConversation = useCallback(async () => {
    if (!filepath) return;
    setLoading(true);
    const res = await fetch(`/api/conversations?id=${encodeURIComponent(filepath)}`);
    const data = await res.json();
    if (data.ok) {
      setMeta(data.meta);
      setMessages(data.messages);
    }
    setLoading(false);
  }, [filepath]);

  useEffect(() => {
    fetchConversation();
  }, [fetchConversation]);

  return { meta, messages, loading, refetch: fetchConversation, setMessages };
}

/* ── useChat (streaming) ── */

export function useChat(filepath: string | null) {
  const [streaming, setStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState("");
  const [reasoningText, setReasoningText] = useState("");
  const abortRef = useRef<AbortController | null>(null);

  const sendMessage = useCallback(
    async (opts: {
      content: string;
      model?: string;
      systemPrompt?: string;
      thinking?: string;
      onDone?: (fullText: string) => void;
    }) => {
      if (!filepath || streaming) return;

      setStreaming(true);
      setStreamingText("");
      setReasoningText("");

      const abort = new AbortController();
      abortRef.current = abort;

      try {
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            content: opts.content,
            model: opts.model,
            filepath,
            systemPrompt: opts.systemPrompt,
            thinking: opts.thinking,
          }),
          signal: abort.signal,
        });

        if (!res.ok) {
          const err = await res.json();
          throw new Error(err.error ?? "Chat request failed");
        }

        const reader = res.body?.getReader();
        if (!reader) throw new Error("No response body");

        const decoder = new TextDecoder();
        let buffer = "";
        let fullText = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() ?? "";

          for (const line of lines) {
            if (!line.startsWith("data: ")) continue;
            const dataStr = line.slice(6);
            try {
              const chunk = JSON.parse(dataStr);
              if (chunk.type === "text" && chunk.content) {
                fullText += chunk.content;
                setStreamingText(fullText);
              } else if (chunk.type === "reasoning" && chunk.content) {
                setReasoningText((prev) => prev + chunk.content);
              } else if (chunk.type === "error") {
                throw new Error(chunk.content);
              }
            } catch (e) {
              if (e instanceof SyntaxError) continue;
              throw e;
            }
          }
        }

        opts.onDone?.(fullText);
      } catch (e) {
        if ((e as Error).name === "AbortError") return;
        console.error("Chat error:", e);
      } finally {
        setStreaming(false);
        abortRef.current = null;
      }
    },
    [filepath, streaming]
  );

  const stopStreaming = useCallback(() => {
    abortRef.current?.abort();
    setStreaming(false);
  }, []);

  return { sendMessage, streaming, streamingText, reasoningText, stopStreaming };
}
