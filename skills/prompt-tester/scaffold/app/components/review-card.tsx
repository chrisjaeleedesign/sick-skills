"use client";

import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { ThumbsUp, ThumbsDown, SkipForward, ChevronDown } from "lucide-react";
import type { ScenarioResult, Review } from "@/lib/types";

interface Props {
  result: ScenarioResult;
  onSubmit: (review: Review) => void;
}

export default function ReviewCard({ result, onSubmit }: Props) {
  const [note, setNote] = useState("");
  const [showScores, setShowScores] = useState(false);
  const [submitted, setSubmitted] = useState<Review["rating"] | null>(null);

  function handleRate(rating: Review["rating"]) {
    setSubmitted(rating);
    onSubmit({ scenario_id: result.scenario_id, rating, note });
  }

  const ratingStyles = {
    good: "bg-accent-green text-white scale-105",
    bad: "bg-accent-red text-white scale-105",
    skip: "bg-surface-3 text-white scale-105",
  };

  return (
    <div className="mx-auto flex h-full max-w-3xl flex-col">
      {/* Scenario info */}
      <div className="mb-4">
        <h2 className="text-lg font-semibold text-text-primary">
          {result.scenario_title}
        </h2>
        <div className="mt-2 rounded-lg bg-surface-0 p-3">
          <span className="text-[10px] uppercase tracking-wide text-text-tertiary">
            Input
          </span>
          <p className="mt-1 font-mono text-sm text-text-secondary whitespace-pre-wrap">
            {result.input}
          </p>
        </div>
      </div>

      {/* Response */}
      <div className="mb-4 flex-1 overflow-y-auto rounded-lg border border-border-subtle bg-surface-0 p-4">
        <div className="prose-response text-sm text-text-secondary">
          <ReactMarkdown>{result.output}</ReactMarkdown>
        </div>
      </div>

      {/* AI Scores (collapsed) */}
      {result.scores && (
        <button
          onClick={() => setShowScores(!showScores)}
          className="mb-3 flex items-center gap-1.5 text-xs text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ChevronDown
            className={`h-3.5 w-3.5 transition-transform ${showScores ? "rotate-0" : "-rotate-90"}`}
          />
          AI Scores
          {result.scores && (
            <span className="text-text-tertiary">
              (avg{" "}
              {(
                (result.scores.instruction_following.score +
                  result.scores.eval_rules.score +
                  result.scores.quality.score) /
                3
              ).toFixed(1)}
              )
            </span>
          )}
        </button>
      )}
      {showScores && result.scores && (
        <div className="mb-4 grid grid-cols-3 gap-2 text-xs">
          {(
            [
              ["Instruction", result.scores.instruction_following],
              ["Eval Rules", result.scores.eval_rules],
              ["Quality", result.scores.quality],
            ] as const
          ).map(([label, s]) => (
            <div key={label} className="rounded-md bg-surface-0 p-2">
              <div className="font-medium text-text-secondary">
                {label}: {s.score}/5
              </div>
              <p className="mt-0.5 text-text-tertiary">{s.explanation}</p>
            </div>
          ))}
        </div>
      )}

      {/* Note */}
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="Optional note... (Enter to submit)"
        rows={2}
        onKeyDown={(e) => {
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            // note gets included with next rating click
          }
        }}
        className="mb-3 w-full rounded-lg border border-border-subtle bg-surface-0 px-3 py-2 text-sm text-text-primary placeholder:text-text-tertiary focus:border-primary focus:outline-none"
      />

      {/* Rating buttons */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={() => handleRate("bad")}
          className={`flex h-14 w-14 items-center justify-center rounded-xl transition-all ${
            submitted === "bad"
              ? ratingStyles.bad
              : "bg-surface-1 text-accent-red hover:bg-accent-red/10 active:scale-95"
          }`}
          title="Bad (Left arrow)"
        >
          <ThumbsDown className="h-6 w-6" />
        </button>
        <button
          onClick={() => handleRate("skip")}
          className={`flex h-14 w-14 items-center justify-center rounded-xl transition-all ${
            submitted === "skip"
              ? ratingStyles.skip
              : "bg-surface-1 text-text-tertiary hover:bg-surface-2 active:scale-95"
          }`}
          title="Skip (Down arrow)"
        >
          <SkipForward className="h-6 w-6" />
        </button>
        <button
          onClick={() => handleRate("good")}
          className={`flex h-14 w-14 items-center justify-center rounded-xl transition-all ${
            submitted === "good"
              ? ratingStyles.good
              : "bg-surface-1 text-accent-green hover:bg-accent-green/10 active:scale-95"
          }`}
          title="Good (Right arrow)"
        >
          <ThumbsUp className="h-6 w-6" />
        </button>
      </div>

      {/* Keyboard hint */}
      <p className="mt-2 text-center text-[10px] text-text-tertiary">
        Keyboard: \u2190 Bad &middot; \u2193 Skip &middot; \u2192 Good
      </p>
    </div>
  );
}
