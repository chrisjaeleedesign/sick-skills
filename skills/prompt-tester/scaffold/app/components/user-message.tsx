import type { ChatMessage } from '@/app/lib/workbench-types'
import { BranchIcon, MessageActionButton } from './message-action-button'
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
            <MessageActionButton onClick={onBranch} ariaLabel="Branch conversation from this message">
              <BranchIcon />
            </MessageActionButton>
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
