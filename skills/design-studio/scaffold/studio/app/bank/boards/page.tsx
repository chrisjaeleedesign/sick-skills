"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Plus, Loader2 } from "lucide-react";
import type { Board } from "@/app/lib/types";
import { COLOR_PALETTE } from "@/app/lib/types";
import type { Color } from "@/app/lib/types";
import { BoardCard } from "./board-card";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface BoardWithPreview extends Board {
  itemCount: number;
  previewPaths: string[];
}

const BOARD_COLORS: Color[] = ["red", "blue", "emerald", "amber", "purple", "pink", "gray"];

// ---------------------------------------------------------------------------
// Boards Overview page
// ---------------------------------------------------------------------------

export default function BoardsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const project = searchParams.get("project");
  const projectSuffix = project ? `?project=${encodeURIComponent(project)}` : "";

  const [boards, setBoards] = useState<BoardWithPreview[]>([]);
  const [loading, setLoading] = useState(true);

  // New board form state
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newBoardName, setNewBoardName] = useState("");
  const [newBoardColor, setNewBoardColor] = useState<Color>("blue");
  const [creating, setCreating] = useState(false);

  const fetchBoards = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/entries/boards?preview=true");
      if (!res.ok) throw new Error(`${res.status}`);
      const data = await res.json();
      setBoards(data.boards ?? []);
    } catch (err) {
      console.error("Failed to fetch boards:", err);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBoards();
  }, [fetchBoards]);

  const handleCreateBoard = async () => {
    if (!newBoardName.trim()) return;
    setCreating(true);
    try {
      const res = await fetch("/api/entries/boards", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "create-board",
          board: { name: newBoardName.trim(), color: newBoardColor },
        }),
      });
      if (res.ok) {
        setNewBoardName("");
        setShowCreateForm(false);
        await fetchBoards();
      }
    } catch (err) {
      console.error("Failed to create board:", err);
    }
    setCreating(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="grid grid-cols-3 gap-4">
        {boards.map((board) => (
          <BoardCard
            key={board.id}
            board={board}
            itemCount={board.itemCount}
            previewPaths={board.previewPaths}
            onClick={() => router.push(`/bank/boards/${board.id}${projectSuffix}`)}
          />
        ))}

        {/* New Board card */}
        {showCreateForm ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface-1 p-4">
            <input
              type="text"
              value={newBoardName}
              onChange={(e) => setNewBoardName(e.target.value)}
              placeholder="Board name..."
              className="rounded-lg border border-border bg-card px-3 py-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary focus:border-surface-3 focus:ring-1 focus:ring-surface-3"
              autoFocus
              onKeyDown={(e) => e.key === "Enter" && handleCreateBoard()}
            />
            {/* Color picker */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-text-tertiary">Color:</span>
              {BOARD_COLORS.map((c) => (
                <button
                  key={c}
                  onClick={() => setNewBoardColor(c)}
                  className={`h-5 w-5 rounded-full ${COLOR_PALETTE[c].dot} ${
                    newBoardColor === c ? "ring-2 ring-text-tertiary ring-offset-1" : ""
                  }`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleCreateBoard}
                disabled={creating || !newBoardName.trim()}
                className="rounded-lg bg-primary px-3 py-1.5 text-xs font-medium text-white hover:bg-primary/90 disabled:opacity-40"
              >
                {creating ? "Creating..." : "Create"}
              </button>
              <button
                onClick={() => { setShowCreateForm(false); setNewBoardName(""); }}
                className="rounded-lg px-3 py-1.5 text-xs text-text-tertiary hover:bg-surface-2"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            onClick={() => setShowCreateForm(true)}
            className="flex flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border bg-surface-1/50 p-8 text-text-tertiary transition hover:border-primary/30 hover:text-text-secondary"
          >
            <Plus className="h-6 w-6" />
            <span className="text-sm font-medium">New Board</span>
          </button>
        )}
      </div>
    </div>
  );
}
