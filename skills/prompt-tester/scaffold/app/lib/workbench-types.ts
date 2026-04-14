export interface Settings {
  temperature: number
  thinking: 'none' | 'low' | 'medium' | 'high'
  // text-only
  maxTokens?: number
  // image-only
  variations?: 1 | 2 | 4 | 8
  aspectRatio?: '1:1' | '3:4' | '4:3' | '16:9' | '9:16'
}

export const DEFAULT_SETTINGS: Settings = {
  temperature: 0.7,
  thinking: 'low',
}

export interface Attachment {
  id: string
  mime: string
  name: string
  path?: string
  dataUrl?: string
}

export interface OutputImage {
  id: string
  path: string
}

export interface PromptState {
  model: string
  systemInstructions: string
  referenceAttachments: Attachment[]
  settings: Settings
  chatMode: 'stateless' | 'conversational'
}

export const DEFAULT_PROMPT_STATE: PromptState = {
  model: 'sonnet',
  systemInstructions: '',
  referenceAttachments: [],
  settings: DEFAULT_SETTINGS,
  chatMode: 'conversational',
}

export interface PromptVersion {
  version: number
  state: PromptState
  committed: string
  note?: string
}

export interface Prompt {
  id: string
  name: string
  created: string
  updated: string
  draft: PromptState
  currentVersion: number
}

export type PromptSummary = Omit<Prompt, 'draft'>

export interface Chat {
  id: string
  title: string
  created: string
  updated: string
  promptId: string
  promptVersion: number
  branchOf?: { chatId: string; messageId: string }
}

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  timestamp: string
  text?: string
  extraAttachments?: Attachment[]
  outputText?: string
  outputImages?: OutputImage[]
  outputError?: string
  promptVersion: number
  promptState: PromptState
  model: string
  duration?: number
}

export interface ChatSummary {
  id: string
  title: string
  created: string
  updated: string
  promptId: string
  promptName: string
  promptVersion: number
  branchOf?: { chatId: string; messageId: string }
}
