'use client'

interface Props {
  value: string
  onChange: (v: string) => void
  promptName: string
  onClose: () => void
}

export function SystemInstructionsModal({ value, onChange, promptName, onClose }: Props) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <div className="bg-white border border-[var(--color-border-2)] w-[580px] max-w-[90vw] flex flex-col max-h-[80vh]">
        <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--color-border)]">
          <span className="font-mono text-[11px] uppercase tracking-widest text-[var(--color-text-3)]">
            System instructions — {promptName}
          </span>
          <button onClick={onClose} className="text-[var(--color-text-3)] hover:text-[var(--color-text-1)] text-lg leading-none">×</button>
        </div>
        <textarea
          autoFocus
          value={value}
          onChange={e => onChange(e.target.value)}
          className="flex-1 w-full border-none outline-none p-5 font-sans text-[14px] leading-relaxed text-[var(--color-text-1)] resize-none min-h-[340px]"
          placeholder="Describe how the model should behave, what it should know, and what format it should use. Markdown is supported."
        />
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--color-border)]">
          <span className="font-mono text-[11px] text-[var(--color-text-3)] italic">Markdown supported</span>
          <button
            onClick={onClose}
            className="bg-[var(--color-fg)] text-[var(--color-fg-inv)] px-4 py-1.5 text-[12px] font-medium"
          >
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
