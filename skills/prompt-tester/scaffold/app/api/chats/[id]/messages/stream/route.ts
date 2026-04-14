import { NextRequest } from 'next/server'
import { randomUUID } from 'crypto'
import { writeFile, mkdir } from 'fs/promises'
import path from 'path'
import { appendMessage, updateChatMeta, listMessages } from '@/app/lib/storage'
import { resolveModel, isImageModel } from '@/app/lib/models'
import { IMAGES_DIR } from '@/app/lib/paths'
import type { ChatMessage, PromptState, OutputImage } from '@/app/lib/workbench-types'
import { callOpenRouter } from '@/app/lib/openrouter'

export const runtime = 'nodejs'

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: chatId } = await params
  const { text, promptState }: { text: string; promptState: PromptState } = await req.json()

  const start = Date.now()
  const userMsgId = randomUUID()
  const asstMsgId = randomUUID()
  const now = new Date().toISOString()

  const priorMessages = await listMessages(chatId)

  const userMsg: ChatMessage = {
    id: userMsgId,
    role: 'user',
    timestamp: now,
    text,
    promptVersion: 0,
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
        const apiMessages: { role: string; content: string }[] = []
        if (promptState.systemInstructions) {
          apiMessages.push({ role: 'system', content: promptState.systemInstructions })
        }
        for (const msg of priorMessages) {
          if (msg.role === 'user' && msg.text)
            apiMessages.push({ role: 'user', content: msg.text })
          else if (msg.role === 'assistant' && msg.outputText)
            apiMessages.push({ role: 'assistant', content: msg.outputText })
        }
        apiMessages.push({ role: 'user', content: text })

        const modelId = resolveModel(promptState.model)
        const apiKey = process.env.OPENROUTER_API_KEY
        if (!apiKey) throw new Error('OPENROUTER_API_KEY not set')

        if (isImageModel(promptState.model)) {
          // Image models: non-streaming call, images in response body
          const extra: Record<string, unknown> = {}
          if (promptState.settings.variations != null) extra.n = promptState.settings.variations
          if (promptState.settings.aspectRatio != null) extra.aspect_ratio = promptState.settings.aspectRatio

          const response = await callOpenRouter({
            apiKey,
            modelId,
            messages: apiMessages,
            temperature: promptState.settings.temperature,
            extra,
          })

          const json = await response.json()
          const msg = json.choices?.[0]?.message
          const outputText: string = msg?.content ?? ''
          const rawImages: { image_url?: { url?: string } }[] = msg?.images ?? []

          await mkdir(IMAGES_DIR, { recursive: true })

          const outputImages: OutputImage[] = []
          for (const img of rawImages) {
            const dataUrl = img.image_url?.url ?? ''
            if (!dataUrl.startsWith('data:image/')) continue
            const [header, b64] = dataUrl.split(',', 2)
            const ext = header.split('/')[1]?.split(';')[0] ?? 'png'
            const filename = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`
            const filepath = path.join(IMAGES_DIR, filename)
            await writeFile(filepath, Buffer.from(b64, 'base64'))
            outputImages.push({ id: randomUUID(), path: filename })
            send('image', { url: `/api/images?file=${filename}` })
          }

          const duration = Date.now() - start
          const noOutput = outputImages.length === 0 && !outputText
          const asstMsg: ChatMessage = {
            id: asstMsgId,
            role: 'assistant',
            timestamp: new Date().toISOString(),
            outputText: outputText || undefined,
            outputImages: outputImages.length > 0 ? outputImages : undefined,
            outputError: noOutput ? 'Model returned no images' : undefined,
            promptVersion: 0,
            promptState,
            model: promptState.model,
            duration,
          }
          await appendMessage(chatId, asstMsg)
          await updateChatMeta(chatId, { updated: new Date().toISOString() })
          send('done', { messageId: asstMsgId, duration })
        } else {
          // Text models: streaming
          const response = await callOpenRouter({
            apiKey,
            modelId,
            messages: apiMessages,
            temperature: promptState.settings.temperature,
            stream: true,
          })

          if (!response.body) throw new Error('OpenRouter returned empty body for streaming response')
          const reader = response.body.getReader()
          const dec = new TextDecoder()
          let fullText = ''
          let sseBuffer = ''

          while (true) {
            const { done, value } = await reader.read()
            if (done) break
            sseBuffer += dec.decode(value, { stream: true })
            const parts = sseBuffer.split('\n')
            sseBuffer = parts.pop() ?? ''
            for (const line of parts) {
              if (!line.startsWith('data: ')) continue
              const data = line.slice(6).trim()
              if (data === '[DONE]') continue
              try {
                const parsed = JSON.parse(data)
                const delta = parsed.choices?.[0]?.delta?.content ?? ''
                if (delta) {
                  fullText += delta
                  send('text', { content: delta })
                }
              } catch { /* ignore malformed */ }
            }
          }

          const duration = Date.now() - start
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
        }
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
