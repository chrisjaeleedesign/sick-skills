"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import clsx from "clsx";

interface MessageBubbleProps {
  role: "user" | "assistant";
  content: string;
  model?: string;
  persona?: string;
  streaming?: boolean;
  images?: string[];
  attachments?: string[];
}

export default function MessageBubble({
  role,
  content,
  model,
  persona,
  streaming,
  images,
  attachments,
}: MessageBubbleProps) {
  const isUser = role === "user";
  const [expandedImage, setExpandedImage] = useState<string | null>(null);

  return (
    <>
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

          {/* User attachment previews */}
          {isUser && attachments && attachments.length > 0 && (
            <div className="mb-2 flex flex-wrap gap-2">
              {attachments.map((src, i) => (
                <img
                  key={i}
                  src={src}
                  alt={`Attachment ${i + 1}`}
                  className="h-20 w-20 rounded-lg object-cover border border-white/20"
                />
              ))}
            </div>
          )}

          {content && (
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
          )}

          {/* Generated images */}
          {images && images.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {images.map((src, i) => (
                <button
                  key={i}
                  onClick={() => setExpandedImage(src)}
                  className="overflow-hidden rounded-xl border border-border transition-transform hover:scale-[1.02]"
                >
                  <img
                    src={src}
                    alt={`Generated image ${i + 1}`}
                    className="max-h-80 max-w-full object-contain"
                  />
                </button>
              ))}
            </div>
          )}

          {streaming && (
            <span className="mt-1 inline-block h-4 w-1 animate-pulse bg-text-tertiary" />
          )}
        </div>
      </div>

      {/* Lightbox */}
      {expandedImage && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setExpandedImage(null)}
        >
          <img
            src={expandedImage}
            alt="Expanded view"
            className="max-h-[90vh] max-w-[90vw] rounded-lg object-contain"
          />
        </div>
      )}
    </>
  );
}
