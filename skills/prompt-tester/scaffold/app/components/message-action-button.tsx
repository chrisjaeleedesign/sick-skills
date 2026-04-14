import type { ReactNode } from 'react'

interface Props {
  onClick: () => void
  ariaLabel: string
  children: ReactNode
}

/** Hover-revealed icon button rendered in a MessageMeta actions slot. */
export function MessageActionButton({ onClick, ariaLabel, children }: Props) {
  return (
    <button
      onClick={onClick}
      aria-label={ariaLabel}
      className="opacity-0 group-hover:opacity-100 w-6 h-6 flex items-center justify-center rounded text-[var(--color-text-3)] hover:text-[var(--color-text-1)] hover:bg-[var(--color-hover)] transition-all"
    >
      {children}
    </button>
  )
}

const iconProps = {
  width: 12,
  height: 12,
  viewBox: '0 0 24 24',
  fill: 'none',
  stroke: 'currentColor',
  strokeWidth: 2,
  strokeLinecap: 'round',
  strokeLinejoin: 'round',
} as const

export function BranchIcon() {
  return (
    <svg {...iconProps}>
      <line x1="6" y1="3" x2="6" y2="15" />
      <circle cx="18" cy="6" r="3" />
      <circle cx="6" cy="18" r="3" />
      <path d="M18 9a9 9 0 0 1-9 9" />
    </svg>
  )
}

export function RerunIcon() {
  return (
    <svg {...iconProps}>
      <polyline points="23 4 23 10 17 10" />
      <path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10" />
    </svg>
  )
}
