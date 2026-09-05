---
name: task
description: Capture, organize, start, resume, hand off, and finish explicitly tracked project tasks in Chris's shared local task vault. Use for task-specific requests or continuation of an already tracked task; do not turn ordinary coding, discussion, or third-party issues into tracked tasks automatically.
---

# Task

Keep the problem, intended outcome, ownership, and actual result together. Choose
the simplest approach that satisfies the outcome and constraints. A smaller
implementation that leaves the user's problem unsolved is not sufficient.

## Storage and tools

The shared vault is `/Volumes/Misc/.agents/tasks`. `CJL_TASK_VAULT` can override
that location with an absolute path. Its Markdown and Git history are the source
of truth. This is separate from the main LifeOS vault; do not route explicit
LifeOS requests here or migrate LifeOS tasks implicitly.

Use the bundled CLI for agent mutations. Resolve `<skill-dir>` to the directory
containing this SKILL.md, and use an absolute script path from any project:

```sh
bun <skill-dir>/scripts/task.ts help
bun <skill-dir>/scripts/task.ts list --source "$PWD"
```

Requires Git and Bun 1.3+ with `Bun.YAML`. If `bun` is absent from PATH, check
`~/.bun/bin/bun`. No daemon, database, or LifeOS service is required. For flags,
ownership details, and recovery, read [CLI reference](references/cli.md).

Routing uses the main Git checkout's directory name, including from worktrees.
An optional `.agents/task-project.json` at the main repository root can specify
`{"project":"custom-name"}`. Worktrees must agree with that identity. Use an
explicit `--project` for a deliberately selected different project.

**Inbox is deliberate.** Use `--inbox` only when Chris explicitly identifies work
as separate/general/cross-project, requests the inbox, or approves your
suggestion. Unknown routing and invalid configuration require clarification or
repair; they are never reasons to use the inbox. Outside a Git project, ask
where the task belongs unless Chris has already supplied that choice.

## Capture and focus

- An explicit request to capture or modify a task authorizes that operation;
  use `--apply` without asking again. Commands otherwise preview without edits.
- Preserve the exact supplied title. The filename is normalized for the
  filesystem; the full wording stays in frontmatter. Use a fresh UUID as
  `--idempotency-key` for add and reuse it if the outcome is uncertain.
- Capture can be one sentence. Do not invent dates, urgency, project scope, or
  acceptance criteria merely to fill fields. Clarify only what changes the work.
- For a brain dump needing interpretation or a proposed split, show the proposed
  items first. An already explicit list of tasks to add needs no second approval.
- Before implementation, read **Context** and **Done when**, agree on missing
  intent, and record the problem and observable outcome. Distinguish necessary
  quality from optional breadth. Functions and constraints follow from that
  outcome; map a workflow only when sequencing or interaction design matters.
- Flag meaningful scope expansion or an approach that fails the outcome. Suggest
  capturing separate ideas, but save tangents only when Chris requests or
  approves it. Capture does not authorize execution.

## Ownership and continuation

Read `show` before a change. Pass its `hash` as `--expected-hash`. If the task is
claimed, also pass its current `claim_id` as `--claim-id`. A conflict means reread
and reconcile the actual state, not blindly refresh the hash and retry.

Claim before agent implementation with a specific owner such as an exposed
agent/session identifier. Use a host-provided conversation reference when
available; omit it when unavailable. A local session label can identify an owner,
but do not present that label as a real host conversation ID.

One claim covers one accountable owner. `in-progress` means claimed and
unfinished, not proof a process is running. Asking Chris a question, an
interruption, or forking a conversation does not transfer ownership. Keep the
claim while blocked and record the blocker in Context when it matters.

On resume, reread the task and inspect the actual project state. Reuse your claim
if you are the same owner; a new owner needs an explicit handoff or release.
Handoff rotates the claim ID and replaces the conversation reference. Release
clears ownership and returns the task to `todo`. Task references may be passed
to another conversation; create/fork a conversation only when Chris asks.

## Finish

Verify the agreed acceptance conditions. Use `complete` with a description of
what actually changed and a separate verification record. Include remaining
limitations where relevant. If acceptance conditions remain unmet, leave the
task unfinished; the CLI cannot judge the adequacy of the prose supplied.

Keep implementation steps in the conversation. Persist only the decisions,
context, blockers, and evidence needed for continuation. Preserve other authored
sections and metadata. Report the resulting task path and concise outcome after
an applied write. Renames and splits must be explicitly requested or approved.
