import type { ChatMessage } from '@/app/lib/workbench-types'
import { TextOutput } from './text-output'

interface Props {
  message: ChatMessage
  streaming?: boolean
  streamingText?: string
}

export function AssistantMessage({ message, streaming, streamingText }: Props) {
  const content = streaming ? streamingText ?? '' : (message.outputText ?? '')
  const model = message.model
  const version = message.promptVersion > 0 ? `v${message.promptVersion}` : 'draft'
  const duration = message.duration ? `${(message.duration / 1000).toFixed(1)}s` : null

  return (
    <div className="max-w-2xl">
      <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-3)] mb-1.5 flex items-center gap-2">
        <span>{model}</span>
        <span className="text-[var(--color-border-2)]">·</span>
        <span>{version}</span>
        {streaming ? (
          <span className="flex gap-1 ml-1">
            {[0, 1, 2].map(i => (
              <span
                key={i}
                className="w-1 h-1 bg-[var(--color-text-3)] rounded-full animate-bounce"
                style={{ animationDelay: `${i * 0.15}s` }}
              />
            ))}
          </span>
        ) : duration ? (
          <>
            <span className="text-[var(--color-border-2)]">·</span>
            <span>{duration}</span>
          </>
        ) : null}
      </div>
      {content ? (
        <TextOutput content={content} />
      ) : message.outputError ? (
        <div className="text-[13px] text-red-500">{message.outputError}</div>
      ) : null}
    </div>
  )
}
