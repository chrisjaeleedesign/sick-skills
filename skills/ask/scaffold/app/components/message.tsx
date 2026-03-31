"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { GitBranch, Bot, User } from "lucide-react";
import type { Message as MessageType } from "../lib/types";

interface MessageProps {
  message: MessageType;
  onBranch?: (exchange: number) => void;
  isStreaming?: boolean;
}

export default function Message({
  message,
  onBranch,
  isStreaming = false,
}: MessageProps) {
  const [hovered, setHovered] = useState(false);
  const isUser = message.type === "user";

  return (
    <div
      className={`group flex gap-3 px-4 py-3 ${isUser ? "flex-row-reverse" : "flex-row"}`}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* Avatar */}
      <div
        className={`flex-shrink-0 w-7 h-7 rounded-full flex items-center justify-center mt-0.5 ${
          isUser ? "bg-accent/20 text-accent" : "bg-surface-3 text-text-muted"
        }`}
      >
        {isUser ? <User size={14} /> : <Bot size={14} />}
      </div>

      {/* Content */}
      <div className={`flex flex-col max-w-[75%] ${isUser ? "items-end" : "items-start"}`}>
        {/* Sender label + badges */}
        <div className={`flex items-center gap-2 mb-1 ${isUser ? "flex-row-reverse" : "flex-row"}`}>
          <span className="text-[11px] font-medium text-text-muted">
            {isUser ? "You" : message.sender}
          </span>
          {message.model && !isUser && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-badge-model text-badge-model-text">
              {message.model}
            </span>
          )}
          {message.persona && (
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-badge-persona text-badge-persona-text">
              {message.persona}
            </span>
          )}
        </div>

        {/* Bubble */}
        <div
          className={`rounded-2xl px-4 py-2.5 ${
            isUser
              ? "bg-user-bubble text-user-bubble-text rounded-tr-md"
              : "bg-assistant-bubble text-assistant-bubble-text rounded-tl-md border border-border-subtle"
          }`}
        >
          <div className={`markdown-body ${isStreaming ? "streaming-cursor" : ""}`}>
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* Attachments */}
        {message.attachments && message.attachments.length > 0 && (
          <div className="flex gap-2 mt-2 flex-wrap">
            {message.attachments.map((att, i) =>
              att.mime.startsWith("image/") ? (
                <img
                  key={i}
                  src={`/api/files?path=${encodeURIComponent(att.path)}`}
                  alt={att.path}
                  className="max-w-[200px] max-h-[150px] rounded-lg border border-border object-cover"
                />
              ) : (
                <div
                  key={i}
                  className="text-xs bg-surface-3 px-2 py-1 rounded border border-border text-text-muted"
                >
                  {att.path.split("/").pop()}
                </div>
              )
            )}
          </div>
        )}

        {/* Branch action on hover */}
        {hovered && onBranch && !isStreaming && (
          <button
            onClick={() => onBranch(message.exchange)}
            className="mt-1 flex items-center gap-1 text-[11px] text-text-muted
                       hover:text-accent transition-colors"
            title="Branch from here"
          >
            <GitBranch size={11} />
            Branch
          </button>
        )}
      </div>
    </div>
  );
}
