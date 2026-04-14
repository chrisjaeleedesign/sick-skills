'use client'

import type { ChatMessage } from '@/app/lib/workbench-types'
import { MessageMeta } from './message-meta'
import { TextOutput } from './text-output'

interface Props {
  message: ChatMessage
  streaming?: boolean
  streamingText?: string
  streamingImages?: string[]
  onRerun?: () => void
}

export function AssistantMessage({ message, streaming, streamingText, streamingImages, onRerun }: Props) {
  const content = streaming ? streamingText ?? '' : (message.outputText ?? '')
  const images = streaming
    ? (streamingImages ?? [])
    : (message.outputImages?.map(img => `/api/images?file=${img.path}`) ?? [])
  const model = message.model
  const version = message.promptVersion > 0 ? `v${message.promptVersion}` : 'draft'
  const duration = message.duration ? `${(message.duration / 1000).toFixed(1)}s` : null

  return (
    <div className="group max-w-2xl">
      <MessageMeta
        actions={
          onRerun && !streaming ? (
            <button
              onClick={onRerun}
              aria-label="Rerun this response"
              className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-3)] hover:text-[var(--color-text-1)] hover:bg-[var(--color-hover)] transition-all"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="23 4 23 10 17 10" />
                <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
              </svg>
            </button>
          ) : null
        }
      >
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
      </MessageMeta>
      {content ? (
        <TextOutput content={content} />
      ) : message.outputError ? (
        <div className="text-[13px] text-[var(--color-error)]">{message.outputError}</div>
      ) : null}
      {images.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {images.map((url, i) => (
            <img
              key={i}
              src={url}
              alt={`Generated image ${i + 1}`}
              className="max-w-sm rounded border border-[var(--color-border)] cursor-pointer"
              onClick={() => window.open(url, '_blank')}
            />
          ))}
        </div>
      )}
    </div>
  )
}
