# Prototype Subagent Requirements

These requirements apply to all prototype generation (CREATE and ITERATE).

> - Plain React component with a default export (no Next.js — prototypes are compiled to static bundles)
> - Self-contained — all data inline, realistic content (no lorem ipsum)
> - Imports allowed: `react`, `lucide-react` only (no `next/*` — Next is not installed and the build will fail)
> - Use CSS variable tokens from the design system (e.g., `bg-surface-1`, `text-text-primary`, `border-border`)
> - **Sizing: The prototype renders inside a scaled 1440×900 container. Root element MUST use `w-full h-full` — NEVER use viewport units (`100vh`, `h-screen`, `100dvh`, `100vw`, `min-h-screen`). Use `flex-1 overflow-y-auto` for scrollable regions.**
> - Do NOT include a back-to-gallery link — the parent layout provides navigation
> - Full interactivity: hover states, toggles, animations where appropriate
> - Target 500-800 lines, rich and complete
