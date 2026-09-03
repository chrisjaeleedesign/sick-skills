# Technical Foundation

Use these defaults only for new code repositories or repositories explicitly intended to gain code. They are a known starting point, not a migration mandate. An existing working stack and its repository conventions take precedence unless the user explicitly requests migration.

## Defaults and Rationale

- **TypeScript** for the primary application language: one typed language across client, server, tooling, and shared contracts.
- **Bun** for the runtime and package manager: one tool for installs, scripts, tests, and common TypeScript execution.
- **Turborepo from project creation**: the repository starts with an explicit app/package boundary and one task graph instead of being reorganized later.
- **React** for user interfaces.
- **Vite** for straightforward client applications. Use **Next.js** when routing, server rendering, content, or full-stack behavior materially justifies it.
- **Railway** for deployment, **PostgreSQL** for durable hosted data, **R2** for durable objects, and **Better Auth** when accounts or sessions are required.

Do not add a database, object storage, auth, shared package, or extra application until the product actually needs it.

## Canonical Repository Shape

```text
apps/
  <application>/
packages/
  <shared-package>/
package.json
bun.lock
bunfig.toml
turbo.json
```

The root `package.json` is private and declares Bun workspaces for `apps/*` and `packages/*`. Use Bun's isolated installer in `bunfig.toml`. Internal dependencies use `workspace:*`. Put deployable applications under `apps/`; create a package under `packages/` only for genuinely shared code or configuration.

Record only commands that exist and work in the repository. Do not invent a standard check command in `AGENTS.md`.

## Clean AGENTS.md Examples

For a new code-oriented repository:

```markdown
## Technical Foundation

- Use TypeScript and Bun in a Turborepo monorepo.
- Keep deployable applications in `apps/*` and shared packages in `packages/*`.
- Use Bun workspaces with isolated installs and `workspace:*` for internal dependencies.
- Use React with Vite for a straightforward client application; use Next.js only when routing, SSR, content, or full-stack behavior requires it.
- Deploy on Railway. Use PostgreSQL for durable hosted data, R2 for durable objects, and Better Auth only when accounts are required.
```

For an existing repository with a different working foundation:

```markdown
## Technical Foundation

- Preserve the existing Python and Poetry project structure.
- Use the commands already defined in `pyproject.toml`; do not introduce Bun or Turborepo without an approved migration.
```
