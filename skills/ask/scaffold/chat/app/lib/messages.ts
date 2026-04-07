/* ── Build API messages from conversation history ── */

import type { ConversationMessage, ApiMessage } from "./types";

const SUMMARY_CHAR_THRESHOLD = 80_000;
const RECENT_EXCHANGES_TO_KEEP = 4;

function estimateChars(messages: ConversationMessage[]): number {
  return messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0);
}

/**
 * Convert stored messages + current input into provider-ready format.
 *
 * When history exceeds ~80K chars, keeps only the last 4 exchanges verbatim
 * and prepends a summary of older messages (if provided).
 */
export function buildMessagesForApi(opts: {
  history: ConversationMessage[];
  systemPrompt?: string;
  currentContent: string;
  summary?: string;
}): ApiMessage[] {
  const { history, systemPrompt, currentContent, summary } = opts;
  const apiMessages: ApiMessage[] = [];

  if (systemPrompt) {
    apiMessages.push({ role: "system", content: systemPrompt });
  }

  const totalChars = estimateChars(history);
  let historyToSend = history;

  if (
    totalChars > SUMMARY_CHAR_THRESHOLD &&
    history.length > RECENT_EXCHANGES_TO_KEEP * 2
  ) {
    const recentCutoff = history.length - RECENT_EXCHANGES_TO_KEEP * 2;
    historyToSend = history.slice(recentCutoff);

    if (summary) {
      apiMessages.push({
        role: "system",
        content: `Summary of earlier conversation:\n${summary}`,
      });
    }
  }

  for (const msg of historyToSend) {
    const role = msg.type === "user" ? "user" : "assistant";
    apiMessages.push({ role, content: msg.content });
  }

  apiMessages.push({ role: "user", content: currentContent });

  return apiMessages;
}
