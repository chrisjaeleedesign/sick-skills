interface SegmentedControlProps<T extends string | number> {
  options: { label: string; value: T }[]
  value: T
  onChange: (v: T) => void
}

export function SegmentedControl<T extends string | number>({ options, value, onChange }: SegmentedControlProps<T>) {
  return (
    <div className="flex border border-[var(--color-border-2)]">
      {options.map(opt => (
        <button
          key={String(opt.value)}
          onClick={() => onChange(opt.value)}
          className={`flex-1 py-1.5 text-[11px] font-mono text-center border-r border-[var(--color-border)] last:border-r-0 ${
            opt.value === value
              ? 'bg-[var(--color-fg)] text-[var(--color-fg-inv)]'
              : 'text-[var(--color-text-2)] hover:bg-[var(--color-hover)]'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
