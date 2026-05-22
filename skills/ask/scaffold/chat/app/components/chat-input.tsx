"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { Send, Square, Paperclip, X } from "lucide-react";
import ModelPicker from "./model-picker";

interface Attachment {
  data: string;
  mime: string;
  name: string;
}

interface ChatInputProps {
  models: { alias: string; provider: string; modelId: string }[];
  selectedModel: string;
  onModelChange: (alias: string) => void;
  onSend: (content: string, attachments?: Attachment[]) => void;
  onStop?: () => void;
  streaming?: boolean;
  disabled?: boolean;
}

export default function ChatInput({
  models,
  selectedModel,
  onModelChange,
  onSend,
  onStop,
  streaming,
  disabled,
}: ChatInputProps) {
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleSend = useCallback(() => {
    const trimmed = input.trim();
    if ((!trimmed && attachments.length === 0) || streaming || disabled) return;
    onSend(trimmed, attachments.length > 0 ? attachments : undefined);
    setInput("");
    setAttachments([]);
  }, [input, attachments, streaming, disabled, onSend]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        handleSend();
      }
    },
    [handleSend]
  );

  const addFiles = useCallback((files: FileList | File[]) => {
    const fileArray = Array.from(files);
    for (const file of fileArray) {
      if (!file.type.startsWith("image/")) continue;
      const reader = new FileReader();
      reader.onload = () => {
        const data = reader.result as string;
        setAttachments((prev) => [
          ...prev,
          { data, mime: file.type, name: file.name },
        ]);
      };
      reader.readAsDataURL(file);
    }
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files) addFiles(e.target.files);
      e.target.value = "";
    },
    [addFiles]
  );

  const handlePaste = useCallback(
    (e: React.ClipboardEvent) => {
      const items = e.clipboardData.items;
      const imageFiles: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) imageFiles.push(file);
        }
      }
      if (imageFiles.length > 0) {
        e.preventDefault();
        addFiles(imageFiles);
      }
    },
    [addFiles]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      if (e.dataTransfer.files) addFiles(e.dataTransfer.files);
    },
    [addFiles]
  );

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
  }, []);

  const removeAttachment = useCallback((index: number) => {
    setAttachments((prev) => prev.filter((_, i) => i !== index));
  }, []);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${Math.min(ta.scrollHeight, 200)}px`;
  }, [input]);

  // Focus on mount
  useEffect(() => {
    textareaRef.current?.focus();
  }, []);

  return (
    <div className="border-t border-border bg-surface-0 px-4 py-3">
      <div className="mx-auto flex max-w-3xl flex-col gap-2">
        {/* Attachment previews */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {attachments.map((att, i) => (
              <div key={i} className="group relative">
                <img
                  src={att.data}
                  alt={att.name}
                  className="h-16 w-16 rounded-lg object-cover border border-border"
                />
                <button
                  onClick={() => removeAttachment(i)}
                  className="absolute -right-1 -top-1 flex h-5 w-5 items-center justify-center rounded-full bg-destructive text-destructive-foreground text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-end gap-2">
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            placeholder="Send a message... (paste or drop images)"
            rows={1}
            className="flex-1 resize-none rounded-xl border border-border bg-surface-1 px-4 py-3 text-sm text-text-primary placeholder:text-text-tertiary outline-none transition-colors focus:ring-2 focus:ring-ring"
            disabled={disabled}
          />

          {/* Attach button */}
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-border text-text-secondary transition-colors hover:bg-surface-2"
            title="Attach image"
            disabled={streaming || disabled}
          >
            <Paperclip className="h-4 w-4" />
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFileChange}
          />

          {streaming ? (
            <button
              onClick={onStop}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-destructive text-destructive-foreground transition-colors hover:opacity-90"
              title="Stop"
            >
              <Square className="h-4 w-4" />
            </button>
          ) : (
            <button
              onClick={handleSend}
              disabled={(!input.trim() && attachments.length === 0) || disabled}
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground transition-colors hover:opacity-90 disabled:opacity-40"
              title="Send"
            >
              <Send className="h-4 w-4" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-2">
          <ModelPicker
            models={models}
            selected={selectedModel}
            onChange={onModelChange}
          />
        </div>
      </div>
    </div>
  );
}
