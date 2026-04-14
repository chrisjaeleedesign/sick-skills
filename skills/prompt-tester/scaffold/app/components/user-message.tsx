import type { ChatMessage } from '@/app/lib/workbench-types'
import { MessageMeta } from './message-meta'

interface Props {
  message: ChatMessage
  onBranch?: () => void
}

export function UserMessage({ message, onBranch }: Props) {
  const time = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  return (
    <div className="group max-w-2xl">
      <MessageMeta
        actions={
          onBranch ? (
            <button
              onClick={onBranch}
              aria-label="Branch conversation from this message"
              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-3)] hover:text-[var(--color-text-1)] hover:bg-[var(--color-hover)] transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="6" y1="3" x2="6" y2="15" />
                <circle cx="18" cy="6" r="3" />
                <circle cx="6" cy="18" r="3" />
                <path d="M18 9a9 9 0 0 1-9 9" />
              </svg>
            </button>
          ) : null
        }
      >
        You <span className="mx-1.5 text-[var(--color-border-2)]">·</span> {time}
      </MessageMeta>
      <div className="text-[14px] text-[var(--color-text-1)] leading-relaxed pl-3 border-l-2 border-[var(--color-fg)]">
        {message.text}
      </div>
    </div>
  )
}
