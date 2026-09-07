# Task CLI

Run `bun <skill-dir>/scripts/task.ts <command>` from the project, or pass
`--source <project-directory>`. The examples below abbreviate that prefix as
`task`; no global `task` executable is installed.

## Setup and routing

`task setup` previews creation. `task setup --apply` initializes an independent
Git repository at `/Volumes/Misc/.agents/tasks`, or at the absolute
`CJL_TASK_VAULT` override. It validates an already initialized vault. It refuses
to adopt nonempty directories or operate through symlinks. Git must have an
author name and email configured; setup does not change global Git settings.

Automatic routing writes to `projects/<main-repository-name>/`. Its first
capture records the repository's canonical Git directory in `.project.json`
inside that project folder. Another repository with the same name is rejected.
Choose a distinct identity with `.agents/task-project.json`, or use an explicit
`--project <name>` to intentionally select an existing project. Identity names
allow letters, numbers, underscores and hyphens. They are case-sensitive; avoid
case-only alternatives on case-insensitive filesystems.

The optional identity file belongs at the main checkout's root. Keep its contents
consistent in worktrees and track it when shared across checkouts (some repos
ignore `.agents/`). Never create it merely to repeat the default name.

`--project` bypasses automatic identity and selects that project deliberately.
An explicit-only project has no automatic repository binding; continue selecting
it explicitly. `--inbox` selects specifically separate work. The two flags are
mutually exclusive. `list --all` is read-only access to the complete backlog.
Operations on an existing task must select its project, even when its full path
is known; this catches accidental cross-project writes.

## Commands

```sh
task add --title "Exact requested wording" --idempotency-key <uuid> --apply
task add --inbox --title "Explicitly separate task" --apply
task list --query "wording"
task list --all
task show --path "projects/example/Exact requested wording.md"
```

`add` also accepts `--context`, `--done-when`, `--priority`, `--due`, and repeated
`--tag <tag>`. New tasks are unowned `backlog` items. Duplicate titles receive
numeric filename suffixes;
their exact titles are preserved. An optional UUID idempotency key becomes the
task ID. Reusing that key with the same title and project returns the existing
task; reuse with different inputs fails. After an uncertain rename/capture,
inspect `list --all` by ID before creating another task.

Every existing-task mutation requires `--path` and `--expected-hash <hash>` from
`show`. A claimed task also requires `--claim-id <claim_id>` from that record.
These are cooperation/conflict guards, not authentication or a security boundary.
Anyone with filesystem access can inspect or manually edit these records.

```sh
task update --path <path> --expected-hash <hash> --context <text> --done-when <text> --apply
task claim --path <path> --expected-hash <hash> --owner <specific-owner> --conversation <actual-reference> --apply
task handoff --path <path> --expected-hash <hash> --claim-id <current-claim> --owner <next-owner> --apply
task release --path <path> --expected-hash <hash> --claim-id <current-claim> --apply
task complete --path <path> --expected-hash <hash> --claim-id <current-claim> --result <what-changed> --verification <evidence> --limitations <remaining-limits> --apply
```

- `update`: Context, Done when, tags, priority, due, or stage. Allowed stages here are
  `backlog`, `todo`, `canceled`; `claim` sets `in-progress`, `complete` sets `done`.
  Release first before returning an actively claimed task to backlog/todo.
  An explicit `update --stage todo` reopens a finished task and clears its owner;
  the previous Result remains until the next completion and remains in Git.
- Priority: `urgent`, `high`, `medium`, `low`; due: a real `YYYY-MM-DD` date.
  An empty string clears these optional fields. Do not infer values.
- `handoff`: requires the current claim, generates a new claim ID, and clears
  the old conversation unless a new `--conversation` is supplied.
- `complete`: requires a claim, nonempty Done when, result, and verification.
  Writes Result and stage together, retaining the final owner and conversation
  as history. Optional `--limitations` goes in Result, not acceptance criteria.
- `rename --title <text>`: keeps identity and content, changes title/filename,
  and heals full vault-relative wikilinks used by the CLI. Case-only filename
  changes fail explicitly. Arbitrary Markdown links and short ambiguous
  wikilinks are not rewritten; inspect user-authored links when renaming.
- `split --item <title> --item <title>`: creates unowned backlog replacements in
  the same project and cancels/links the original in one Git commit. Each child
  links back to the original Context. Priority/due/tags are copied only with
  explicit `--inherit-priority` / `--inherit-due` / `--inherit-tags`. Never copy
  the original claim to children.

## Tags and subtags

Tags use the same native YAML list and slash-separated nesting as vault notes:

```yaml
tags:
  - ui/navigation
  - writing/essay
```

```sh
task add --title "Make navigation clearer" --tag ui/navigation --apply
task update --path <path> --expected-hash <hash> --tag accessibility --apply
task update --path <path> --expected-hash <hash> --remove-tag ui/navigation --apply
task update --path <path> --expected-hash <hash> --clear-tags --apply
task list --tag ui
task list --all --tag ui --tag accessibility
```

Repeat `--tag` to add multiple tags without replacing existing ones. Repeat
`--remove-tag` for exact removals: removing `ui` does not remove `ui/navigation`.
Use `--clear-tags` to clear everything, optionally with `--tag` to replace the
set. Adding and removing the same tag, or combining clear and remove, is rejected.
Claimed tasks still require `--claim-id` when changing tags.

`list --tag ui` matches both `ui` and descendants such as `ui/navigation`, but
not `uikit`. Repeated filters must all match and can combine with `--query`.
No parent tag needs to be stored separately.

New input is trimmed, lowercased, and accepts an optional leading `#`. Each slash
segment uses letters/digits with optional internal hyphens (lowercase kebab-case);
empty segments, spaces, and entirely numeric tags are rejected. Matching and
deduplication are case-insensitive. Existing tag spelling is preserved on updates.
Tags are optional and do not change routing, stage, or ownership. Older tasks
without a tags property read as untagged; no migration or read-time write occurs.

## Storage, conflicts, and failures

Task notes contain ordinary YAML frontmatter and Markdown. `title` preserves
the exact wording; the normalized filename is its readable path. Frontmatter
contains `type`, `id`, `title`, `stage`, `project` (null in inbox), `owner`,
`claim_id`, `conversation`, `tags`, `priority`, `due`, `created`, and `updated`;
completion adds `completed`. Unknown properties and other body sections survive
updates, although YAML formatting/comments may be normalized.

Every command returns JSON (except help). `show` returns the current raw content
hash. Applied writes return paths, the resulting records, and a Git commit.
Preview returns proposed contents without changing files; its proposed claim ID
or hash is not an actual claim. Use the applied receipt or `show` before work.

One vault lock serializes applied CLI mutations. The writer checks content
hashes, replaces files atomically, and commits only affected paths. Unrelated
unstaged files are left alone; staged vault changes block writes so they are not
absorbed. Manual edits already present when `show` ran are preserved and included
in that task's next commit. Git commits are local history, not an off-device
backup. No network calls or pushes occur.

Ordinary write/commit failure restores the exact pre-operation files. An abrupt
process kill may leave a lock and unfinished Git changes: inspect the PID in
`.git/task.lock`, verify it has exited, review Git status/diff, and reconcile the
affected notes before removing that specific stale lock. Never discard manual
edits or reclaim an interrupted task automatically. An unavailable vault,
conflicting claim, invalid route, or stale hash requires an explicit error;
there is no fallback to another location or the inbox.
