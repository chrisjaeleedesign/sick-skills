export interface ConversationMeta {
  type: "meta";
  id: string;
  title: string | null;
  summary: string | null;
  created: string;
  updated: string;
  parent: string | null;
  branch_from: string | null;
  exchanges: number;
  tags: string[];
  flow: string | null;
}

export interface Message {
  type: "user" | "assistant";
  exchange: number;
  sender: string;
  content: string;
  model?: string;
  persona?: string;
  system_prompt?: string;
  attachments?: Array<{ path: string; mime: string }>;
}

export interface Conversation {
  meta: ConversationMeta;
  messages: Message[];
  filename: string;
}

export interface ModelConfig {
  default_model: string;
  aliases: Record<string, string>;
}

export interface PersonaInfo {
  name: string;
  content: string;
}

export interface FlowInfo {
  name: string;
  content: string;
}

export interface StreamEvent {
  type: "text" | "reasoning" | "done";
  content?: string;
  conversation?: string;
}
