'use client'

import { useState, useCallback } from 'react'

interface Props {
  onSend: (text: string) => void
  isStreaming: boolean
  onStop: () => void
}

export function Composer({ onSend, isStreaming, onStop }: Props) {
  const [text, setText] = useState('')

  const handleSend = useCallback(() => {
    const t = text.trim()
    if (!t || isStreaming) return
    onSend(t)
    setText('')
  }, [text, isStreaming, onSend])

  return (
    <div className="mx-8 mb-6 border border-[var(--color-border-2)]">
      <textarea
        value={text}
        onChange={e => setText(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            e.preventDefault()
            handleSend()
          }
        }}
        placeholder="Type a message…"
        rows={2}
        className="w-full border-none outline-none px-4 pt-3 pb-2 font-sans text-[14px] text-[var(--color-text-1)] placeholder:text-[var(--color-text-3)] resize-none"
      />
      <div className="flex items-center px-3 pb-3 gap-2">
        <button className="text-[var(--color-text-3)] text-[13px] px-2 py-1 hover:text-[var(--color-text-1)]">
          📎 attach
        </button>
        {isStreaming ? (
          <button
            onClick={onStop}
            className="ml-auto border border-[var(--color-border-2)] text-[var(--color-text-2)] text-[12px] font-medium px-4 py-2 hover:bg-[var(--color-hover)]"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={handleSend}
            disabled={!text.trim()}
            className="ml-auto bg-[var(--color-fg)] text-[var(--color-fg-inv)] text-[12px] font-medium px-4 py-2 hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
          >
            Run
            <span className="font-mono text-[10px] opacity-60">⌘⏎</span>
          </button>
        )}
      </div>
    </div>
  )
}
