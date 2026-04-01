"use client";

import { useEffect, useState, use } from "react";
import { useRouter } from "next/navigation";
import { Pencil, Check, X, Loader2 } from "lucide-react";
import Sidebar from "@/components/sidebar";
import PromptEditor from "@/components/prompt-editor";
import ScenarioLibrary from "@/components/scenario-library";
import RunControls from "@/components/run-controls";
import RunHistory from "@/components/run-history";
import { fetchPrompt } from "@/lib/api";
import type { PromptMeta, PromptVersion } from "@/lib/types";

type RightTab = "scenarios" | "run" | "history";

export default function PromptWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();
  const [prompt, setPrompt] = useState<PromptMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<RightTab>("scenarios");
  const [selectedScenarioIds, setSelectedScenarioIds] = useState<Set<string>>(
    new Set()
  );
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState("");
  const [editingDesc, setEditingDesc] = useState(false);
  const [descDraft, setDescDraft] = useState("");

  useEffect(() => {
    setLoading(true);
    fetchPrompt(id)
      .then((p) => {
        setPrompt(p);
        setTitleDraft(p.title);
        setDescDraft(p.description);
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [id, router]);

  function handleVersionCreated(v: PromptVersion) {
    if (!prompt) return;
    setPrompt({
      ...prompt,
      versions: [...prompt.versions, v.version],
      latest_version: v.version,
      updated: v.created,
    });
  }

  if (loading || !prompt) {
    return (
      <div className="flex h-screen">
        <Sidebar />
        <div className="flex flex-1 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
        </div>
      </div>
    );
  }

  const tabs: { key: RightTab; label: string }[] = [
    { key: "scenarios", label: "Scenarios" },
    { key: "run", label: "Run" },
    { key: "history", label: "History" },
  ];

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Top bar: title + description */}
        <div className="border-b border-border-subtle px-6 py-3">
          {/* Title */}
          <div className="flex items-center gap-2">
            {editingTitle ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={titleDraft}
                  onChange={(e) => setTitleDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPrompt({ ...prompt, title: titleDraft });
                      setEditingTitle(false);
                    }
                    if (e.key === "Escape") setEditingTitle(false);
                  }}
                  className="rounded-md border border-primary bg-transparent px-2 py-0.5 text-lg font-semibold text-text-primary focus:outline-none"
                />
                <button
                  onClick={() => {
                    setPrompt({ ...prompt, title: titleDraft });
                    setEditingTitle(false);
                  }}
                  className="text-accent-green"
                >
                  <Check className="h-4 w-4" />
                </button>
                <button
                  onClick={() => setEditingTitle(false)}
                  className="text-text-tertiary"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <h1
                onClick={() => setEditingTitle(true)}
                className="group flex cursor-pointer items-center gap-1.5 text-lg font-semibold text-text-primary"
              >
                {prompt.title}
                <Pencil className="h-3.5 w-3.5 text-text-tertiary opacity-0 transition-opacity group-hover:opacity-100" />
              </h1>
            )}
          </div>
          {/* Description */}
          <div className="mt-0.5">
            {editingDesc ? (
              <div className="flex items-center gap-1.5">
                <input
                  autoFocus
                  value={descDraft}
                  onChange={(e) => setDescDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      setPrompt({ ...prompt, description: descDraft });
                      setEditingDesc(false);
                    }
                    if (e.key === "Escape") setEditingDesc(false);
                  }}
                  placeholder="Add a description..."
                  className="flex-1 rounded-md border border-primary bg-transparent px-2 py-0.5 text-sm text-text-secondary focus:outline-none"
                />
                <button
                  onClick={() => {
                    setPrompt({ ...prompt, description: descDraft });
                    setEditingDesc(false);
                  }}
                  className="text-accent-green"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setEditingDesc(false)}
                  className="text-text-tertiary"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <p
                onClick={() => setEditingDesc(true)}
                className="group flex cursor-pointer items-center gap-1 text-sm text-text-tertiary"
              >
                {prompt.description || "Add a description..."}
                <Pencil className="h-3 w-3 opacity-0 transition-opacity group-hover:opacity-100" />
              </p>
            )}
          </div>
        </div>

        {/* Main content: two panels */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left: Prompt editor */}
          <div className="w-1/2 border-r border-border-subtle">
            <PromptEditor
              prompt={prompt}
              onVersionCreated={handleVersionCreated}
            />
          </div>

          {/* Right: Tabs */}
          <div className="flex w-1/2 flex-col">
            {/* Tab bar */}
            <div className="flex border-b border-border-subtle">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`px-4 py-2.5 text-sm font-medium transition-colors ${
                    activeTab === tab.key
                      ? "border-b-2 border-primary text-text-primary"
                      : "text-text-tertiary hover:text-text-secondary"
                  }`}
                >
                  {tab.label}
                  {tab.key === "scenarios" && selectedScenarioIds.size > 0 && (
                    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] text-primary-foreground">
                      {selectedScenarioIds.size}
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Tab content */}
            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "scenarios" && (
                <ScenarioLibrary
                  selectedIds={selectedScenarioIds}
                  onSelectionChange={setSelectedScenarioIds}
                />
              )}
              {activeTab === "run" && (
                <RunControls
                  prompt={prompt}
                  activeVersion={prompt.latest_version}
                  selectedScenarioIds={selectedScenarioIds}
                />
              )}
              {activeTab === "history" && (
                <RunHistory promptId={prompt.id} />
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
