# Agent Conventions

## Commands

- **Dev Server**: `npm run dev` (or `bun dev`)
- **Test**: `npm test` (or `bun test`)
- **Lint**: `npm run lint` (or `bun run lint`)
- **Build**: `npm run build` (or `bun run build`)

## Code Style

- Use TypeScript for all logic.
- Use functional components for React.
- Prefer small, single-purpose components.
- Colocate tests with components if possible, or use `tests/` directory.

## File Structure

- `/src`: Source code
- `/public`: Static assets
- `/tests`: Tests (if not colocated)
- `/SPECS`: Project specifications
