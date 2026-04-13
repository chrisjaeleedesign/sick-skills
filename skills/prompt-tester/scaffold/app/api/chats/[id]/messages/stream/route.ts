import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { appendMessage, updateChatMeta } from '@/app/lib/storage'
import { resolveModel } from '@/app/lib/models'
import type { ChatMessage, PromptState } from '@/app/lib/workbench-types'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = await params
  const { text, promptState }: { text: string; promptState: PromptState } = await req.json()

  const start = Date.now()
  const userMsgId = randomUUID()
  const asstMsgId = randomUUID()
  const now = new Date().toISOString()

  // Save user message immediately
  const userMsg: ChatMessage = {
    id: userMsgId,
    role: 'user',
    timestamp: now,
    text,
    promptVersion: 0, // will be filled from promptState
    promptState,
    model: promptState.model,
  }
  await appendMessage(chatId, userMsg)

  const encoder = new TextEncoder()

  const stream = new ReadableStream({
    async start(controller) {
      function send(event: string, data: unknown) {
        controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`))
      }

      try {
        // Build messages array for the API
        const apiMessages: { role: string; content: string }[] = []

        if (promptState.systemInstructions) {
          // Included as system role — OpenRouter passes this to the model
          apiMessages.push({ role: 'system', content: promptState.systemInstructions })
        }

        apiMessages.push({ role: 'user', content: text })

        const modelId = resolveModel(promptState.model)
        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

        const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model: modelId.replace('openrouter/', ''),
            messages: apiMessages,
            temperature: promptState.settings.temperature,
            stream: true,
          }),
        })

        if (!response.ok) {
          const err = await response.text()
          throw new Error(`OpenRouter error: ${err}`)
        }

        const reader = response.body!.getReader()
        const dec = new TextDecoder()
        let fullText = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break

          const chunk = dec.decode(value)
          const lines = chunk.split('\n').filter(l => l.startsWith('data: '))

          for (const line of lines) {
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              const delta = parsed.choices?.[0]?.delta?.content ?? ''
              if (delta) {
                fullText += delta
                send('text', { content: delta })
              }
            } catch {
              // ignore malformed chunk
            }
          }
        }

        const duration = Date.now() - start

        // Save assistant message
        const asstMsg: ChatMessage = {
          id: asstMsgId,
          role: 'assistant',
          timestamp: new Date().toISOString(),
          outputText: fullText,
          promptVersion: 0,
          promptState,
          model: promptState.model,
          duration,
        }
        await appendMessage(chatId, asstMsg)
        await updateChatMeta(chatId, { updated: new Date().toISOString() })

        send('done', { messageId: asstMsgId, duration })
      } catch (err) {
        send('error', { message: err instanceof Error ? err.message : 'Unknown error' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
