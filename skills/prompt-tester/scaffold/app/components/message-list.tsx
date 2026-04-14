'use client'

import { useEffect, useRef } from 'react'
import type { ChatMessage } from '@/app/lib/workbench-types'
import { UserMessage } from './user-message'
import { AssistantMessage } from './assistant-message'

interface Props {
  messages: ChatMessage[]
  isStreaming: boolean
  streamingText: string
  streamingImages: string[]
  model: string
  onRerun?: (userMsgId: string, text: string) => void
  onBranch?: (messageId: string) => void
}

export function MessageList({ messages, isStreaming, streamingText, streamingImages, model, onRerun, onBranch }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingText, streamingImages.length])

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
      {messages.map((msg, i) => {
        const handleBranch = onBranch ? () => onBranch(msg.id) : undefined
        if (msg.role === 'user') return <UserMessage key={msg.id} message={msg} onBranch={handleBranch} />
        const prev = messages[i - 1]
        const precedingUser = prev && prev.role === 'user' ? prev : null
        const handleRerun = precedingUser && precedingUser.text && onRerun
          ? () => onRerun(precedingUser.id, precedingUser.text!)
          : undefined
        return <AssistantMessage key={msg.id} message={msg} onRerun={handleRerun} onBranch={handleBranch} />
      })}
      {isStreaming && (
        <AssistantMessage
          message={{
            id: 'streaming',
            role: 'assistant',
            timestamp: '',
            promptVersion: 0,
            promptState: {} as never,
            model,
          }}
          streaming
          streamingText={streamingText}
          streamingImages={streamingImages}
        />
      )}
      <div ref={bottomRef} />
    </div>
  )
}
