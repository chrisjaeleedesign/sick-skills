import { defineConfig } from "vitest/config";
import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

// CRITICAL: the db test suites DELETE all rows in beforeEach. Point them at a
// throwaway design root so they can never touch the real journal.db.
// (db.ts resolves DESIGN_ROOT from this env var before falling back to cwd —
// without it, `bun run test` wipes the user's journal. This happened.)
const testRoot = mkdtempSync(join(tmpdir(), "design-studio-test-"));

export default defineConfig({
  test: {
    fileParallelism: false,
    env: {
      DESIGN_STUDIO_ROOT: testRoot,
    },
  },
});
