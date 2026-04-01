"use client";

import { useState, useCallback, useRef } from "react";
import type { StreamEvent, ScenarioResult } from "./types";

interface StreamState {
  isStreaming: boolean;
  progress: Map<string, string>; // scenario_id → status text
  results: ScenarioResult[];
  runId: string | null;
  error: string | null;
}

export function useStreaming() {
  const [state, setState] = useState<StreamState>({
    isStreaming: false,
    progress: new Map(),
    results: [],
    runId: null,
    error: null,
  });
  const esRef = useRef<EventSource | null>(null);

  const stop = useCallback(() => {
    if (esRef.current) {
      esRef.current.close();
      esRef.current = null;
    }
    setState((s) => ({ ...s, isStreaming: false }));
  }, []);

  const start = useCallback(
    (es: EventSource) => {
      stop();
      esRef.current = es;

      setState({
        isStreaming: true,
        progress: new Map(),
        results: [],
        runId: null,
        error: null,
      });

      es.onmessage = (event) => {
        try {
          const data: StreamEvent = JSON.parse(event.data);

          setState((prev) => {
            switch (data.type) {
              case "progress": {
                const next = new Map(prev.progress);
                if (data.scenario_id && data.status) {
                  next.set(data.scenario_id, data.status);
                }
                return { ...prev, progress: next };
              }
              case "result": {
                const result: ScenarioResult = {
                  scenario_id: data.scenario_id!,
                  scenario_title: "",
                  input: "",
                  output: data.output || "",
                  scores: data.scores as ScenarioResult["scores"],
                };
                // Merge full result if it has more fields
                const merged = data as unknown as Record<string, unknown>;
                if (merged.scenario_title)
                  result.scenario_title = merged.scenario_title as string;
                if (merged.input) result.input = merged.input as string;
                return { ...prev, results: [...prev.results, result] };
              }
              case "done":
                es.close();
                esRef.current = null;
                return {
                  ...prev,
                  isStreaming: false,
                  runId: data.run_id || prev.runId,
                };
              case "error":
                es.close();
                esRef.current = null;
                return {
                  ...prev,
                  isStreaming: false,
                  error: data.content || "Unknown error",
                };
              default:
                return prev;
            }
          });
        } catch {
          // Ignore malformed events
        }
      };

      es.onerror = () => {
        es.close();
        esRef.current = null;
        setState((prev) => ({
          ...prev,
          isStreaming: false,
          error: prev.error || "Connection lost",
        }));
      };
    },
    [stop]
  );

  return { ...state, start, stop };
}
