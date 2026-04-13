'use client'

import type { Settings } from '@/app/lib/workbench-types'
import { isImageModel } from '@/app/lib/models'
import { SegmentedControl } from './segmented-control'

interface Props {
  model: string
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
}

const THINKING_OPTIONS = [
  { label: 'none', value: 'none' as const },
  { label: 'low', value: 'low' as const },
  { label: 'med', value: 'medium' as const },
  { label: 'high', value: 'high' as const },
]

const ASPECT_OPTIONS = [
  { label: '1:1', value: '1:1' as const },
  { label: '3:4', value: '3:4' as const },
  { label: '16:9', value: '16:9' as const },
  { label: '9:16', value: '9:16' as const },
]

const VARIATIONS_OPTIONS = [
  { label: '1', value: 1 as const },
  { label: '2', value: 2 as const },
  { label: '4', value: 4 as const },
  { label: '8', value: 8 as const },
]

export function SettingsGrid({ model, settings, onChange }: Props) {
  const isImage = isImageModel(model)

  return (
    <div className="flex flex-col gap-3">
      {/* Temperature */}
      <div>
        <div className="flex justify-between mb-1">
          <span className="font-mono text-[11px] text-[var(--color-text-2)]">Temperature</span>
          <span className="font-mono text-[11px] text-[var(--color-text-1)]">{settings.temperature.toFixed(1)}</span>
        </div>
        <input
          type="range" min={0} max={2} step={0.1}
          value={settings.temperature}
          onChange={e => onChange({ temperature: parseFloat(e.target.value) })}
          className="w-full h-[2px] accent-black cursor-pointer"
        />
      </div>

      {/* Thinking */}
      <div>
        <div className="font-mono text-[11px] text-[var(--color-text-2)] mb-1.5">Thinking</div>
        <SegmentedControl
          options={THINKING_OPTIONS}
          value={settings.thinking}
          onChange={v => onChange({ thinking: v })}
        />
      </div>

      {/* Image-only: Aspect ratio */}
      {isImage && (
        <div>
          <div className="font-mono text-[11px] text-[var(--color-text-2)] mb-1.5">Aspect</div>
          <SegmentedControl
            options={ASPECT_OPTIONS}
            value={settings.aspectRatio ?? '1:1'}
            onChange={v => onChange({ aspectRatio: v })}
          />
        </div>
      )}

      {/* Image-only: Variations */}
      {isImage && (
        <div>
          <div className="font-mono text-[11px] text-[var(--color-text-2)] mb-1.5">Variations</div>
          <SegmentedControl
            options={VARIATIONS_OPTIONS}
            value={settings.variations ?? 4}
            onChange={v => onChange({ variations: v })}
          />
        </div>
      )}
    </div>
  )
}
