export function ReferenceAttachmentsBlock() {
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-mono text-[10px] uppercase tracking-widest text-[var(--color-text-3)]">
          Reference attachments
        </span>
        <span className="font-mono text-[10px] italic text-[var(--color-text-3)]">always attached</span>
      </div>
      <div className="border border-dashed border-[var(--color-border-2)] p-3 text-center text-[11px] font-mono text-[var(--color-text-3)]">
        + drop files here
        <div className="text-[10px] mt-1 text-[var(--color-text-3)]">(image upload in M3)</div>
      </div>
    </div>
  )
}
