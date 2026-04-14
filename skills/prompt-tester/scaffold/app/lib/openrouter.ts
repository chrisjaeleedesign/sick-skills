const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'

export interface OpenRouterMessage {
  role: string
  content: string
}

export interface CallOpenRouterOptions {
  apiKey: string
  modelId: string
  messages: OpenRouterMessage[]
  temperature: number
  stream?: boolean
  /** Extra model-specific fields merged into the request body (e.g. n, aspect_ratio) */
  extra?: Record<string, unknown>
}

export async function callOpenRouter(opts: CallOpenRouterOptions): Promise<Response> {
  const body: Record<string, unknown> = {
    model: opts.modelId.replace('openrouter/', ''),
    messages: opts.messages,
    temperature: opts.temperature,
    ...(opts.stream && { stream: true }),
    ...(opts.extra ?? {}),
  }

  const response = await fetch(OPENROUTER_URL, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${opts.apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`OpenRouter error: ${err}`)
  }

  return response
}
