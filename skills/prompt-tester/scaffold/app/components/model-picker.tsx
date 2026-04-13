'use client'

import { MODELS } from '@/app/lib/models'

export function ModelPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const imageModels = MODELS.filter(m => m.type === 'image')
  const textModels = MODELS.filter(m => m.type === 'text')
  const selected = MODELS.find(m => m.alias === value)

  return (
    <div>
      <select
        value={value}
        onChange={e => onChange(e.target.value)}
        className="w-full border border-[var(--color-border-2)] bg-white px-2 py-2 text-[11px] font-mono text-[var(--color-text-1)] appearance-none cursor-pointer"
        style={{ backgroundImage: "url(\"data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1L5 5L9 1' stroke='%23525252' stroke-width='1.5'/%3E%3C/svg%3E\")", backgroundRepeat: 'no-repeat', backgroundPosition: 'right 10px center' }}
      >
        <optgroup label="Image">
          {imageModels.map(m => <option key={m.alias} value={m.alias}>{m.alias}</option>)}
        </optgroup>
        <optgroup label="Text">
          {textModels.map(m => <option key={m.alias} value={m.alias}>{m.alias}</option>)}
        </optgroup>
      </select>
      {selected && (
        <div className="text-[10px] font-mono text-[var(--color-text-3)] mt-1">{selected.fullId}</div>
      )}
    </div>
  )
}
