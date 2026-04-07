"use client";

import "./globals.css";
import { useState, useEffect, useCallback } from "react";
import { Moon, Sun } from "lucide-react";
import Sidebar from "./components/sidebar";
import { useModels, useConversations, useConversation, useChat } from "./lib/hooks";
import MessageList from "./components/message-list";
import ChatInput from "./components/chat-input";

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [dark, setDark] = useState(false);
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<string | null>(null);
  const [selectedModel, setSelectedModel] = useState("gpt5");

  const { models, defaultModel } = useModels();
  const { conversations, projects, fetchConversations, createConversation, deleteConversation } =
    useConversations(activeProject ?? undefined);
  const { meta, messages, refetch, setMessages } = useConversation(activeConversation);
  const { sendMessage, streaming, streamingText, reasoningText, stopStreaming } =
    useChat(activeConversation);

  // Dark mode from system preference
  useEffect(() => {
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      setDark(true);
    }
  }, []);

  // Set default model once loaded
  useEffect(() => {
    if (defaultModel) setSelectedModel(defaultModel);
  }, [defaultModel]);

  const handleNewConversation = useCallback(async () => {
    const result = await createConversation({
      title: "New conversation",
      project: activeProject ?? "default",
    });
    if (result) {
      setActiveConversation(result.filepath);
    }
  }, [createConversation, activeProject]);

  const handleSend = useCallback(
    (content: string) => {
      // Optimistically add user message to the list
      setMessages((prev) => [
        ...prev,
        {
          type: "user" as const,
          sender: "user",
          content,
          exchange: (meta?.exchanges ?? 0) + 1,
        },
      ]);

      sendMessage({
        content,
        model: selectedModel,
        onDone: () => {
          // Refetch to get the saved exchange
          refetch();
          fetchConversations();
        },
      });
    },
    [sendMessage, selectedModel, meta, setMessages, refetch, fetchConversations]
  );

  const handleDeleteConversation = useCallback(
    async (filepath: string) => {
      await deleteConversation(filepath);
      if (activeConversation === filepath) {
        setActiveConversation(null);
      }
    },
    [deleteConversation, activeConversation]
  );

  return (
    <html lang="en" className={dark ? "dark" : ""}>
      <body className="flex h-screen bg-background text-foreground antialiased">
        <Sidebar
          projects={projects}
          conversations={conversations}
          activeProject={activeProject}
          activeConversation={activeConversation}
          onSelectProject={setActiveProject}
          onSelectConversation={setActiveConversation}
          onNewConversation={handleNewConversation}
          onDeleteConversation={handleDeleteConversation}
        />

        <main className="flex flex-1 flex-col">
          {/* Top bar */}
          <header className="flex items-center justify-between border-b border-border bg-surface-0 px-4 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-text-primary">
                {meta?.title ?? "ask-ui"}
              </span>
              {meta && (
                <span className="text-xs text-text-tertiary">
                  · {meta.exchanges} exchanges
                </span>
              )}
            </div>
            <button
              onClick={() => setDark(!dark)}
              className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-surface-2 transition-colors"
              aria-label="Toggle theme"
            >
              {dark ? (
                <Sun className="h-4 w-4 text-text-secondary" />
              ) : (
                <Moon className="h-4 w-4 text-text-secondary" />
              )}
            </button>
          </header>

          {/* Chat area */}
          {activeConversation ? (
            <>
              <MessageList
                messages={messages}
                streamingText={streaming ? streamingText : undefined}
                streamingModel={selectedModel}
                reasoningText={streaming ? reasoningText : undefined}
              />
              <ChatInput
                models={models}
                selectedModel={selectedModel}
                onModelChange={setSelectedModel}
                onSend={handleSend}
                onStop={stopStreaming}
                streaming={streaming}
              />
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-text-tertiary">
              <div className="text-6xl">🗨️</div>
              <p className="text-lg">Select or create a conversation</p>
              <button
                onClick={handleNewConversation}
                className="rounded-lg bg-primary px-4 py-2 text-sm text-primary-foreground transition-colors hover:opacity-90"
              >
                New conversation
              </button>
            </div>
          )}
        </main>
      </body>
    </html>
  );
}
