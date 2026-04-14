'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import type {
  Chat, ChatSummary, Prompt, PromptVersion,
  ChatMessage, Settings,
} from './workbench-types'
import { apiGet, apiPost, apiPut, apiDelete } from './api'

interface WorkbenchContextValue {
  chats: ChatSummary[]
  activeChat: Chat | null
  activePrompt: Prompt | null
  messages: ChatMessage[]
  isStreaming: boolean
  streamingText: string
  streamingImages: string[]

  loadChats(): Promise<void>
  createChat(title?: string): Promise<Chat>
  openChat(id: string): Promise<void>
  deleteChat(id: string): Promise<void>

  setPromptName(name: string): void
  setModel(model: string): void
  setSystemInstructions(text: string): void
  updateSettings(patch: Partial<Settings>): void
  saveAsVersion(): Promise<PromptVersion>

  sendMessage(text: string): Promise<void>
  stopStream(): void
}

const WorkbenchContext = createContext<WorkbenchContextValue | null>(null)

export function useWorkbench() {
  const ctx = useContext(WorkbenchContext)
  if (!ctx) throw new Error('useWorkbench must be used inside WorkbenchProvider')
  return ctx
}

export function WorkbenchProvider({ children }: { children: React.ReactNode }) {
  const [chats, setChats] = useState<ChatSummary[]>([])
  const [activeChat, setActiveChat] = useState<Chat | null>(null)
  const [activePrompt, setActivePrompt] = useState<Prompt | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [isStreaming, setIsStreaming] = useState(false)
  const [streamingText, setStreamingText] = useState('')
  const [streamingImages, setStreamingImages] = useState<string[]>([])
  const abortRef = useRef<(() => void) | null>(null)
  const draftTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isStreamingRef = useRef(false)

  const loadChats = useCallback(async () => {
    setChats(await apiGet<ChatSummary[]>('/api/chats'))
  }, [])

  const createChat = useCallback(async (title?: string) => {
    const chat = await apiPost<Chat>('/api/chats', { title: title ?? 'New chat' })
    await loadChats()
    return chat
  }, [loadChats])

  const openChat = useCallback(async (id: string) => {
    const [chat, msgs] = await Promise.all([
      apiGet<Chat>(`/api/chats/${id}`),
      apiGet<ChatMessage[]>(`/api/chats/${id}/messages`),
    ])
    const prompt = await apiGet<Prompt>(`/api/prompts/${chat.promptId}`)

    setActiveChat(chat)
    setActivePrompt(prompt)
    setMessages(msgs)
  }, [])

  const deleteChat = useCallback(async (id: string) => {
    await apiDelete(`/api/chats/${id}`)
    if (activeChat?.id === id) {
      setActiveChat(null)
      setActivePrompt(null)
      setMessages([])
    }
    await loadChats()
  }, [activeChat, loadChats])

  // Persist prompt draft (debounced)
  const persistDraft = useCallback((prompt: Prompt) => {
    if (draftTimerRef.current) clearTimeout(draftTimerRef.current)
    draftTimerRef.current = setTimeout(async () => {
      await apiPut(`/api/prompts/${prompt.id}`, { name: prompt.name, draft: prompt.draft })
    }, 500)
  }, [])

  const updatePrompt = useCallback((updater: (p: Prompt) => Prompt) => {
    setActivePrompt(prev => {
      if (!prev) return prev
      const next = updater(prev)
      persistDraft(next)
      return next
    })
  }, [persistDraft])

  const setPromptName = useCallback((name: string) => {
    updatePrompt(p => ({ ...p, name }))
  }, [updatePrompt])

  const setModel = useCallback((model: string) => {
    updatePrompt(p => ({ ...p, draft: { ...p.draft, model } }))
  }, [updatePrompt])

  const setSystemInstructions = useCallback((text: string) => {
    updatePrompt(p => ({ ...p, draft: { ...p.draft, systemInstructions: text } }))
  }, [updatePrompt])

  const updateSettings = useCallback((patch: Partial<Settings>) => {
    updatePrompt(p => ({ ...p, draft: { ...p.draft, settings: { ...p.draft.settings, ...patch } } }))
  }, [updatePrompt])

  const saveAsVersion = useCallback(async (): Promise<PromptVersion> => {
    if (!activePrompt) throw new Error('No active prompt')
    const version = await apiPost<PromptVersion>(`/api/prompts/${activePrompt.id}/versions`)
    setActivePrompt(prev => prev ? { ...prev, currentVersion: version.version } : prev)
    return version
  }, [activePrompt])

  const sendMessage = useCallback(async (text: string) => {
    if (!activeChat || !activePrompt || isStreamingRef.current) return

    isStreamingRef.current = true
    setIsStreaming(true)
    setStreamingText('')
    setStreamingImages([])

    const promptState = activePrompt.draft
    let cancelled = false
    let reader: ReadableStreamDefaultReader<Uint8Array> | null = null

    abortRef.current = () => {
      cancelled = true
      reader?.cancel()
    }

    try {
      const res = await fetch(`/api/chats/${activeChat.id}/messages/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, promptState }),
      })

      reader = res.body!.getReader()
      const dec = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done || cancelled) break
        buffer += dec.decode(value, { stream: true })

        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const raw = line.slice(6)
          try {
            const evt = JSON.parse(raw)
            if ('content' in evt) {
              setStreamingText(t => t + (evt.content as string))
            }
            if ('url' in evt) {
              setStreamingImages(imgs => [...imgs, evt.url as string])
            }
            if ('duration' in evt) {
              // stream done — reload messages
              setMessages(await apiGet<ChatMessage[]>(`/api/chats/${activeChat.id}/messages`))
              setStreamingText('')
              setStreamingImages([])
              await loadChats()
            }
          } catch { /* ignore */ }
        }
      }
    } finally {
      isStreamingRef.current = false
      setIsStreaming(false)
      abortRef.current = null
    }
  }, [activeChat, activePrompt, loadChats])

  const stopStream = useCallback(() => {
    abortRef.current?.()
  }, [])

  return (
    <WorkbenchContext.Provider value={{
      chats, activeChat, activePrompt, messages, isStreaming, streamingText, streamingImages,
      loadChats, createChat, openChat, deleteChat,
      setPromptName, setModel, setSystemInstructions, updateSettings, saveAsVersion,
      sendMessage, stopStream,
    }}>
      {children}
    </WorkbenchContext.Provider>
  )
}
