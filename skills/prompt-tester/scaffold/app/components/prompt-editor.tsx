"use client";

import { useState, useEffect, useCallback } from "react";
import { Save } from "lucide-react";
import { fetchPromptVersion, updatePrompt } from "@/lib/api";
import type { PromptMeta, PromptVersion } from "@/lib/types";

interface Props {
  prompt: PromptMeta;
  onVersionCreated: (version: PromptVersion) => void;
}

export default function PromptEditor({ prompt, onVersionCreated }: Props) {
  const [activeVersion, setActiveVersion] = useState(prompt.latest_version);
  const [content, setContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(false);

  const isLatest = activeVersion === prompt.latest_version;
  const hasChanges = content !== originalContent;

  const loadVersion = useCallback(
    async (version: number) => {
      try {
        const v = await fetchPromptVersion(prompt.id, version);
        setContent(v.content);
        setOriginalContent(v.content);
        setActiveVersion(version);
        setLoaded(true);
      } catch {
        // API not ready
      }
    },
    [prompt.id]
  );

  useEffect(() => {
    loadVersion(prompt.latest_version);
  }, [prompt.id, prompt.latest_version, loadVersion]);

  async function handleSave() {
    if (!hasChanges || saving) return;
    setSaving(true);
    try {
      const newVersion = await updatePrompt(prompt.id, content);
      setOriginalContent(content);
      setActiveVersion(newVersion.version);
      onVersionCreated(newVersion);
    } catch {
      // handle error
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex h-full flex-col">
      {/* Version tabs */}
      <div className="flex items-center gap-1 border-b border-border-subtle px-3 py-2">
        <div className="flex gap-1 overflow-x-auto">
          {prompt.versions.map((v) => (
            <button
              key={v}
              onClick={() => loadVersion(v)}
              className={`shrink-0 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                v === activeVersion
                  ? "bg-primary text-primary-foreground"
                  : "text-text-tertiary hover:bg-surface-1 hover:text-text-secondary"
              }`}
            >
              v{v}
            </button>
          ))}
        </div>
        <div className="flex-1" />
        {isLatest && hasChanges && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-1 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            <Save className="h-3.5 w-3.5" />
            {saving ? "Saving..." : "Save as new version"}
          </button>
        )}
        {!isLatest && (
          <span className="text-xs text-text-tertiary">Read-only</span>
        )}
      </div>

      {/* Editor */}
      <div className="flex-1 p-3">
        {loaded && (
          <textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            readOnly={!isLatest}
            spellCheck={false}
            className="h-full w-full resize-none rounded-lg border border-border-subtle bg-surface-0 p-4 font-mono text-sm leading-relaxed text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary/30 disabled:opacity-50"
            placeholder="Enter your system prompt..."
          />
        )}
      </div>
    </div>
  );
}
