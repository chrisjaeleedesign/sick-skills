#!/usr/bin/env bash
set -euo pipefail

# install.sh — Symlink all skills in this repo to the global Claude skills directory.
#
# Usage:  bash install.sh
#
# What it does:
#   1. Resolves ~/.claude to its real path (handles ~/.claude → ~/.agents symlink)
#   2. Loops over every subdirectory in skills/
#   3. Per skill: backs up real dirs, fixes stale symlinks, skips correct ones
#   4. Verifies each symlink by checking SKILL.md is readable through it

REPO_DIR="$(cd "$(dirname "$0")" && pwd)"
SKILLS_SRC="$REPO_DIR/skills"

# Resolve ~/.claude to real path (follows symlinks)
CLAUDE_HOME="$(readlink -f "$HOME/.claude")"
GLOBAL_SKILLS_DIR="$CLAUDE_HOME/skills"

echo "Repo skills:   $SKILLS_SRC"
echo "Global target:  $GLOBAL_SKILLS_DIR"
echo ""

# Ensure global skills directory exists
mkdir -p "$GLOBAL_SKILLS_DIR"

installed=0
skipped=0
backed_up=0
errors=0

for skill_dir in "$SKILLS_SRC"/*/; do
    [ -d "$skill_dir" ] || continue
    skill_name="$(basename "$skill_dir")"
    target="$GLOBAL_SKILLS_DIR/$skill_name"
    source="$SKILLS_SRC/$skill_name"

    # Case 1: Already correctly symlinked
    if [ -L "$target" ]; then
        current="$(readlink -f "$target")"
        expected="$(readlink -f "$source")"
        if [ "$current" = "$expected" ]; then
            echo "  ✓ $skill_name — already linked"
            skipped=$((skipped + 1))
            continue
        else
            echo "  ↻ $skill_name — repointing symlink (was → $current)"
            rm "$target"
        fi
    # Case 2: Real directory — back up before replacing
    elif [ -d "$target" ]; then
        echo "  ⤴ $skill_name — backing up existing dir to ${skill_name}.bak"
        mv "$target" "${target}.bak"
        backed_up=$((backed_up + 1))
    # Case 3: Something else (file, broken symlink) — remove it
    elif [ -e "$target" ] || [ -L "$target" ]; then
        echo "  ✗ $skill_name — removing stale entry"
        rm "$target"
    fi

    # Create symlink
    ln -s "$source" "$target"

    # Verify
    if [ -r "$target/SKILL.md" ]; then
        echo "  ✓ $skill_name — installed and verified"
        installed=$((installed + 1))
    else
        echo "  ⚠ $skill_name — symlink created but SKILL.md not readable!"
        errors=$((errors + 1))
    fi
done

echo ""
echo "Done: $installed installed, $skipped already correct, $backed_up backed up, $errors errors"

if [ $backed_up -gt 0 ]; then
    echo ""
    echo "Backups created in $GLOBAL_SKILLS_DIR:"
    for bak in "$GLOBAL_SKILLS_DIR"/*.bak; do
        [ -d "$bak" ] && echo "  $(basename "$bak")"
    done
    echo ""
    echo "To remove backups after verifying:  rm -rf $GLOBAL_SKILLS_DIR/*.bak"
fi
