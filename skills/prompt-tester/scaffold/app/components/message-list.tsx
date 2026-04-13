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
}

export function MessageList({ messages, isStreaming, streamingText, streamingImages, model }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages.length, streamingText, streamingImages.length])

  return (
    <div className="flex-1 overflow-y-auto px-8 py-6 flex flex-col gap-6">
      {messages.map(msg =>
        msg.role === 'user'
          ? <UserMessage key={msg.id} message={msg} />
          : <AssistantMessage key={msg.id} message={msg} />
      )}
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
