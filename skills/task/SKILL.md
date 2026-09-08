---
name: task
description: Capture, organize, start, resume, hand off, and finish explicitly tracked personal or agent tasks in Chris's LifeOS vault. Use for task-specific requests or continuation of an already tracked task; do not turn ordinary coding, discussion, or third-party issues into tracked tasks automatically.
---

# Task

Keep the problem, intended outcome, ownership, and actual result together.
Solve the problem well within its agreed scope; a shortcut that misses the
outcome is not sufficient.

## Storage and tools

LifeOS is the single task store: /Volumes/Misc/life_os/my-life/tasks.
Projects are existing canonical pages, not repositories. Use the bundled Bun
client from any workspace; it delegates every operation to the LifeOS service.
Resolve <skill-dir> to this skill's directory:

    bun <skill-dir>/scripts/task.ts projects --source "$PWD"
    bun <skill-dir>/scripts/task.ts list --all

If Bun is absent from PATH, use /Users/chrislee/.bun/bin/bun.
CJL_LIFE_OS_ROOT can relocate the LifeOS checkout. CJL_TASK_VAULT is retired;
never create or fall back to a standalone task vault. No running Bob process
is needed for the local CLI. Read [CLI reference](references/cli.md) for flags,
metadata, ownership, and recovery.

## Capture and focus

- Chris controls projects. Suggest the project we are working in and ask whether
  the task belongs there before saving. His explicit project choice in the request
  already counts as confirmation; context or a repository mapping alone does not.
- Discover existing project pages with projects. An optional main-checkout
  .agents/task-project.json contains {"project_path":"pages/Existing Project.md"}.
  Worktrees share that suggestion. Create or change mappings only on request.
  Never infer a new project from a repository name.
- Use --project with the confirmed canonical page path, or --inbox only after
  Chris explicitly chooses projectless/general work. Both save in tasks/;
  projectless is an empty projects list, not another directory.
- Once capture and its project choice are explicit, use --apply without another
  permission question. Otherwise commands preview. Preserve Chris's wording;
  the filename is the normalized title and the audit ledger retains exact input.
  Use a fresh --idempotency-key for each capture and reuse it after uncertainty.
- Capture can be one sentence. Do not invent dates, urgency, scope, acceptance
  conditions, or tags to fill fields. Tags are optional native YAML lists,
  including slash-separated subtags. Use --tag to add, --remove-tag for exact
  removals, and --clear-tags to reset. list --tag ui includes ui/navigation.
- Before implementation, establish Context and Done when: the actual problem,
  observable outcome, necessary quality, and scope limits. Functions and
  constraints follow from the outcome; map a workflow only when useful.
- Propose separate backlog items when tangents arise, but save them only after
  approval. A task capture is not permission to implement it. Propose interpreted
  brain dumps/splits first; an explicitly requested list needs no extra approval
  once its project assignment is confirmed.

## Ownership and continuation

Read show before modifying a task and pass its hash as --expected-hash.
Claimed tasks also need the current --claim-id. A conflict means reread and
reconcile, not blindly refresh the hash and retry.

Claim before agent implementation with a specific session/agent owner. Use an
actual host conversation reference when available; otherwise omit it. Do not
present an invented local label as a host conversation identifier.

One claim has one accountable owner. Personal tasks can be in-progress without
an agent claim. Claims do not prove a process is running. Questions, blocking,
inactivity, and conversation forks do not transfer ownership.

On resume, reread the task and actual project state. The same owner can continue;
a different owner needs explicit handoff or release. Handoff rotates the claim
and conversation reference. Release clears ownership and returns to todo.
Create/fork an app conversation only when Chris asks.

Chris can manage personal task status normally. --human-requested distinguishes
his explicit status change from agent implementation. --human-override records
his explicit instruction to override an agent claim; never use it merely to
get past a conflict. Manual vault edits are possible and are not locked.

## Finish

Verify the agreed acceptance conditions. Use complete with the current claim,
actual Result, separate verification, and remaining limitations. It writes the
evidence and done status atomically. If the outcome is unmet, leave it unfinished;
nonempty prose is not proof of completion.

Keep implementation steps in the conversation. Persist only useful context,
decisions, blockers, and evidence. Preserve authored sections and metadata.
Report the task path and concise result after a write. Renames and splits need
explicit approval. Feature catalogs and project pages do not update automatically.
