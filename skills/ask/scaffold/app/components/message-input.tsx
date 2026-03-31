"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { Send, Brain, ChevronUp, ChevronDown } from "lucide-react";
import ModelPicker from "./model-picker";
import { fetchConfig, fetchPersonas } from "../lib/api";
import type { ModelConfig, PersonaInfo } from "../lib/types";

interface MessageInputProps {
  onSend: (opts: {
    content: string;
    model?: string;
    persona?: string;
    thinking?: string;
  }) => void;
  disabled?: boolean;
}

const THINKING_LEVELS = [
  { value: "", label: "Off" },
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
];

export default function MessageInput({
  onSend,
  disabled = false,
}: MessageInputProps) {
  const [content, setContent] = useState("");
  const [model, setModel] = useState("");
  const [persona, setPersona] = useState("");
  const [thinking, setThinking] = useState("");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [config, setConfig] = useState<ModelConfig | null>(null);
  const [personas, setPersonas] = useState<PersonaInfo[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    fetchConfig()
      .then((c) => {
        setConfig(c);
        setModel(c.default_model);
      })
      .catch(() => {});
    fetchPersonas()
      .then(setPersonas)
      .catch(() => {});
  }, []);

  const resize = useCallback(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 200) + "px";
  }, []);

  useEffect(() => {
    resize();
  }, [content, resize]);

  const handleSend = useCallback(() => {
    const trimmed = content.trim();
    if (!trimmed || disabled) return;
    onSend({
      content: trimmed,
      model: model || undefined,
      persona: persona || undefined,
      thinking: thinking || undefined,
    });
    setContent("");
    setTimeout(() => {
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    }, 0);
  }, [content, model, persona, thinking, disabled, onSend]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const modelOptions = config
    ? [
        { value: config.default_model, label: config.default_model },
        ...Object.entries(config.aliases)
          .filter(([, v]) => v !== config.default_model)
          .map(([k, v]) => ({ value: v, label: `${k} (${v})` })),
      ]
    : [];

  const personaOptions = [
    { value: "", label: "None" },
    ...personas.map((p) => ({ value: p.name, label: p.name })),
  ];

  return (
    <div className="border-t border-border bg-surface-1 px-4 py-3">
      {/* Textarea */}
      <div className="relative flex items-end gap-2">
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Send a message..."
          disabled={disabled}
          rows={1}
          className="flex-1 bg-surface-2 border border-border rounded-xl px-4 py-3
                     text-sm text-text-primary placeholder:text-text-muted resize-none
                     focus:outline-none focus:border-accent/50 transition-colors
                     disabled:opacity-50"
        />
        <button
          onClick={handleSend}
          disabled={disabled || !content.trim()}
          className="flex-shrink-0 w-10 h-10 rounded-xl bg-accent hover:bg-accent-hover
                     disabled:opacity-30 disabled:hover:bg-accent
                     flex items-center justify-center transition-colors"
        >
          <Send size={16} className="text-white" />
        </button>
      </div>

      {/* Controls row */}
      <div className="flex items-center gap-3 mt-2 ml-1">
        {config && (
          <ModelPicker
            label="Model"
            value={model}
            options={modelOptions}
            onChange={setModel}
          />
        )}

        {personas.length > 0 && (
          <ModelPicker
            label="Persona"
            value={persona}
            options={personaOptions}
            onChange={setPersona}
          />
        )}

        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-1 text-[11px] text-text-muted
                     hover:text-text-secondary transition-colors"
        >
          <Brain size={12} />
          Thinking
          {showAdvanced ? <ChevronUp size={10} /> : <ChevronDown size={10} />}
        </button>

        {showAdvanced && (
          <ModelPicker
            label=""
            value={thinking}
            options={THINKING_LEVELS}
            onChange={setThinking}
          />
        )}
      </div>
    </div>
  );
}
