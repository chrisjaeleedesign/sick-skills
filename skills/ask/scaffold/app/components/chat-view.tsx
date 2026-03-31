"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  fetchConversation,
  sendMessage,
  branchConversation,
} from "../lib/api";
import { useStreaming } from "../lib/use-streaming";
import Message from "./message";
import MessageInput from "./message-input";
import type { Conversation, Message as MessageType } from "../lib/types";
import { useRouter } from "next/navigation";

interface ChatViewProps {
  filename: string;
}

export default function ChatView({ filename }: ChatViewProps) {
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const streaming = useStreaming();
  const router = useRouter();
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const loadConversation = useCallback(() => {
    fetchConversation(filename)
      .then(setConversation)
      .catch((err) => setError(err.message));
  }, [filename]);

  // Initial load
  useEffect(() => {
    setError(null);
    streaming.reset();
    loadConversation();
  }, [filename]); // eslint-disable-line react-hooks/exhaustive-deps

  // Poll for updates (from CLI / other sources)
  useEffect(() => {
    pollRef.current = setInterval(() => {
      if (streaming.isDone || !streaming.text) {
        loadConversation();
      }
    }, 2000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [loadConversation, streaming.isDone, streaming.text]);

  // Auto-scroll
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation?.messages, streaming.text]);

  const handleSend = useCallback(
    async (opts: {
      content: string;
      model?: string;
      persona?: string;
      thinking?: string;
    }) => {
      try {
        // Optimistically add user message to the UI immediately
        const nextExchange = (conversation?.messages.at(-1)?.exchange ?? 0) + 1;
        const optimisticMsg: MessageType = {
          type: "user",
          exchange: nextExchange,
          sender: "user",
          content: opts.content,
        };
        setConversation((prev) =>
          prev
            ? { ...prev, messages: [...prev.messages, optimisticMsg] }
            : prev
        );

        streaming.reset();
        const response = await sendMessage(filename, opts);
        streaming.startStream(response);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send");
      }
    },
    [filename, streaming, conversation?.messages]
  );

  // When streaming finishes, reload conversation to get the persisted version
  useEffect(() => {
    if (streaming.isDone && streaming.text) {
      const timer = setTimeout(() => {
        loadConversation();
        streaming.reset();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [streaming.isDone]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleBranch = useCallback(
    async (exchange: number) => {
      try {
        const result = await branchConversation(filename, exchange);
        router.push(`/chat/${encodeURIComponent(result.filename)}`);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Branch failed");
      }
    },
    [filename, router]
  );

  if (error && !conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <p className="text-text-muted text-sm">{error}</p>
          <button
            onClick={loadConversation}
            className="mt-3 text-xs text-accent hover:text-accent-hover transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!conversation) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const isStreaming = !streaming.isDone && streaming.text.length > 0;

  // Build a streaming message to display while receiving
  const streamingMessage: MessageType | null = isStreaming
    ? {
        type: "assistant",
        exchange: (conversation.messages.at(-1)?.exchange ?? 0) + 1,
        sender: "assistant",
        content: streaming.text,
      }
    : null;

  return (
    <div className="flex-1 flex flex-col min-w-0">
      {/* Header */}
      <div className="h-12 border-b border-border bg-surface-1 flex items-center px-4 flex-shrink-0">
        <h1 className="text-sm font-medium text-text-primary truncate">
          {conversation.meta.title || conversation.meta.id}
        </h1>
        {conversation.meta.flow && (
          <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-text-muted">
            {conversation.meta.flow}
          </span>
        )}
        <span className="ml-auto text-[11px] text-text-muted">
          {conversation.meta.exchanges} exchange
          {conversation.meta.exchanges !== 1 ? "s" : ""}
        </span>
      </div>

      {/* Messages */}
      <div ref={containerRef} className="flex-1 overflow-y-auto">
        <div className="max-w-3xl mx-auto py-6">
          {conversation.messages.length === 0 && !streamingMessage && (
            <div className="text-center py-20">
              <p className="text-text-muted text-sm">
                Start a conversation...
              </p>
            </div>
          )}
          {conversation.messages.map((msg, i) => (
            <Message key={i} message={msg} onBranch={handleBranch} />
          ))}
          {streamingMessage && (
            <Message message={streamingMessage} isStreaming />
          )}
          {streaming.error && (
            <div className="px-4 py-2 text-xs text-danger">
              Error: {streaming.error}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Input */}
      <div className="max-w-3xl mx-auto w-full">
        <MessageInput onSend={handleSend} disabled={isStreaming} />
      </div>
    </div>
  );
}
