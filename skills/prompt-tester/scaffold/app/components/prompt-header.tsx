'use client'

import { useState } from 'react'
import type { Prompt, PromptVersion } from '@/app/lib/workbench-types'

interface Props {
  prompt: Prompt
  versions: PromptVersion[]
  onNameChange: (name: string) => void
  onSave: () => Promise<void>
}

export function PromptHeader({ prompt, versions, onNameChange, onSave }: Props) {
  const [saving, setSaving] = useState(false)

  async function handleSave() {
    setSaving(true)
    try { await onSave() } finally { setSaving(false) }
  }

  return (
    <div className="border-b border-[var(--color-border)] px-4 py-3 flex-shrink-0">
      {/* Row 1: name + version */}
      <div className="flex items-center gap-2 mb-1.5">
        <input
          type="text"
          value={prompt.name}
          onChange={e => onNameChange(e.target.value)}
          className="flex-1 bg-transparent border-none outline-none font-semibold text-[14px] tracking-tight text-[var(--color-text-1)] border-b border-transparent hover:border-[var(--color-border-2)] focus:border-[var(--color-fg)] transition-colors pb-px"
          placeholder="Untitled prompt"
        />
        <span className="font-mono text-[11px] border border-[var(--color-border-2)] bg-white px-2 py-0.5 text-[var(--color-text-1)] cursor-pointer hover:bg-[var(--color-hover)] flex-shrink-0">
          {prompt.currentVersion === 0 ? 'draft' : `v${prompt.currentVersion}`} ▼
        </span>
      </div>

      {/* Row 2: status + save */}
      <div className="flex items-center gap-2">
        <span className="font-mono text-[10px] text-[var(--color-text-3)] italic flex-1">
          {prompt.currentVersion === 0 ? 'draft — not yet saved' : 'unsaved changes'}
        </span>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-[var(--color-fg)] text-[var(--color-fg-inv)] font-mono text-[11px] px-3 py-1.5 hover:opacity-90 disabled:opacity-50 flex-shrink-0"
        >
          {saving ? 'saving…' : `Save as v${prompt.currentVersion + 1}`}
        </button>
      </div>

      {/* Version history */}
      {versions.length > 0 && (
        <div className="mt-2.5 pt-2.5 border-t border-[var(--color-border)]">
          {versions.slice(0, 4).map(v => (
            <div key={v.version} className="flex justify-between py-0.5 font-mono text-[11px] text-[var(--color-text-2)] hover:text-[var(--color-text-1)] cursor-pointer">
              <span>v{v.version}</span>
              <span className="text-[var(--color-text-3)]">
                {new Date(v.committed).toLocaleDateString()}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
