import type { ReactNode } from 'react'

interface Props {
  children: ReactNode
  /** Rendered on the right side; typically hover-revealed action buttons. */
  actions?: ReactNode
}

export function MessageMeta({ children, actions }: Props) {
  return (
    <div className="font-mono text-[10px] uppercase tracking-wider text-[var(--color-text-3)] mb-1.5 flex items-center gap-2">
      <div className="flex items-center gap-2 flex-1">{children}</div>
      {actions ? <div className="flex items-center gap-1">{actions}</div> : null}
    </div>
  )
}
