"use client";

import { useEffect, useState, useCallback, use } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Sparkles, ArrowLeft } from "lucide-react";
import ReviewCard from "@/components/review-card";
import { fetchRun, submitReview, improvePrompt, fetchConfig } from "@/lib/api";
import type { ScenarioResult, Review, RunMeta, AppConfig } from "@/lib/types";

export default function ReviewPage({
  params,
}: {
  params: Promise<{ runId: string }>;
}) {
  const { runId } = use(params);
  const router = useRouter();
  const [meta, setMeta] = useState<RunMeta | null>(null);
  const [results, setResults] = useState<ScenarioResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [reviews, setReviews] = useState<Map<string, Review>>(new Map());
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [improving, setImproving] = useState(false);
  const [config, setConfig] = useState<AppConfig | null>(null);

  useEffect(() => {
    Promise.all([fetchRun(runId), fetchConfig()])
      .then(([run, cfg]) => {
        setMeta(run.meta);
        setResults(run.results);
        setConfig(cfg);
      })
      .catch(() => router.push("/"))
      .finally(() => setLoading(false));
  }, [runId, router]);

  const handleReview = useCallback(
    (review: Review) => {
      setReviews((prev) => {
        const next = new Map(prev);
        next.set(review.scenario_id, review);
        return next;
      });
      // Auto-advance after a short delay
      setTimeout(() => {
        setCurrentIndex((i) => Math.min(i + 1, results.length - 1));
      }, 300);
    },
    [results.length]
  );

  // Keyboard navigation
  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (e.target instanceof HTMLTextAreaElement) return;
      const result = results[currentIndex];
      if (!result) return;

      if (e.key === "ArrowLeft") {
        handleReview({
          scenario_id: result.scenario_id,
          rating: "bad",
          note: "",
        });
      } else if (e.key === "ArrowRight") {
        handleReview({
          scenario_id: result.scenario_id,
          rating: "good",
          note: "",
        });
      } else if (e.key === "ArrowDown") {
        handleReview({
          scenario_id: result.scenario_id,
          rating: "skip",
          note: "",
        });
      } else if (e.key === "ArrowUp" && currentIndex > 0) {
        setCurrentIndex((i) => i - 1);
      }
    }
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [currentIndex, results, handleReview]);

  async function handleSubmitAll() {
    setSubmitting(true);
    try {
      await submitReview(runId, Array.from(reviews.values()));
      setSubmitted(true);
    } catch {
      // handle
    } finally {
      setSubmitting(false);
    }
  }

  async function handleImprove() {
    if (!config) return;
    setImproving(true);
    try {
      const newVersion = await improvePrompt(runId, config.default_model);
      if (meta) {
        router.push(`/prompts/${meta.prompt_id}`);
      }
    } catch {
      // handle
    } finally {
      setImproving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-text-tertiary" />
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <p className="text-sm text-text-tertiary">No results to review.</p>
      </div>
    );
  }

  const progress = reviews.size / results.length;
  const allReviewed = reviews.size === results.length;

  return (
    <div className="flex h-screen flex-col bg-background">
      {/* Top bar */}
      <div className="flex items-center gap-4 border-b border-border-subtle px-6 py-3">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-1 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
        >
          <ArrowLeft className="h-4 w-4" />
          Back
        </button>
        <div className="flex-1" />
        <span className="text-xs text-text-tertiary">
          {currentIndex + 1} / {results.length}
        </span>
        {meta && (
          <span className="text-xs text-text-tertiary">
            v{meta.prompt_version} &middot; {meta.model}
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div className="h-1 bg-surface-1">
        <div
          className="h-full bg-primary transition-all duration-300"
          style={{ width: `${progress * 100}%` }}
        />
      </div>

      {/* Card navigation dots */}
      <div className="flex justify-center gap-1.5 py-3">
        {results.map((r, i) => {
          const review = reviews.get(r.scenario_id);
          let dotColor = "bg-surface-2";
          if (review?.rating === "good") dotColor = "bg-accent-green";
          else if (review?.rating === "bad") dotColor = "bg-accent-red";
          else if (review?.rating === "skip") dotColor = "bg-surface-3";

          return (
            <button
              key={r.scenario_id}
              onClick={() => setCurrentIndex(i)}
              className={`h-2 w-2 rounded-full transition-all ${dotColor} ${
                i === currentIndex ? "ring-2 ring-primary ring-offset-1 ring-offset-background" : ""
              }`}
            />
          );
        })}
      </div>

      {/* Review card */}
      <div className="flex-1 overflow-hidden px-6 py-2">
        <ReviewCard
          key={results[currentIndex].scenario_id}
          result={results[currentIndex]}
          onSubmit={handleReview}
        />
      </div>

      {/* Bottom actions */}
      {allReviewed && !submitted && (
        <div className="flex justify-center border-t border-border-subtle px-6 py-4">
          <button
            onClick={handleSubmitAll}
            disabled={submitting}
            className="flex items-center gap-2 rounded-lg bg-primary px-6 py-2.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary-hover disabled:opacity-50"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : null}
            Submit Review ({reviews.size} ratings)
          </button>
        </div>
      )}

      {submitted && (
        <div className="flex items-center justify-center gap-4 border-t border-border-subtle px-6 py-4">
          <span className="text-sm text-accent-green">Review submitted!</span>
          <button
            onClick={handleImprove}
            disabled={improving}
            className="flex items-center gap-2 rounded-lg bg-accent-green/10 px-4 py-2 text-sm font-medium text-accent-green transition-colors hover:bg-accent-green/20 disabled:opacity-50"
          >
            {improving ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Improve Prompt
          </button>
        </div>
      )}
    </div>
  );
}
