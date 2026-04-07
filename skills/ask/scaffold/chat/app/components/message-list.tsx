"use client";

import { useRef, useEffect } from "react";
import MessageBubble from "./message-bubble";
import type { ConversationMessage } from "@/app/lib/types";

interface MessageListProps {
  messages: ConversationMessage[];
  streamingText?: string;
  streamingModel?: string;
  reasoningText?: string;
}

export default function MessageList({
  messages,
  streamingText,
  streamingModel,
  reasoningText,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, streamingText]);

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4">
        {messages.length === 0 && !streamingText && (
          <div className="flex flex-col items-center justify-center gap-2 py-20 text-text-tertiary">
            <div className="text-4xl">💬</div>
            <p className="text-sm">Start a conversation</p>
          </div>
        )}

        {messages.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.type === "user" ? "user" : "assistant"}
            content={msg.content}
            model={msg.type === "assistant" ? msg.model : undefined}
            persona={msg.type === "assistant" ? msg.persona : undefined}
          />
        ))}

        {reasoningText && (
          <div className="mx-auto max-w-3xl rounded-lg border border-border bg-surface-1 px-3 py-2 text-xs text-text-tertiary">
            <span className="font-medium">Thinking: </span>
            {reasoningText}
          </div>
        )}

        {streamingText && (
          <MessageBubble
            role="assistant"
            content={streamingText}
            model={streamingModel}
            streaming
          />
        )}

        <div ref={bottomRef} />
      </div>
    </div>
  );
}
