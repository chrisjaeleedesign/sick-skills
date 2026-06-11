import { existsSync } from "fs";
import { join } from "path";

// Resolve paths relative to the studio directory.
// process.env.DESIGN_STUDIO_ROOT can override (tests use this to point at a
// throwaway root), otherwise we find the studio root by looking for
// journal.db/manifest.json walking up from cwd.
function findStudioRoot(): string {
  if (process.env.DESIGN_STUDIO_ROOT) return process.env.DESIGN_STUDIO_ROOT;
  const candidates = [
    join(process.cwd(), ".."),           // cwd is .design/studio/
    join(process.cwd(), "../.."),         // cwd is .design/studio/app/
    join(process.cwd(), ".design"),       // cwd is project root
  ];
  for (const dir of candidates) {
    if (existsSync(join(dir, "journal.db")) || existsSync(join(dir, "manifest.json"))) {
      return dir;
    }
  }
  // Fallback: assume cwd is studio
  return join(process.cwd(), "..");
}

export const DESIGN_ROOT = findStudioRoot();
