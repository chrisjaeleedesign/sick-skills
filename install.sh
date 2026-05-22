#!/usr/bin/env bash
set -euo pipefail

# install.sh — Symlink skills in this repo into one or more agent skill directories.
#
# Usage:
#   bash install.sh                              # install into default targets
#   bash install.sh --target /path/to/skills     # override; repeatable
#   SKILLS_TARGETS=path1:path2 bash install.sh   # override via env var
#   bash install.sh --help
#
# Default targets: ~/.claude/skills and ~/.codex/skills
# Any agent that follows the <skill-name>/SKILL.md convention can be added.
#
# Per target, this script:
#   1. Resolves the target to its real path (handles e.g. ~/.claude → ~/.agents)
#   2. Skips the target if its parent agent dir is missing
#   3. Loops over every subdirectory in skills/ that contains a SKILL.md
#   4. Per skill: backs up real dirs, repoints stale symlinks, skips correct ones
#   5. Verifies each symlink by checking SKILL.md is readable through it
#   6. Prunes orphan symlinks that point into this repo but no longer have a source

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_SRC="$REPO_DIR/skills"

DEFAULT_TARGETS=(
    "$HOME/.claude/skills"
    "$HOME/.codex/skills"
)

print_help() {
    cat <<EOF
install.sh — Symlink sick-skills into agent skill directories.

Usage:
  bash install.sh
  bash install.sh --target <dir> [--target <dir> ...]
  SKILLS_TARGETS="dir1:dir2" bash install.sh
  bash install.sh --help

Default targets:
$(printf '  %s\n' "${DEFAULT_TARGETS[@]}")

Source: $SKILLS_SRC
EOF
}

# --- Parse CLI flags ---
cli_targets=()
while [ $# -gt 0 ]; do
    case "$1" in
        --target)
            [ $# -ge 2 ] || { echo "error: --target requires a path" >&2; exit 2; }
            cli_targets+=("$2")
            shift 2
            ;;
        --help|-h)
            print_help
            exit 0
            ;;
        *)
            echo "error: unknown argument: $1" >&2
            print_help >&2
            exit 2
            ;;
    esac
done

# --- Resolve effective target list ---
# Priority: CLI flags > SKILLS_TARGETS env > defaults.
targets=()
if [ ${#cli_targets[@]} -gt 0 ]; then
    targets=("${cli_targets[@]}")
elif [ -n "${SKILLS_TARGETS:-}" ]; then
    IFS=':' read -r -a targets <<< "$SKILLS_TARGETS"
else
    targets=("${DEFAULT_TARGETS[@]}")
fi

echo "Repo skills:    $SKILLS_SRC"
echo "Targets (${#targets[@]}):"
for t in "${targets[@]}"; do echo "  - $t"; done
echo ""

# --- Per-target install function ---
# Sets globals: t_installed, t_skipped, t_backed_up, t_pruned, t_errors
install_into() {
    local raw_target="$1"
    local parent
    parent="$(dirname "$raw_target")"

    t_installed=0
    t_skipped=0
    t_backed_up=0
    t_pruned=0
    t_errors=0

    if [ ! -d "$parent" ]; then
        echo "↷ $raw_target — skipping (agent not installed: $parent missing)"
        return 0
    fi

    mkdir -p "$raw_target"
    local target_dir
    target_dir="$(readlink -f "$raw_target")"

    echo "── Installing into: $target_dir"

    # Build set of valid source skill names (those with SKILL.md)
    local valid_names=()
    local skill_dir skill_name
    for skill_dir in "$SKILLS_SRC"/*/; do
        [ -d "$skill_dir" ] || continue
        skill_name="$(basename "$skill_dir")"
        if [ ! -f "$skill_dir/SKILL.md" ]; then
            echo "  ⤳ $skill_name — skipping (no SKILL.md)"
            continue
        fi
        valid_names+=("$skill_name")

        local target source current expected
        target="$target_dir/$skill_name"
        source="$SKILLS_SRC/$skill_name"

        # Case 1: Already a symlink
        if [ -L "$target" ]; then
            current="$(readlink -f "$target" || true)"
            expected="$(readlink -f "$source")"
            if [ "$current" = "$expected" ]; then
                echo "  ✓ $skill_name — already linked"
                t_skipped=$((t_skipped + 1))
                continue
            else
                echo "  ↻ $skill_name — repointing symlink (was → ${current:-<broken>})"
                rm "$target"
            fi
        # Case 2: Real directory — back up before replacing
        elif [ -d "$target" ]; then
            echo "  ⤴ $skill_name — backing up existing dir to ${skill_name}.bak"
            mv "$target" "${target}.bak"
            t_backed_up=$((t_backed_up + 1))
        # Case 3: Something else (regular file, etc.)
        elif [ -e "$target" ]; then
            echo "  ✗ $skill_name — removing stale entry"
            rm "$target"
        fi

        ln -s "$source" "$target"

        if [ -r "$target/SKILL.md" ]; then
            echo "  ✓ $skill_name — installed and verified"
            t_installed=$((t_installed + 1))
        else
            echo "  ⚠ $skill_name — symlink created but SKILL.md not readable!"
            t_errors=$((t_errors + 1))
        fi
    done

    # --- Orphan-prune: remove symlinks that look like sick-skills entries with no current source ---
    # Matches links whose target path contains "/sick-skills/skills/" (catches both the
    # current location and any prior location the user moved the repo from).
    local entry entry_name link_target
    for entry in "$target_dir"/*; do
        [ -L "$entry" ] || continue
        entry_name="$(basename "$entry")"
        link_target="$(readlink "$entry")"

        # Only consider links that look like sick-skills/skills/<name>
        case "$link_target" in
            */sick-skills/skills/*) ;;
            *) continue ;;
        esac

        # Is this entry's name still a valid source skill?
        local is_valid=0
        local v
        for v in "${valid_names[@]:-}"; do
            [ "$v" = "$entry_name" ] && { is_valid=1; break; }
        done
        if [ $is_valid -eq 0 ]; then
            echo "  ✂ $entry_name — pruning orphan symlink (was → $link_target)"
            rm "$entry"
            t_pruned=$((t_pruned + 1))
        fi
    done

    echo "  → $t_installed installed, $t_skipped already correct, $t_backed_up backed up, $t_pruned pruned, $t_errors errors"

    if [ $t_backed_up -gt 0 ]; then
        echo "    Backups in $target_dir:"
        for bak in "$target_dir"/*.bak; do
            [ -d "$bak" ] && echo "      $(basename "$bak")"
        done
        echo "    To remove after verifying: rm -rf $target_dir/*.bak"
    fi
}

# --- Run install for each target, accumulate totals ---
total_installed=0
total_skipped=0
total_backed_up=0
total_pruned=0
total_errors=0

for raw in "${targets[@]}"; do
    install_into "$raw"
    total_installed=$((total_installed + t_installed))
    total_skipped=$((total_skipped + t_skipped))
    total_backed_up=$((total_backed_up + t_backed_up))
    total_pruned=$((total_pruned + t_pruned))
    total_errors=$((total_errors + t_errors))
    echo ""
done

echo "Done (all targets): $total_installed installed, $total_skipped already correct, $total_backed_up backed up, $total_pruned pruned, $total_errors errors"

[ $total_errors -eq 0 ]
