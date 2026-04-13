'use client'

import { createContext, useContext, useState, useCallback, useRef } from 'react'
import type {
  Chat, ChatSummary, Prompt, PromptVersion,
  ChatMessage, Settings,
} from './workbench-types'

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
    const res = await fetch('/api/chats')
    setChats(await res.json())
  }, [])

  const createChat = useCallback(async (title?: string) => {
    const res = await fetch('/api/chats', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title ?? 'New chat' }),
    })
    const chat: Chat = await res.json()
    await loadChats()
    return chat
  }, [loadChats])

  const openChat = useCallback(async (id: string) => {
    const [chatRes, msgsRes] = await Promise.all([
      fetch(`/api/chats/${id}`),
      fetch(`/api/chats/${id}/messages`),
    ])
    const chat: Chat = await chatRes.json()
    const msgs: ChatMessage[] = await msgsRes.json()
    const promptRes = await fetch(`/api/prompts/${chat.promptId}`)
    const prompt: Prompt = await promptRes.json()

    setActiveChat(chat)
    setActivePrompt(prompt)
    setMessages(msgs)
  }, [])

  const deleteChat = useCallback(async (id: string) => {
    await fetch(`/api/chats/${id}`, { method: 'DELETE' })
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
      await fetch(`/api/prompts/${prompt.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: prompt.name, draft: prompt.draft }),
      })
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
    const res = await fetch(`/api/prompts/${activePrompt.id}/versions`, { method: 'POST' })
    const version: PromptVersion = await res.json()
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
              const msgsRes = await fetch(`/api/chats/${activeChat.id}/messages`)
              setMessages(await msgsRes.json())
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
