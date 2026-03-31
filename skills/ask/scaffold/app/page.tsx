"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "./components/sidebar";
import NewChat from "./components/new-chat";
import ChatView from "./components/chat-view";
import { fetchConversations } from "./lib/api";

export default function Home() {
  const router = useRouter();
  const [activeFile, setActiveFile] = useState<string | null>(null);
  const [showNewChat, setShowNewChat] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchConversations()
      .then((convos) => {
        if (convos.length > 0) {
          const sorted = convos.sort(
            (a, b) =>
              new Date(b.updated).getTime() - new Date(a.updated).getTime()
          );
          setActiveFile(sorted[0].filename);
        } else {
          setShowNewChat(true);
        }
      })
      .catch(() => {
        setShowNewChat(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSelect = useCallback((filename: string) => {
    setActiveFile(filename);
    setShowNewChat(false);
  }, []);

  const handleNewChat = useCallback(() => {
    setShowNewChat(true);
    setActiveFile(null);
  }, []);

  const handleCreated = useCallback((filename: string) => {
    setShowNewChat(false);
    setActiveFile(filename);
  }, []);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <>
      <Sidebar
        activeFilename={activeFile ?? undefined}
        onSelect={handleSelect}
        onNewChat={handleNewChat}
      />
      {showNewChat ? (
        <NewChat
          onCreated={handleCreated}
          onCancel={() => {
            if (activeFile) {
              setShowNewChat(false);
            }
          }}
        />
      ) : activeFile ? (
        <ChatView filename={activeFile} />
      ) : (
        <div className="flex-1 flex items-center justify-center text-text-muted text-sm">
          Select a conversation or start a new one
        </div>
      )}
    </>
  );
}
