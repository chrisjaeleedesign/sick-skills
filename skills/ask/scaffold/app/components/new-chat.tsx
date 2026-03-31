"use client";

import { useState, useEffect } from "react";
import { Plus, Zap, X } from "lucide-react";
import { createConversation, fetchFlows } from "../lib/api";
import type { FlowInfo } from "../lib/types";

interface NewChatProps {
  onCreated: (filename: string) => void;
  onCancel: () => void;
}

export default function NewChat({ onCreated, onCancel }: NewChatProps) {
  const [title, setTitle] = useState("");
  const [tagsInput, setTagsInput] = useState("");
  const [flow, setFlow] = useState("");
  const [flows, setFlows] = useState<FlowInfo[]>([]);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchFlows()
      .then(setFlows)
      .catch(() => {});
  }, []);

  const handleCreate = async () => {
    setCreating(true);
    setError(null);
    try {
      const tags = tagsInput
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean);
      const result = await createConversation({
        title: title || undefined,
        tags: tags.length > 0 ? tags : undefined,
        flow: flow || undefined,
      });
      onCreated(result.filename);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create");
      setCreating(false);
    }
  };

  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="w-full max-w-md">
        <div className="bg-surface-1 border border-border rounded-2xl p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-semibold text-text-primary">
              New Conversation
            </h2>
            <button
              onClick={onCancel}
              className="w-7 h-7 rounded-lg hover:bg-surface-3 flex items-center justify-center
                         transition-colors text-text-muted hover:text-text-secondary"
            >
              <X size={14} />
            </button>
          </div>

          <div className="space-y-4">
            {/* Title */}
            <div>
              <label className="block text-xs text-text-muted mb-1.5">
                Title (optional)
              </label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="What's this about?"
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2
                           text-sm text-text-primary placeholder:text-text-muted
                           focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            {/* Tags */}
            <div>
              <label className="block text-xs text-text-muted mb-1.5">
                Tags (comma separated)
              </label>
              <input
                type="text"
                value={tagsInput}
                onChange={(e) => setTagsInput(e.target.value)}
                placeholder="research, coding, ..."
                className="w-full bg-surface-2 border border-border rounded-lg px-3 py-2
                           text-sm text-text-primary placeholder:text-text-muted
                           focus:outline-none focus:border-accent/50 transition-colors"
              />
            </div>

            {/* Flow picker */}
            {flows.length > 0 && (
              <div>
                <label className="block text-xs text-text-muted mb-1.5">
                  Flow (optional)
                </label>
                <div className="flex gap-2 flex-wrap">
                  <button
                    onClick={() => setFlow("")}
                    className={`text-xs px-3 py-1.5 rounded-lg border transition-colors ${
                      !flow
                        ? "bg-accent/15 border-accent/30 text-accent"
                        : "bg-surface-2 border-border text-text-muted hover:text-text-secondary"
                    }`}
                  >
                    None
                  </button>
                  {flows.map((f) => (
                    <button
                      key={f.name}
                      onClick={() => setFlow(f.name)}
                      className={`text-xs px-3 py-1.5 rounded-lg border transition-colors flex items-center gap-1 ${
                        flow === f.name
                          ? "bg-accent/15 border-accent/30 text-accent"
                          : "bg-surface-2 border-border text-text-muted hover:text-text-secondary"
                      }`}
                    >
                      <Zap size={10} />
                      {f.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-danger">{error}</p>
            )}

            {/* Actions */}
            <div className="flex gap-2 pt-2">
              <button
                onClick={onCancel}
                className="flex-1 px-4 py-2.5 rounded-xl bg-surface-2 border border-border
                           text-sm text-text-secondary hover:bg-surface-3 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating}
                className="flex-1 px-4 py-2.5 rounded-xl bg-accent hover:bg-accent-hover
                           text-sm text-white font-medium transition-colors
                           disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Plus size={14} />
                {creating ? "Creating..." : "Start"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
