"use client";

import { use } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../../components/sidebar";
import ChatView from "../../components/chat-view";

export default function ChatPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const filename = decodeURIComponent(id);

  return (
    <>
      <Sidebar
        activeFilename={filename}
        onSelect={(f) => router.push(`/chat/${encodeURIComponent(f)}`)}
        onNewChat={() => router.push("/")}
      />
      <ChatView filename={filename} />
    </>
  );
}
