export function WorkbenchShell({
  sidebar,
  main,
  rail,
}: {
  sidebar: React.ReactNode
  main: React.ReactNode
  rail: React.ReactNode
}) {
  return (
    <div className="flex h-screen overflow-hidden bg-[var(--color-bg)]">
      <div className="w-[220px] flex-shrink-0 border-r border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
        {sidebar}
      </div>
      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        {main}
      </div>
      <div className="w-[300px] flex-shrink-0 border-l border-[var(--color-border)] bg-[var(--color-surface)] flex flex-col overflow-hidden">
        {rail}
      </div>
    </div>
  )
}
