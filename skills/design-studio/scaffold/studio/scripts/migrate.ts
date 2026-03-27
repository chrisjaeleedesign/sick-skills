/**
 * migrate.ts — Run pending database migrations
 *
 * Simply initializes the database, which triggers runMigrations() in getDb().
 * Can also show migration status.
 *
 * Usage:
 *   bun run scripts/migrate.ts           # run pending migrations
 *   bun run scripts/migrate.ts --status  # show applied/pending count
 */

import Database from "better-sqlite3";
import { join } from "path";
import { existsSync } from "fs";

const DB_PATH = join(import.meta.dirname, "../../journal.db");

if (process.argv.includes("--status")) {
  if (!existsSync(DB_PATH)) {
    console.log("No database found at", DB_PATH);
    process.exit(0);
  }
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  try {
    const rows = db.prepare("SELECT id, name, applied_at FROM _migrations ORDER BY id").all() as {
      id: number;
      name: string;
      applied_at: string;
    }[];
    if (rows.length === 0) {
      console.log("No migrations applied yet.");
    } else {
      console.log(`${rows.length} migration(s) applied:`);
      for (const r of rows) {
        console.log(`  ${r.id}. ${r.name} (${r.applied_at})`);
      }
    }
  } catch {
    console.log("No _migrations table yet (database not initialized).");
  }
  db.close();
} else {
  // Importing getDb triggers schema init + migrations
  const { getDb } = await import("../app/lib/db");
  const db = getDb();
  console.log("✓ Database initialized and migrations applied.");

  // Show status
  const rows = db.prepare("SELECT COUNT(*) as n FROM _migrations").get() as { n: number };
  console.log(`  ${rows.n} migration(s) recorded.`);
}
