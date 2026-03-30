#!/usr/bin/env bash
set -euo pipefail

# ---------------------------------------------------------------------------
# sync-studio.sh — bidirectional sync between .design/studio/ and scaffold
#
# Usage:
#   sync-studio.sh push [--apply] [--no-backup] [--scaffold-path PATH]
#   sync-studio.sh pull [--apply] [--no-backup] [--scaffold-path PATH]
#
# Default is dry-run. Pass --apply to actually sync.
# ---------------------------------------------------------------------------

MODE="${1:-}"
APPLY=false
NO_BACKUP=false
SCAFFOLD_PATH=""

shift || true
while [[ $# -gt 0 ]]; do
  case "$1" in
    --apply) APPLY=true ;;
    --no-backup) NO_BACKUP=true ;;
    --scaffold-path) SCAFFOLD_PATH="$2"; shift ;;
    --dry-run) APPLY=false ;;  # explicit dry-run (already default)
    *) echo "Unknown option: $1"; exit 1 ;;
  esac
  shift
done

if [[ -z "$MODE" ]] || [[ "$MODE" != "push" && "$MODE" != "pull" ]]; then
  echo "Usage: sync-studio.sh <push|pull> [--apply] [--no-backup] [--scaffold-path PATH]"
  exit 1
fi

# ---------------------------------------------------------------------------
# Resolve paths
# ---------------------------------------------------------------------------

# Studio path: directory containing this script's parent
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
STUDIO_PATH="$(cd "$SCRIPT_DIR/.." && pwd)"

# Scaffold path resolution
if [[ -z "$SCAFFOLD_PATH" ]]; then
  SKILL_LINK="$HOME/.claude/skills/design-studio"
  if [[ -L "$SKILL_LINK" ]]; then
    SKILL_DIR="$(readlink "$SKILL_LINK")"
    SCAFFOLD_PATH="$SKILL_DIR/scaffold/studio"
  else
    echo "Error: Cannot resolve scaffold path."
    echo "Either pass --scaffold-path or ensure ~/.claude/skills/design-studio symlink exists."
    exit 1
  fi
fi

if [[ ! -d "$SCAFFOLD_PATH" ]]; then
  echo "Error: Scaffold directory not found at $SCAFFOLD_PATH"
  exit 1
fi

echo "Studio:   $STUDIO_PATH"
echo "Scaffold: $SCAFFOLD_PATH"
echo "Mode:     $MODE"
echo "Apply:    $APPLY"
echo ""

# ---------------------------------------------------------------------------
# Exclusion list
# ---------------------------------------------------------------------------

RSYNC_EXCLUDES=(
  # Prototypes: only sync layout.tsx, skip everything else (both directions)
  --include='app/prototypes/'
  --include='app/prototypes/layout.tsx'
  --exclude='app/prototypes/**'
  # Build artifacts and dependencies
  --exclude='.next/'
  --exclude='node_modules/'
  --exclude='bun.lock'
  --exclude='package-lock.json'
  # SQLite artifacts that may be in studio dir
  --exclude='*.db'
  --exclude='*.db-shm'
  --exclude='*.db-wal'
  # Nested .design artifacts (shouldn't exist but guard against it)
  --exclude='.design/'
  # Generated thumbnails
  --exclude='public/thumbs/'
  # TypeScript build info
  --exclude='tsconfig.tsbuildinfo'
)

# ---------------------------------------------------------------------------
# Validate exclusions catch prototypes
# ---------------------------------------------------------------------------

validate_exclusions() {
  local proto_dir="$STUDIO_PATH/app/prototypes"
  if [[ -d "$proto_dir" ]]; then
    local proto_count
    proto_count=$(find "$proto_dir" -mindepth 1 -maxdepth 1 -type d ! -name "example-dashboard" | wc -l | tr -d ' ')
    if [[ "$proto_count" -gt 0 ]]; then
      echo "✓ Exclusion check: $proto_count prototype directories will be skipped"
    fi
  fi

  # Verify layout.tsx exists and will be included
  if [[ -f "$proto_dir/layout.tsx" ]]; then
    echo "✓ Inclusion check: prototypes/layout.tsx will be synced"
  fi
}

# ---------------------------------------------------------------------------
# Backup
# ---------------------------------------------------------------------------

create_backup() {
  local target="$1"
  local backup_dir="$(dirname "$target")/.sync-backups"

  if [[ "$NO_BACKUP" == "true" ]]; then
    echo "Skipping backup (--no-backup)"
    return
  fi

  mkdir -p "$backup_dir"
  local timestamp
  timestamp=$(date +%Y%m%d-%H%M%S)
  local backup_path="$backup_dir/$(basename "$target")-$timestamp"

  echo "Creating backup at $backup_path ..."
  cp -r "$target" "$backup_path"

  # Clean old backups (keep last 5)
  local count
  count=$(ls -d "$backup_dir"/$(basename "$target")-* 2>/dev/null | wc -l | tr -d ' ')
  if [[ "$count" -gt 5 ]]; then
    ls -dt "$backup_dir"/$(basename "$target")-* | tail -n +6 | xargs rm -rf
    echo "Cleaned old backups (kept last 5)"
  fi
}

# ---------------------------------------------------------------------------
# Sync
# ---------------------------------------------------------------------------

if [[ "$MODE" == "push" ]]; then
  SRC="$STUDIO_PATH/"
  DST="$SCAFFOLD_PATH/"
  echo "=== PUSH: studio → scaffold ==="
elif [[ "$MODE" == "pull" ]]; then
  SRC="$SCAFFOLD_PATH/"
  DST="$STUDIO_PATH/"
  echo "=== PULL: scaffold → studio ==="
fi

validate_exclusions

echo ""

if [[ "$APPLY" == "true" ]]; then
  # Create backup of destination
  create_backup "$(echo "$DST" | sed 's/\/$//')"

  echo ""
  echo "Syncing..."
  rsync -av --delete "${RSYNC_EXCLUDES[@]}" "$SRC" "$DST"

  echo ""
  echo "✓ Sync complete."

  # Post-pull: install deps and run migrations
  if [[ "$MODE" == "pull" ]]; then
    echo ""
    echo "Running bun install..."
    cd "$STUDIO_PATH" && bun install --silent 2>/dev/null || bun install
    echo ""
    echo "Running migrations..."
    cd "$STUDIO_PATH" && bun run scripts/migrate.ts 2>/dev/null || echo "(no migrations to run)"
  fi

  # Post-push: remind to commit
  if [[ "$MODE" == "push" ]]; then
    SKILL_DIR="$(dirname "$(dirname "$SCAFFOLD_PATH")")"
    echo ""
    echo "Scaffold updated. To save:"
    echo "  cd $SKILL_DIR && git add -A && git commit -m 'sync: update design-studio scaffold'"
  fi
else
  echo "DRY RUN — showing what would change:"
  echo ""
  rsync -avn --delete "${RSYNC_EXCLUDES[@]}" "$SRC" "$DST"
  echo ""
  echo "Pass --apply to execute this sync."
fi
