"use client";

import { useState, useEffect, useCallback } from "react";
import { Plus, MessageSquare, Hash } from "lucide-react";
import { fetchConversations } from "../lib/api";
import type { ConversationMeta } from "../lib/types";

interface SidebarProps {
  activeFilename?: string;
  onSelect: (filename: string) => void;
  onNewChat: () => void;
}

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const seconds = Math.floor((now - then) / 1000);

  if (seconds < 60) return "now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

export default function Sidebar({
  activeFilename,
  onSelect,
  onNewChat,
}: SidebarProps) {
  const [conversations, setConversations] = useState<
    Array<ConversationMeta & { filename: string }>
  >([]);

  const load = useCallback(() => {
    fetchConversations()
      .then((data) => {
        const sorted = data.sort(
          (a, b) =>
            new Date(b.updated).getTime() - new Date(a.updated).getTime()
        );
        setConversations(sorted);
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, [load]);

  return (
    <aside className="w-64 flex-shrink-0 bg-surface-1 border-r border-border flex flex-col h-full">
      {/* Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary tracking-tight">
          Ask
        </span>
        <button
          onClick={onNewChat}
          className="w-7 h-7 rounded-lg bg-surface-2 hover:bg-surface-3 border border-border
                     flex items-center justify-center transition-colors"
          title="New chat"
        >
          <Plus size={14} className="text-text-secondary" />
        </button>
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto py-1">
        {conversations.length === 0 && (
          <div className="px-3 py-8 text-center text-xs text-text-muted">
            No conversations yet
          </div>
        )}
        {conversations.map((conv) => {
          const isActive = conv.filename === activeFilename;
          return (
            <button
              key={conv.filename}
              onClick={() => onSelect(conv.filename)}
              className={`w-full text-left px-3 py-2.5 transition-colors ${
                isActive
                  ? "bg-accent/10 border-r-2 border-accent"
                  : "hover:bg-surface-2"
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-1.5 min-w-0">
                  <MessageSquare
                    size={12}
                    className={`flex-shrink-0 ${isActive ? "text-accent" : "text-text-muted"}`}
                  />
                  <span
                    className={`text-sm truncate ${
                      isActive ? "text-text-primary font-medium" : "text-text-secondary"
                    }`}
                  >
                    {conv.title || conv.id}
                  </span>
                </div>
                <span className="text-[10px] text-text-muted flex-shrink-0 mt-0.5">
                  {timeAgo(conv.updated)}
                </span>
              </div>
              <div className="flex items-center gap-2 mt-1 ml-5">
                <span className="text-[10px] text-text-muted">
                  {conv.exchanges} msg{conv.exchanges !== 1 ? "s" : ""}
                </span>
                {conv.tags.length > 0 && (
                  <div className="flex items-center gap-1">
                    {conv.tags.slice(0, 2).map((tag) => (
                      <span
                        key={tag}
                        className="inline-flex items-center gap-0.5 text-[9px] px-1.5 py-0.5
                                   rounded bg-badge-tag text-badge-tag-text"
                      >
                        <Hash size={8} />
                        {tag}
                      </span>
                    ))}
                    {conv.tags.length > 2 && (
                      <span className="text-[9px] text-text-muted">
                        +{conv.tags.length - 2}
                      </span>
                    )}
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </aside>
  );
}
