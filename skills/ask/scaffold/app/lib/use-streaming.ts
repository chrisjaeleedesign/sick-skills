"use client";

import { useState, useCallback, useRef } from "react";
import { parseSSEStream } from "./api";
import type { StreamEvent } from "./types";

interface StreamingState {
  text: string;
  reasoning: string;
  isDone: boolean;
  error: string | null;
}

export function useStreaming() {
  const [state, setState] = useState<StreamingState>({
    text: "",
    reasoning: "",
    isDone: false,
    error: null,
  });
  const cancelRef = useRef<(() => void) | null>(null);

  const startStream = useCallback((response: Response) => {
    setState({ text: "", reasoning: "", isDone: false, error: null });

    const cancel = parseSSEStream(
      response,
      (event: StreamEvent) => {
        setState((prev) => {
          if (event.type === "text") {
            return { ...prev, text: prev.text + (event.content || "") };
          }
          if (event.type === "reasoning") {
            return {
              ...prev,
              reasoning: prev.reasoning + (event.content || ""),
            };
          }
          if (event.type === "done") {
            return { ...prev, isDone: true };
          }
          return prev;
        });
      },
      (error: Error) => {
        setState((prev) => ({ ...prev, error: error.message, isDone: true }));
      }
    );

    cancelRef.current = cancel;
  }, []);

  const cancelStream = useCallback(() => {
    cancelRef.current?.();
    setState((prev) => ({ ...prev, isDone: true }));
  }, []);

  const reset = useCallback(() => {
    cancelRef.current?.();
    setState({ text: "", reasoning: "", isDone: false, error: null });
  }, []);

  return { ...state, startStream, cancelStream, reset };
}
