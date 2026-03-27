"use client";

export function TagPill({ tag }: { tag: string }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] text-text-tertiary">
      {tag}
    </span>
  );
}

export function FamilyBadge({ family }: { family: string }) {
  return (
    <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[10px] font-medium text-text-secondary">
      {family}
    </span>
  );
}

export function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    superseded: "bg-surface-2 text-text-tertiary line-through",
    killed: "bg-red-50 text-red-600",
    final: "bg-zinc-800 text-zinc-100",
  };
  return (
    <span
      className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${styles[status] ?? "bg-surface-2 text-text-tertiary"}`}
    >
      {status}
    </span>
  );
}
