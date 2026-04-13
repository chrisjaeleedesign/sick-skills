'use client'

import { useState } from 'react'
import { SystemInstructionsModal } from './system-instructions-modal'

interface Props {
  value: string
  onChange: (v: string) => void
  promptName: string
}

export function SystemInstructionsBlock({ value, onChange, promptName }: Props) {
  const [modalOpen, setModalOpen] = useState(false)

  return (
    <>
      <div>
        <div className="flex items-center justify-between mb-2">
          <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-3)]">
            System instructions
          </span>
          <button
            onClick={() => setModalOpen(true)}
            className="text-[var(--color-text-3)] hover:text-[var(--color-text-1)] text-[13px] px-1"
            title="Expand editor"
          >↗</button>
        </div>
        <div
          onClick={() => setModalOpen(true)}
          className="bg-white border border-[var(--color-border-2)] p-2.5 text-[12px] leading-snug text-[var(--color-text-1)] min-h-[68px] max-h-[84px] overflow-hidden relative cursor-text"
          style={{ maskImage: 'linear-gradient(to bottom, black 60%, transparent 100%)' }}
        >
          {value || <span className="text-[var(--color-text-3)]">Click to add system instructions…</span>}
        </div>
      </div>

      {modalOpen && (
        <SystemInstructionsModal
          value={value}
          onChange={onChange}
          promptName={promptName}
          onClose={() => setModalOpen(false)}
        />
      )}
    </>
  )
}
