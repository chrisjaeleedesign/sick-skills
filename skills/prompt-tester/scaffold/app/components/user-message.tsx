import type { ChatMessage } from '@/app/lib/workbench-types'

export function UserMessage({ message }: { message: ChatMessage }) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="max-w-2xl">
      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-3)] mb-1.5">
        You <span className="mx-1.5 text-[var(--color-border-2)]">·</span> {time}
      </div>
      <div className="text-[14px] text-[var(--color-text-1)] leading-relaxed pl-3 border-l-2 border-[var(--color-fg)]">
        {message.text}
      </div>
    </div>
  )
}
