"use client";

export default function ExamplePrototype() {
  return (
    <div className="flex w-full h-full items-center justify-center bg-background p-8">
      <div className="w-full max-w-md rounded-xl border border-border bg-card p-8 shadow-sm">
        <div className="mb-6 flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-primary" />
          <div>
            <h1 className="text-lg font-semibold text-text-primary">
              Example Prototype
            </h1>
            <p className="text-xs text-text-tertiary">
              Design Studio scaffold
            </p>
          </div>
        </div>

        <p className="mb-6 text-sm leading-relaxed text-text-secondary">
          This is a placeholder prototype. Replace it with your own design, or
          use <code className="rounded bg-surface-2 px-1.5 py-0.5 text-xs font-mono text-text-primary">/design-studio</code> to
          create new concepts from a description.
        </p>

        <div className="grid grid-cols-3 gap-3">
          {["surface-0", "surface-1", "surface-2"].map((surface) => (
            <div
              key={surface}
              className={`rounded-lg bg-${surface} border border-border p-3 text-center`}
            >
              <span className="text-[10px] font-mono text-text-tertiary">
                {surface}
              </span>
            </div>
          ))}
        </div>

        <div className="mt-6 flex gap-2">
          <div className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-white">
            Primary
          </div>
          <div className="rounded-md bg-accent-blue/10 px-3 py-1.5 text-xs font-medium text-accent-blue">
            Accent
          </div>
          <div className="rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary">
            Neutral
          </div>
        </div>
      </div>
    </div>
  );
}
