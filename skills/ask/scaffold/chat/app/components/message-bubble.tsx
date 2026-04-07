"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  model?: string;
  persona?: string;
  streaming?: boolean;
}

export default function MessageBubble({
  role,
  content,
  model,
  persona,
  streaming,
}: MessageBubbleProps) {
  const isUser = role === "user";

  return (
    <div className={clsx("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={clsx(
          "max-w-[80%] rounded-2xl px-4 py-3",
          isUser
            ? "bg-primary text-primary-foreground"
            : "bg-surface-2 text-text-primary"
        )}
      >
        {!isUser && (model || persona) && (
          <div className="mb-1 text-xs text-text-tertiary">
            {model}
            {persona && ` · ${persona}`}
          </div>
        )}
        <div
          className={clsx(
            "prose prose-sm max-w-none",
            isUser ? "prose-invert" : "dark:prose-invert",
            "[&_pre]:rounded-lg [&_pre]:bg-surface-3 [&_pre]:p-3",
            "[&_code]:rounded [&_code]:bg-surface-3 [&_code]:px-1 [&_code]:py-0.5 [&_code]:text-xs",
            "[&_p]:my-1 [&_ul]:my-1 [&_ol]:my-1"
          )}
        >
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
        </div>
        {streaming && (
          <span className="mt-1 inline-block h-4 w-1 animate-pulse bg-text-tertiary" />
        )}
      </div>
    </div>
  );
}
