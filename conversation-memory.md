# Handoff: LifeOS task skill and vault organization

- Date: 2026-09-08
- Sources: current live conversation; current installed task and conversation-memory skills; LifeOS task CLI/service, vault instructions, Bases, and REQ-035; local Git history.
- Goal lens: let Chris or another agent understand and use the system without reopening the long design discussion.
- Scope: documentation and read-only verification. This handoff does not assign work, transfer ownership, or authorize further implementation.

## TLDR

- LifeOS is the only active task store: `/Volumes/Misc/life_os/my-life/tasks/`.
- `$task` is instructions plus a thin Bun client. LifeOS's existing task service owns validation, writes, claims, Git transactions, and audit records.
- Chris controls projects and task-to-project assignment. Repository context can suggest an existing project; it cannot silently assign one.
- Capturing a task is not permission to implement it. Agent implementation needs a clear problem, completion conditions, scope limits, and a claim.
- A handoff document preserves context. The task CLI's `handoff` transfers a claim. Creating or forking an app conversation does neither automatically.
- The original `$handoff` skill was deleted in cleanup commit `92ba9d08`. `$conversation-memory` remains installed under that different name. Neither was changed by this documentation request.

## Context

- Work type: shared personal/agent task tracking, consolidated into an existing Obsidian vault.
- Audience: Chris, Codex, Claude Code, and Bob.
- Objective: keep work focused on the actual problem and intended outcome, prevent interesting tangents from inflating scope, and prevent easy-but-inadequate solutions.
- Constraints: human-owned projects; lightweight personal tasks; explicit agent ownership; one writing service; preserve user content and unrelated Git changes.
- Rejected expansion: automatic tracking of ordinary coding, autonomous backlog pulling, hooks, a new database/service/viewer, and automatic feature-catalog synchronization.
- Earlier standalone-vault plans are superseded. The imported completed task documents that historical implementation; its old storage instructions are not current operating guidance.

## Vault organization

The vault is inside the LifeOS Git repository, not a separate Git repository:

```text
/Volumes/Misc/life_os/
├── .git/                       LifeOS history, including managed task changes
├── apps/pi-mono/src/            Task service, CLI, Bob/Discord adapters
├── .agents/state/pi-channel-assistant/
│   └── channel-history.sqlite  Existing audit and temporary interaction state
├── requirements/               Product/implementation contracts
└── my-life/                    Obsidian vault
    ├── AGENTS.md               Vault operating rules
    ├── tasks/                  Flat task Markdown files; filename = task title
    ├── pages/                  Flat durable notes AND canonical project pages
    ├── tasks.base              Task views, not a separate store
    ├── projects.base           Views of pages with type: project
    ├── pages.base              Durable-page views
    ├── templates/              Includes task.md and project.md
    ├── daily/                  Daily notes and month/year summaries
    ├── people/                 Person pages
    ├── meetings/               Meeting material
    ├── social-media/           Specialized content collection
    ├── attachments/            Supporting files
    ├── chats/                  Existing chat collection
    ├── memory/                 Existing memory collection
    ├── archive/                Inactive/legacy material
    ├── .obsidian/              Obsidian configuration
    └── .agents/                Vault-local agent support
```

Folders store kinds of records; they are not the subject taxonomy. `group` is the broad area, `tags` are concepts/subtopics, and wikilinks are actual relationships.

All managed tasks are directly under `tasks/`. There is no new `tasks/projects/` or `tasks/inbox/`. Projectless tasks use `projects: []` in that same folder. Legacy `projects/`, `notes/`, `journal/`, `maps/`, and `system/` are not new-file destinations.

Projects are existing `type: project` pages in `pages/`, such as `/Volumes/Misc/life_os/my-life/pages/LifeOS System.md`. A project is not automatically equivalent to a repository. Tasks link to it through `projects:`; a project page can embed `![[tasks.base#This Project]]` to display its open tasks without duplicating them.

Current `tasks.base` views: Active, By Project, By Group, Backlog, In Progress, Completed, This Project, and Needs Cleanup. Completed includes both `done` and `canceled`. Owner is visible in Active and In Progress.

The broader vault's note and project schemas are not identical to tasks: durable notes use `status`; projects use `status: active|backlog|completed|canceled`; tasks use `stage`. Do not replace these with one field globally.

## Task record

Core frontmatter:

| Property | Meaning |
|---|---|
| `type` | `task` |
| `stage` | `backlog`, `todo`, `in-progress`, `done`, or `canceled` |
| `projects` | List of wikilinks to canonical project pages; empty means explicitly projectless |
| `group` | Broad controlled category; normally inherited from the selected project |
| `tags` | Optional concepts, including nested tags such as `ui/navigation` |
| `priority` | Optional `urgent`, `high`, `medium`, or `low` |
| `due` | Optional `YYYY-MM-DD`; never inferred merely to fill the field |

Optional coordination properties:

| Property | Meaning |
|---|---|
| `id` | Stable record identity; new managed captures receive one |
| `owner` | Accountable agent/session; retained after agent completion as attribution |
| `claim_id` | Token for the current live claim; cleared on completion/release |
| `conversation` | Optional real host conversation reference, not an invented identifier |
| `created` | Creation timestamp when recorded |
| `updated` | Last recorded managed update timestamp |
| `completed` | Recorded agent-completion timestamp |

The filename is the title; do not add a duplicate `title` field. Existing personal tasks are not bulk-populated with agent metadata. Unknown frontmatter and unmodified body sections survive managed updates, though YAML formatting/comments can normalize.

Known groups are Making, Home, Food & Hosting, Health & Fitness, Relationships, Ideas & Writing, Work, Content, Life Systems, Admin & Money, and Travel & Experiences.

The useful body shape is:

```markdown
## Context
The problem and relevant background.

## Done when
The observable outcome, required quality, and scope limits.

## Result
What actually changed.

### Verification
What was checked and what happened.

### Limitations
Remaining gaps or uncertainty.
```

A capture can initially be one sentence. Context and Done when are required before an agent claims the task. Result is written at completion. Add functions, constraints, decisions, or workflow only if useful; not as mandatory template bureaucracy. The CLI can validate nonempty sections, not whether the solution actually solves the problem.

## How the skill executes

1. A task-specific request activates the installed task instructions. Ordinary coding/discussion does not automatically become task tracking.
2. The agent invokes `/Users/chrislee/.codex/skills/task/scripts/task.ts` with Bun.
3. That script forwards arguments to `/Volumes/Misc/life_os/apps/pi-mono/src/task-cli.ts`.
4. The CLI calls `/Volumes/Misc/life_os/apps/pi-mono/src/task-service.ts`, also used by Bob's task adapters.
5. Managed writes use LifeOS's shared hash checks, claim checks, Git lock/transaction, exact-path commits, and existing audit ledger.

There is no second task database, synchronization daemon, or requirement for Bob to be running for local CLI use. The service and skill are local-filesystem tools; ordinary ChatGPT/cloud sessions do not gain vault access merely by receiving this document.

Installed task entrypoints under `/Users/chrislee/.codex/skills/task`, `/Users/chrislee/.agents/skills/task`, and `/Users/chrislee/.claude/skills/task` resolve to `/Volumes/Misc/sick-skills/skills/task`. On this machine `/Users/chrislee/.claude` itself links to `/Users/chrislee/.agents`.

`CJL_LIFE_OS_ROOT` may relocate the LifeOS checkout, not just an arbitrary task folder. `CJL_TASK_VAULT` is retired and rejected. Missing LifeOS access fails; the client never creates a fallback store.

### Capture and project confirmation

- `projects` lists eligible existing active/backlog project pages and an optional repository suggestion.
- Optional repository mapping: `.agents/task-project.json` containing `{"project_path":"pages/LifeOS System.md"}`. The file is repository-local, not task frontmatter. Create it only when Chris requests a mapping.
- Linked worktrees use the main checkout's mapping. Conflicting worktree mappings, invalid projects, and stale mappings fail rather than silently becoming inbox.
- A mapping is only a suggestion. Before saving, Chris must name/confirm the project or explicitly choose projectless work.
- Supplying `--project` represents that confirmed choice. `--inbox` represents his explicit projectless choice. The code validates the supplied project; the agent must not falsely represent a suggestion as approval.
- Without a choice, `add` previews the missing confirmation; applying fails. Once capture and assignment are approved, the agent can supply `--apply` without asking redundantly.
- New captures start in backlog. Reuse the same idempotency key and inputs after an uncertain result; a repeated confirmed capture must not duplicate the note.

### Ownership and lifecycle

| Action | Required information and effect |
|---|---|
| Capture | Confirmed project/projectless choice; creates an unclaimed backlog record, not permission to implement |
| Prepare | Establish the actual problem, observable acceptance conditions, quality floor, and scope ceiling |
| Claim | Fresh hash, Context, Done when, specific owner; creates a claim token and sets in-progress |
| Update | Fresh hash; current claim token when claimed; changes approved metadata/body sections |
| Handoff | Current claim and fresh hash; changes owner, rotates claim token, replaces/clears conversation |
| Release | Current claim and fresh hash; clears owner/claim/conversation and returns to todo |
| Complete | Current claim, fresh hash, Done when, Result and verification; atomically writes evidence and done status, clears live claim, retains attribution |
| Reopen | Explicit status update; removes completed/ownership metadata while preserving previous Result as history |

Read `show` before each mutation. Its SHA-256 `hash` is passed as `--expected-hash`; it is not stored in frontmatter. A changed note means reconcile, not blindly fetch a new hash and retry the same overwrite. Use the new hash/token returned by applied operations, not preview tokens.

Personal tasks can be in-progress without an agent claim. An explicit Chris-requested status change uses `--human-requested`; an agent cannot use ordinary update to bypass claiming/completion. Overriding another agent's claim additionally needs Chris's explicit instruction in `--human-override`, which is audited.

Claims do not prove an agent process is alive. Questions, inactivity, forks, and handoff documents do not transfer ownership. These are cooperation safeguards, not authentication or locks against arbitrary manual filesystem editing.

### Commands

Use `bun /Users/chrislee/.codex/skills/task/scripts/task.ts <command> ...`. If Bun is not on PATH, use `/Users/chrislee/.bun/bin/bun`. There is no installed global `task` shell executable. Output is JSON. Mutations preview by default; `--apply` executes the approved write.

| Command | Purpose |
|---|---|
| `setup` | Validate existing LifeOS access; never initialize another vault |
| `projects` | Discover project choices and current suggestion |
| `add` | Capture with confirmed route and idempotency key |
| `list` | Read tasks; supports `--all`, `--project`, `--inbox`, `--query`, repeated `--tag` |
| `show` | Read one exact task path, body, metadata, and current hash |
| `update` | Change stage, route, group, priority, due, tags, Context, or Done when |
| `rename` | Explicit backlink-aware rename through Obsidian; preserves metadata |
| `split` | Create unowned backlog children and cancel/link parent in one Git transaction |
| `claim`, `release`, `handoff`, `complete` | Coordination lifecycle described above |

`list` uses the mapped project when one exists, otherwise all tasks. Use `--all` for the full inventory without relying on a mapping. Existing-task operations use exact task paths and do not need repository routing.

Tags: `--tag` adds; `--remove-tag` removes exactly; `--clear-tags` resets. `list --tag ui` includes `ui/navigation`, not `uikit`; multiple filters use AND. New input normalizes to lowercase kebab-case slash segments. The older LifeOS worker CLI retains replacement `--tag` semantics and has `--add-tag`; do not confuse that interface with this skill.

Split inherits project/group; priority, due, and tags require `--inherit-priority`, `--inherit-due`, and `--inherit-tags`. Legacy pending-split recovery remains supported. Rename requires Obsidian; its vault selector must precede the command (`obsidian vault=my-life ...`) so another focused vault is not targeted.

### Bob and Discord

`/task add` proposes a project selection privately before saving. Chris chooses an offered project, explicitly projectless, or Do not save. Pending captures expire after 24 hours. Rejection/expiration creates no task; repeated confirmation does not duplicate it. Proposal state lives in the existing audit ledger, not a draft task folder.

Ordinary Bob capture tools also require explicit project confirmation/projectless intent. Read/update/rename adapters use the same task service and hash/ownership safeguards. An actual Chris-origin Discord confirmation click is still the recorded manual acceptance check; simulated interactions were tested.

### Failure handling

Stale hashes, conflicting claims, invalid routing, unsafe paths, and dirty target/backlink files are reasons to stop and reconcile. Unrelated dirty changes must remain untouched. Managed task changes enter LifeOS Git history, not the current coding repository's history. Exact-path commits are local recovery, not off-device backup.

Caught write/commit failures have rollback support. After abrupt interruption, inspect task files, Git status, and transaction recovery state; do not delete locks, discard edits, steal ownership, or restart the retired store automatically.

## Rules That Matter

### Rule: Keep an outcome and a scope ceiling together

- What they asked for: “Other ideas or the agent make the idea grow much larger than it should be” and “the agent doing the easy solution rather than solving well.”
- What the assistant produced (worked): the implemented skill says to establish Context and Done when, “the actual problem, observable outcome, necessary quality, and scope limits,” and to propose tangents separately, saving only after approval.
- Why this worked: adequate quality and bounded scope are both explicit; implementation speed does not excuse missing the intended outcome.
- What the assistant produced (missed): the earlier process discussion felt too heavy to Chris. A complete rejected assistant excerpt is not available here; do not invent one. Mandatory functions/workflows for every one-line personal task would repeat that problem.
- Why this missed: tracking would become another work stream instead of a focus aid.
- What changed: optional useful documentation replaced mandatory process expansion.
- Use this when: framing or executing explicitly tracked work.
- Skip this when: ordinary coding/discussion has not been made a tracked task, or a lightweight personal capture needs no implementation brief yet.

### Rule: Human-owned projects, one task store

- What they asked for: “I feel like I should own what gets to be a project?” followed by approval to merge task tracking into LifeOS.
- What the assistant produced (worked): a thin client, flat task notes, confirmed native project links, and shared service guards; existing projects and 29 personal task files were preserved during migration.
- Why this worked: no repository-driven project proliferation and no two-store reconciliation problem.
- What the assistant produced (missed): the older standalone design stored tasks under `/Volumes/Misc/.agents/tasks/projects/<repo>/`. This was an approved earlier design, not an original implementation error; it is now superseded.
- Why this missed the later goal: repository identity did not cleanly represent Chris's projects, and separate writable stores duplicated task management.
- What changed: repository routing now only suggests an existing LifeOS page; Chris confirms assignment before save.
- Use this when: capture, project reassignment, or repository mapping.
- Skip this when: reading an existing task by its exact path; no new project confirmation is needed just to read it.

### Rule: Separate context transfer from responsibility transfer

- What they asked for: ownership “so we know when a problem is being solved,” plus a reusable handoff.
- What the assistant produced (worked): claim-based ownership and a separate documentation artifact. Skill instructions explicitly say conversation forks do not transfer ownership.
- Why this worked: the receiving agent has context without silently gaining authority over another agent's work.
- What the assistant produced (missed): no verified historical bad output is available; the hypothetical counterexample is “I wrote a handoff, so the next agent owns the task.”
- Why this misses: no claim rotation occurred, and the original agent could still be acting.
- What changed: task handoff requires an explicit service mutation; writing this document did not perform one.
- Use this when: resuming, switching sessions, or changing accountable agent.
- Skip this when: sharing a read-only explanation without intending to transfer responsibility.

## Good Examples

### Read-only inventory

```bash
bun /Users/chrislee/.codex/skills/task/scripts/task.ts setup
bun /Users/chrislee/.codex/skills/task/scripts/task.ts projects --source /Volumes/Misc/sick-skills
bun /Users/chrislee/.codex/skills/task/scripts/task.ts list --all
```

These were verified during this handoff: setup valid, no sick-skills mapping suggestion, 30 task records, no active claims. They do not require `--apply` or create a task.

### Approved capture, then independently authorized execution

Illustrative request, not a live new task: “Add ‘Review task onboarding’ to LifeOS System. Just capture it.” The agent may save with that project and a fresh idempotency key, but must not claim or implement it. A later request to work on it prompts a fresh read, framing, and claim.

```bash
# Example only: placeholder key must be replaced; do not run without approval.
bun /Users/chrislee/.codex/skills/task/scripts/task.ts add \
  --title "Review task onboarding" \
  --project "pages/LifeOS System.md" \
  --idempotency-key "REPLACE-WITH-FRESH-UUID" --apply
```

### Shared implementation, not parallel writers

Actual excerpt from `/Volumes/Misc/sick-skills/skills/task/scripts/task.ts`:

```typescript
const script = path.join(root, "apps/pi-mono/src/task-cli.ts");
if (!fs.existsSync(script)) throw new Error("LifeOS task CLI unavailable at " + script + "; no fallback store is created");
const result = spawnSync(process.execPath, [script, ...process.argv.slice(2)], { stdio: "inherit", env: process.env });
```

This keeps task policy and mutation safeguards in LifeOS. Deployment verification records full LifeOS checks, six client tests, and skill validation passing; those suites were not rerun merely to generate this handoff.

## Bad Examples

These are explicit counterexamples, not fabricated quotations from prior assistant output.

- “This is the WR repository, so I created a WR project and saved the task there.” Wrong: repository identity is not permission to create or assign a project. Discover existing pages and get Chris's choice.
- “I noticed five improvements and backlogged them.” Wrong: suggestions are not saved commitments. Propose them and wait for approval to capture.
- “The tests pass, so I marked the task done with update.” Wrong for agent implementation: verify the actual acceptance conditions, then use complete with the current claim, Result, verification, and limitations.
- “LifeOS is unavailable, so I reinitialized `/Volumes/Misc/.agents/tasks`.” Wrong: this recreates dual writable stores. Fail closed and reconcile access.
- “A handoff file exists, so a new agent can take over the claim.” Wrong: context transfer is not ownership transfer.

## Current state and recovery references

Live inventory on 2026-09-08: 30 records; 12 backlog, 5 todo, 0 in-progress, 2 done, 11 canceled smoke-test records; no active claims. Project discovery returns 12 eligible project pages. No repository mapping was created during the consolidation; current sick-skills suggestion is null. These are a snapshot, not instructions to change statuses or delete tests.

Deployment evidence recorded in REQ-035: full LifeOS checks passed; six client tests/42 assertions passed; skill validated; existing 29 tasks and 169 baseline paths unchanged; Bob reloaded to ready; live Bases and SQLite checks passed. Current runtime readiness was not rechecked in this documentation turn. Chris-origin Discord confirmation remains the recorded manual check.

Key commits:

| Repository | Commit | Purpose |
|---|---|---|
| sick-skills | `92ba9d08` | Retired redundant skills, including original handoff |
| sick-skills | `3316d62c` | Replaced standalone writer with LifeOS client |
| life_os | `cba3ca88` | Consolidated task service and adapters |
| life_os | `68d44a84` | Shared Git/hash dependency guards |
| life_os | `a37cc38f` | Native short project links |
| life_os | `1aafa0df` | Imported one completed standalone task |
| life_os | `566c9b85` | Cutover verification and explicit Obsidian targeting |
| life_os | `81dacc22` | Aligned worker help with confirmation/ownership |
| Archived task repository | `b226fa4` | Retired standalone format marker |

The imported `/Volumes/Misc/life_os/my-life/tasks/Implement the shared project task vault.md` retains ID `50e1276c-2fc5-4116-824f-8a681ec51a0a`, completed state, owner/conversation, original timestamps, full documentation, and source provenance. It describes the historical standalone implementation, not a newly captured consolidation task.

Old repository and full Git history: `/Volumes/Misc/.agents/tasks-archive-2026-09-08`. Original source revision `734a261d5c8ff7d9e82efc28ed0471e2d9a8bd49` remains in that history. Old default `/Volumes/Misc/.agents/tasks` contains relocation notice/marker only. Neither is an active task store.

Start with these authoritative files, not an older chat summary:

- [Task instructions](/Volumes/Misc/sick-skills/skills/task/SKILL.md)
- [CLI flags and recovery reference](/Volumes/Misc/sick-skills/skills/task/references/cli.md)
- [LifeOS task requirements and verification](</Volumes/Misc/life_os/requirements/agent-memory/features/035-REQ-project-and-task-tracking.md>)
- [Vault organization rules](/Volumes/Misc/life_os/my-life/AGENTS.md)
- [Shared CLI](/Volumes/Misc/life_os/apps/pi-mono/src/task-cli.ts)
- [Shared task service](/Volumes/Misc/life_os/apps/pi-mono/src/task-service.ts)
- [Discord task interaction manager](/Volumes/Misc/life_os/apps/pi-mono/src/task-manager.ts)
- [Bob tool adapters](/Volumes/Misc/life_os/apps/pi-mono/src/channel-tools.ts)
- [Consolidation regression tests](/Volumes/Misc/life_os/apps/pi-mono/src/task-consolidation.self-test.ts)
- [Skill client tests](/Volumes/Misc/sick-skills/skills/task/tests/task.test.ts)

## Where the handoff skill went

The original was `/Volumes/Misc/sick-skills/skills/mattpocock/handoff/SKILL.md`, removed on 2026-09-03 in `92ba9d084a50f83b37e4a2b20e8765401cdefe2b` (`chore: retire redundant skills`). It instructed agents to write a concise workspace-local `.agents/handoffs/YYYY-MM-DD-<topic>-handoff.md`, reference existing artifacts, and suggest skills. Its absence under the name `handoff` is explained by that deletion, not a confirmed discovery bug.

Read the recoverable original without restoring it:

```bash
git -C /Volumes/Misc/sick-skills show '92ba9d08^:skills/mattpocock/handoff/SKILL.md'
```

`conversation-memory` is still present at `/Users/chrislee/.agents/skills/conversation-memory/SKILL.md` and is available in this session. Its display name is **Conversation Memory**. It is an independent, heavier retrospective skill: context, behavioral rules, worked/missed examples. It is not an alias or rename of `handoff`.

Its live-conversation default output is `/Volumes/Misc/sick-skills/conversation-memory.md`, which is why this document is here rather than `.agents/handoffs/`. It is not an edit to Codex's persistent memory registry.

Codex supports user skills under `/Users/chrislee/.agents/skills` and symlinked skill folders; a separate `/Users/chrislee/.codex/skills/conversation-memory` link is not required. If **Conversation Memory** itself fails to appear in the UI, restart Codex as the official documentation advises. Restarting will not restore the deleted **handoff** skill. [Official skill documentation](https://learn.chatgpt.com/docs/build-skills)

Assessment: the old lightweight handoff skill is the closer fit for routine session continuation; conversation-memory is more appropriate when extracting reusable patterns from a long conversation. Restoring or renaming either requires a separate requested change. Nothing was restored in this turn.

## Relevant skill boundaries

- `$task`: explicitly tracked work, ownership, and completion evidence.
- `$conversation-memory`: a reusable conversation-derived artifact; no task-ownership mutation.
- `$cjl-features`: optional catalog of future product capabilities, not a parallel task backlog; no automatic synchronization.
- `$cjl-standards`: project operating guidance in AGENTS.md; separate from task records and currently explicit-only.
- Ponytail: keep implementation minimal while meeting the actual acceptance conditions; never justify an inadequate shortcut.
- `talk-to-bob`: relevant prior LifeOS context or an approved/load-bearing context handoff, not a replacement task writer.

Only this handoff document was created for the current request. Task notes, claims, project pages, installed skills, and runtime configuration were not changed.
