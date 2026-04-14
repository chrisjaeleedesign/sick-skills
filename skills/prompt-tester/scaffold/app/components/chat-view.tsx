'use client'

import { useWorkbench } from '@/app/lib/workbench-context'
import { MessageList } from './message-list'
import { Composer } from './composer'

export function ChatView() {
  const { activeChat, activePrompt, messages, isStreaming, streamingText, streamingImages, sendMessage, rerunFromMessage, stopStream } = useWorkbench()

  if (!activeChat) {
    return (
      <div className="flex-1 flex items-center justify-center flex-col gap-4 text-[var(--color-text-3)]">
        <div className="text-[15px]">Select a chat or create a new one</div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-8 py-4 border-b border-[var(--color-border)] flex items-center gap-3 flex-shrink-0">
        <h2 className="text-[15px] font-semibold tracking-tight flex-1">{activeChat.title}</h2>
      </div>

      {/* Messages */}
      <MessageList
        messages={messages}
        isStreaming={isStreaming}
        streamingText={streamingText}
        streamingImages={streamingImages}
        model={activePrompt?.draft.model ?? ''}
        onRerun={rerunFromMessage}
      />

      {/* Composer */}
      <Composer
        onSend={sendMessage}
        isStreaming={isStreaming}
        onStop={stopStream}
      />
    </div>
  )
}
