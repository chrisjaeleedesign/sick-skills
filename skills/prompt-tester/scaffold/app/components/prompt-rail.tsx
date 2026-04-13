'use client'

import { useEffect, useState } from 'react'
import { useWorkbench } from '@/app/lib/workbench-context'
import type { PromptVersion } from '@/app/lib/workbench-types'
import { PromptHeader } from './prompt-header'
import { ModelPicker } from './model-picker'
import { SystemInstructionsBlock } from './system-instructions-block'
import { ReferenceAttachmentsBlock } from './reference-attachments-block'
import { SettingsGrid } from './settings-grid'

export function PromptRail() {
  const { activePrompt, setPromptName, setModel, setSystemInstructions, updateSettings, saveAsVersion } = useWorkbench()
  const [versions, setVersions] = useState<PromptVersion[]>([])

  useEffect(() => {
    if (!activePrompt) return
    fetch(`/api/prompts/${activePrompt.id}/versions`)
      .then(r => r.json())
      .then(setVersions)
  }, [activePrompt?.id, activePrompt?.currentVersion])

  if (!activePrompt) {
    return (
      <div className="flex-1 flex items-center justify-center text-[var(--color-text-3)] text-[13px]">
        Select a chat
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <PromptHeader
        prompt={activePrompt}
        versions={versions}
        onNameChange={setPromptName}
        onSave={() => saveAsVersion().then(() => undefined)}
      />
      <div className="flex-1 overflow-y-auto px-4">
        {/* Model */}
        <div className="py-3 border-b border-[var(--color-border)]">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-3)] mb-2">Model</div>
          <ModelPicker value={activePrompt.draft.model} onChange={setModel} />
        </div>

        {/* System instructions */}
        <div className="py-3 border-b border-[var(--color-border)]">
          <SystemInstructionsBlock
            value={activePrompt.draft.systemInstructions}
            onChange={setSystemInstructions}
            promptName={activePrompt.name}
          />
        </div>

        {/* Reference attachments */}
        <div className="py-3 border-b border-[var(--color-border)]">
          <ReferenceAttachmentsBlock />
        </div>

        {/* Settings */}
        <div className="py-3">
          <div className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-3)] mb-3">Settings</div>
          <SettingsGrid
            model={activePrompt.draft.model}
            settings={activePrompt.draft.settings}
            onChange={updateSettings}
          />
        </div>
      </div>
    </div>
  )
}
