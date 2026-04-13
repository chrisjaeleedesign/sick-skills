export interface ModelEntry {
  alias: string
  fullId: string
  type: 'text' | 'image'
  label: string
}

// Matches the aliases defined in skills/ask/config.yaml
// Add more as new models are registered
export const MODELS: ModelEntry[] = [
  { alias: 'sonnet',      fullId: 'anthropic/claude-sonnet-4-6',          type: 'text',  label: 'Claude Sonnet 4.6' },
  { alias: 'opus',        fullId: 'anthropic/claude-opus-4-6',             type: 'text',  label: 'Claude Opus 4.6' },
  { alias: 'haiku',       fullId: 'anthropic/claude-haiku-4-5-20251001',   type: 'text',  label: 'Claude Haiku 4.5' },
  { alias: 'gpt5',        fullId: 'openai/gpt-5',                          type: 'text',  label: 'GPT-5' },
  { alias: 'gemini-pro',  fullId: 'google/gemini-3.1-pro-preview',         type: 'text',  label: 'Gemini 3.1 Pro' },
  { alias: 'nanobanana',  fullId: 'google/gemini-3.1-flash-image-preview', type: 'image', label: 'Nano Banana 2 (Image)' },
  { alias: 'gpt-image',   fullId: 'openai/gpt-5-image',                   type: 'image', label: 'GPT-5 Image' },
]

export function isImageModel(alias: string): boolean {
  const found = MODELS.find(m => m.alias === alias || m.fullId === alias)
  return found?.type === 'image'
}

export function resolveModel(alias: string): string {
  const found = MODELS.find(m => m.alias === alias)
  return found ? `openrouter/${found.fullId}` : alias
}
