# Task CLI

Run bun <skill-dir>/scripts/task.ts <command> from the project, or pass
--source <directory>. The examples abbreviate this as task; no global task
executable is installed.

## Routing and capture

    task setup
    task projects
    task list --all
    task list --project "pages/LifeOS System.md"
    task add --title "Exact requested wording" --project "pages/LifeOS System.md" --idempotency-key <uuid> --apply
    task add --title "Explicitly general work" --inbox --idempotency-key <uuid> --apply
    task show --path "tasks/Exact requested wording.md"

setup only validates the existing LifeOS vault. The default checkout is
/Volumes/Misc/life_os; CJL_LIFE_OS_ROOT relocates it. Missing LifeOS or the retired
CJL_TASK_VAULT setting fails without creating another store.

projects returns existing active/backlog project pages and an optional suggestion
from the main checkout's .agents/task-project.json:

    {"project_path":"pages/Existing Project.md"}

Mappings never create projects or supply Chris's confirmation. Worktrees share
the main mapping and reject contradictory copies. Explicit --project selects a
validated page; --inbox explicitly selects no project. They are mutually exclusive.
add without either selection previews the need for confirmation; applying fails.

list defaults to the mapped project if available, otherwise all tasks. --all is
cross-project; --inbox filters projectless tasks. show and existing-task operations
use exact task paths and do not require a repository mapping. Legacy LifeOS task
paths resolve through its existing alias index.

add accepts --context, --done-when, --group, --priority, --due, and repeated --tag.
It creates backlog tasks. Priority is urgent/high/medium/low; due is YYYY-MM-DD.
No values are inferred by the CLI. A project supplies its group. Repeated capture
with the same idempotency key and inputs returns the same task; conflicting reuse
fails. Filenames are readable normalized titles, with numeric collision suffixes.
Exact capture wording remains in the existing audit ledger, not title frontmatter.

## Mutations and ownership

Every existing-task mutation requires --path and --expected-hash from show.
A live claim also requires --claim-id. Applied receipts return taskPath and
updated data; show returns path, properties, body, and hash. JSON output is
authoritative; previewed claim IDs are not live claims.

    task update --path <path> --expected-hash <hash> --context <text> --done-when <text> --apply
    task claim --path <path> --expected-hash <hash> --owner <specific-owner> --conversation <actual-reference> --apply
    task handoff --path <path> --expected-hash <hash> --claim-id <claim> --owner <next-owner> --apply
    task release --path <path> --expected-hash <hash> --claim-id <claim> --apply
    task complete --path <path> --expected-hash <hash> --claim-id <claim> --result <changes> --verification <evidence> --limitations <limits> --apply

- claim requires Context and Done when, sets in-progress, and generates a claim.
- handoff rotates the claim and clears conversation unless a replacement is given.
- release clears owner/claim/conversation and returns to todo.
- complete requires the current claim, Done when, Result, and verification.
  It retains the final owner/conversation, clears the live claim, and records
  completed. Omitted limitations are labeled None reported, not proven absent.
- Agent update cannot set done or in-progress. An explicit human status change
  uses --human-requested. Overriding a live claim additionally requires
  --human-override "<Chris's instruction>"; the service audits it.
- Reopen explicitly with update --stage todo. Prior Result remains as history;
  a later completion replaces the managed Result while Git preserves the prior one.
- update supports --project, --inbox/--clear-project, --group, --priority, --due,
  --context, --done-when, and corresponding --clear-* flags.
- rename --title <name> uses Obsidian's backlink-aware move and preserves metadata.
  Obsidian must be available. Dirty targets/backlinks or unexpected changes fail.
- split --item <title> --item <title> --idempotency-key <key> creates unowned backlog
  children and cancels/links the parent in one Git transaction. Project/group are
  inherited; priority/due/tags require --inherit-priority/--inherit-due/--inherit-tags.
  Older partially completed LifeOS splits retain their existing recovery path.

## Tags and metadata

    task update --path <path> --expected-hash <hash> --tag ui/navigation --apply
    task update --path <path> --expected-hash <hash> --remove-tag ui/navigation --apply
    task update --path <path> --expected-hash <hash> --clear-tags --tag writing/essay --apply
    task list --all --tag ui --tag accessibility

--tag adds without replacing existing tags. --remove-tag removes exact tags;
removing ui does not remove ui/navigation. Parent filtering includes descendants
but not peers such as uikit. Repeated filters use AND. New inputs normalize to
lowercase kebab-case slash segments; existing spelling survives unrelated updates.
Do not combine clear/remove or add/remove of the same tag.

The older LifeOS worker task CLI retains replacement --tag semantics and provides
--add-tag for additions. The skill client uses the additive interface above.

Core frontmatter: type, stage, projects, group, tags, priority, due.
Optional coordination: id, owner, claim_id, conversation, created, updated, completed.
New managed captures receive IDs; existing personal notes are not bulk rewritten.
Filenames are canonical names. Unknown properties and unmodified body sections
survive writes; YAML formatting/comments may normalize.

## Conflicts and recovery

All clients share LifeOS's Git lock, hashes, exact-path commits, and audit ledger.
No daemon or network service is needed. SQLite is existing audit/interaction state,
not another task store. Commits are local history, not an off-device backup.

On stale hashes or claims, reread and reconcile. Dirty target files/backlinks
require reconciliation; unrelated dirty files remain untouched. A failed write or
Git commit restores affected files. Human filesystem edits do not obey agent locks.

After abrupt interruption, inspect the target files, Git status, and existing
LifeOS transaction recovery state. Do not discard edits, delete locks, steal claims,
or fall back to the archived standalone vault automatically.
