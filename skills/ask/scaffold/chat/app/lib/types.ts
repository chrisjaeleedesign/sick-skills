/* ── Core types for ask chat UI ── */

export interface ModelAlias {
  alias: string;
  provider: string;
  modelId: string;
}

export interface ProviderConfig {
  auth?: string;
  token_source?: string;
  env_key?: string;
}

export interface AppConfig {
  default_model: string;
  aliases: Record<string, string>;
  providers: Record<string, ProviderConfig>;
}

/* ── Conversation JSONL types ── */

export interface ConversationMeta {
  type: "meta";
  id: string;
  title: string | null;
  summary: string | null;
  project: string | null;
  created: string;
  updated: string;
  parent: string | null;
  branch_from: string | null;
  exchanges: number;
  tags: string[];
  flow: string | null;
}

export interface UserMessage {
  type: "user";
  sender: string;
  content: string;
  exchange: number;
  attachments?: { path: string; mime: string }[];
}

export interface AssistantMessage {
  type: "assistant";
  sender: string;
  model: string;
  content: string;
  exchange: number;
  persona?: string;
  system_prompt?: string;
}

export type ConversationMessage = UserMessage | AssistantMessage;

/* ── API types ── */

export interface ApiMessage {
  role: "system" | "user" | "assistant";
  content: string | ContentPart[];
}

export interface ContentPart {
  type: "text" | "image_url";
  text?: string;
  image_url?: { url: string };
}

/* ── Streaming chunk types ── */

export interface StreamChunk {
  type: "reasoning" | "text" | "done" | "error";
  content?: string;
}

/* ── Project ── */

export interface Project {
  id: string;
  name: string;
  conversationCount: number;
}

/* ── Conversation list item ── */

export interface ConversationListItem {
  id: string;
  title: string | null;
  project: string | null;
  updated: string;
  exchanges: number;
  model?: string;
  filepath: string;
}
