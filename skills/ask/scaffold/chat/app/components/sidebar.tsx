"use client";

import { useState } from "react";
import { Plus, MessageSquare, FolderOpen, Trash2, ChevronRight } from "lucide-react";
import clsx from "clsx";
import type { ConversationListItem } from "@/app/lib/types";

interface SidebarProps {
  projects: { id: string; name: string; conversationCount: number }[];
  conversations: ConversationListItem[];
  activeProject: string | null;
  activeConversation: string | null;
  onSelectProject: (project: string | null) => void;
  onSelectConversation: (filepath: string) => void;
  onNewConversation: () => void;
  onDeleteConversation: (filepath: string) => void;
}

export default function Sidebar({
  projects,
  conversations,
  activeProject,
  activeConversation,
  onSelectProject,
  onSelectConversation,
  onNewConversation,
  onDeleteConversation,
}: SidebarProps) {
  const [hoveredConv, setHoveredConv] = useState<string | null>(null);

  // Group conversations by project
  const grouped = new Map<string, ConversationListItem[]>();
  for (const c of conversations) {
    const proj = c.project ?? "default";
    if (!grouped.has(proj)) grouped.set(proj, []);
    grouped.get(proj)!.push(c);
  }

  const projectList = activeProject
    ? [activeProject]
    : [...grouped.keys()].sort();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-sidebar-border bg-sidebar">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-3">
        <span className="text-sm font-semibold text-sidebar-primary">Chats</span>
        <button
          onClick={onNewConversation}
          className="flex h-7 w-7 items-center justify-center rounded-md transition-colors hover:bg-sidebar-accent"
          title="New conversation"
        >
          <Plus className="h-4 w-4 text-sidebar-foreground" />
        </button>
      </div>

      {/* Project filter */}
      <div className="flex flex-wrap gap-1 border-b border-sidebar-border px-3 py-2">
        <button
          onClick={() => onSelectProject(null)}
          className={clsx(
            "rounded-md px-2 py-0.5 text-xs transition-colors",
            !activeProject
              ? "bg-sidebar-accent text-sidebar-accent-foreground"
              : "text-sidebar-foreground hover:bg-sidebar-accent"
          )}
        >
          All
        </button>
        {projects.map((p) => (
          <button
            key={p.id}
            onClick={() => onSelectProject(p.id === activeProject ? null : p.id)}
            className={clsx(
              "rounded-md px-2 py-0.5 text-xs transition-colors",
              p.id === activeProject
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground hover:bg-sidebar-accent"
            )}
          >
            {p.name}
            <span className="ml-1 text-text-tertiary">{p.conversationCount}</span>
          </button>
        ))}
      </div>

      {/* Conversation list */}
      <div className="flex-1 overflow-y-auto px-2 py-2">
        {projectList.map((proj) => {
          const items = grouped.get(proj) ?? [];
          if (!items.length) return null;

          return (
            <div key={proj} className="mb-3">
              {!activeProject && projectList.length > 1 && (
                <div className="flex items-center gap-1 px-2 py-1">
                  <FolderOpen className="h-3 w-3 text-text-tertiary" />
                  <span className="text-xs font-medium text-text-tertiary uppercase tracking-wider">
                    {proj}
                  </span>
                </div>
              )}
              {items.map((conv) => (
                <div
                  key={conv.filepath}
                  className={clsx(
                    "group relative flex items-center gap-2 rounded-lg px-2 py-2 cursor-pointer transition-colors",
                    conv.filepath === activeConversation
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent"
                  )}
                  onClick={() => onSelectConversation(conv.filepath)}
                  onMouseEnter={() => setHoveredConv(conv.filepath)}
                  onMouseLeave={() => setHoveredConv(null)}
                >
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 text-text-tertiary" />
                  <span className="flex-1 truncate text-sm">
                    {conv.title ?? conv.id}
                  </span>
                  {hoveredConv === conv.filepath && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onDeleteConversation(conv.filepath);
                      }}
                      className="flex h-5 w-5 items-center justify-center rounded text-text-tertiary hover:text-destructive"
                    >
                      <Trash2 className="h-3 w-3" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          );
        })}

        {conversations.length === 0 && (
          <div className="px-2 py-8 text-center text-xs text-text-tertiary">
            No conversations yet.
            <br />
            Click + to start one.
          </div>
        )}
      </div>
    </aside>
  );
}
