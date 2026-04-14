import type { ChatMessage } from '@/app/lib/workbench-types'
import { MessageMeta } from './message-meta'

export function UserMessage({ message }: { message: ChatMessage }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="max-w-2xl">
      <MessageMeta>
        You <span className="mx-1.5 text-[var(--color-border-2)]">·</span> {time}
      </MessageMeta>
      <div className="text-[14px] text-[var(--color-text-1)] leading-relaxed pl-3 border-l-2 border-[var(--color-fg)]">
        {message.text}
      </div>
    </div>
  )
}
