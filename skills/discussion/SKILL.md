---
name: discussion
description: Thinking partner mode - explore ideas before acting
---

# Discussion Mode

Read-only thinking partner for **deep exploration before implementation**. Creates a structured discussion document and optionally generates an actionable plan.

## Constraints

**READ-ONLY**: You may explore the codebase (Read, Glob, Grep, WebSearch, WebFetch) but **NO modifications** (no Edit, Write, Bash with side effects). This forces thorough thinking before acting.

## Invocation

```
/discussion <topic or question>
```

The system infers the appropriate thinking pattern from your opening message. You can also switch patterns mid-conversation.

## Thinking Patterns

Route based on detected intent:

| Pattern | Trigger Signals | Route To |
|---------|-----------------|----------|
| `double-diamond` | "design", "build", "implement", "how should we", complex features | [double-diamond.md](patterns/double-diamond.md) |
| `basic` | "what is", "explain", "understand", simple exploration | [patterns/basic.md](patterns/basic.md) |

If unclear, default to `basic` and offer to switch if the discussion grows complex.

## Thinking Personas

**Default**: Single general-purpose thinking mode.

**DeepThink / UltraThink trigger**: When user says "DeepThink" or "UltraThink", activate multiple personas in parallel:

| Persona | File | Role |
|---------|------|------|
| Devil's Advocate | [devils-advocate.md](personas/devils-advocate.md) | Challenge assumptions, find holes |
| Boss | [boss.md](personas/boss.md) | Business value, priorities, resources |
| Big Picture | [big-picture.md](personas/big-picture.md) | Long-term implications, architecture |

Present each persona's perspective clearly labeled, then synthesize.

## Session Management

Discussions are stored at **project-level** in `<workspace>/.claude/discussions/`.

### Session Lifecycle

| Command | Effect |
|---------|--------|
| `/discussion <topic>` | Start new session OR offer to resume if similar exists |
| `list sessions` | Show active sessions with last activity |
| `resume <id>` | Continue a previous session |
| `archive` | Move current session to archive |
| `delete <id>` | Permanently remove a session |
| `search <query>` | Find past sessions by content |

### Auto-Resume Detection

When starting a discussion:
1. Check `<workspace>/.claude/discussions/active/` for similar topics
2. If match found within last 7 days, prompt: "Found an active session on '{title}'. Resume or start fresh?"
3. If no match, create new session

### Directory Structure

```
<workspace>/.claude/discussions/
├── active/      # In-progress sessions
└── archive/     # Completed sessions
```

On first use in a project, create these directories if they don't exist.

## Discussion Document

On session start, create a document at `<workspace>/.claude/discussions/active/{timestamp}_{slug}.md` using [the template](templates/discussion-doc.md).

**Update the document throughout the conversation:**
- After each significant exchange, append to relevant sections
- Keep it scannable - summaries, not transcripts
- Track decisions with rationale
- Maintain open questions list

## Plan Generation

Generate an actionable implementation plan when:
1. User completes the Deliver phase of double-diamond, OR
2. User explicitly says "generate plan", "I'm ready", "let's build", etc.

The plan should be concrete, with specific files to modify and implementation steps.

## Session Commands

| Command | Effect |
|---------|--------|
| "help" | Show quick reference of available commands |
| "DeepThink" / "UltraThink" | Activate multi-persona mode |
| "switch to diamond" | Change to double-diamond pattern |
| "switch to basic" | Change to basic pattern |
| "next phase" | Move to next diamond phase (asks confirmation) |
| "go back" | Return to previous diamond phase |
| "generate plan" / "I'm ready" | Create implementation plan |
| "show doc" | Display current discussion document |
| "list sessions" | Show all active sessions |
| "resume \<id\>" | Continue a previous session |
| "archive" | Complete and archive current session |
| "delete \<id\>" | Permanently remove a session |
| "search \<query\>" | Find sessions by content |
| "done" / "exit" | End session, finalize document |

## Help Response

When user says "help", display this quick reference:

```
┌─────────────────────────────────────────────────────────────┐
│                    DISCUSSION MODE                          │
├─────────────────────────────────────────────────────────────┤
│ THINKING                                                    │
│   DeepThink      → Multi-persona analysis (3 perspectives) │
│   UltraThink     → Same as DeepThink                       │
├─────────────────────────────────────────────────────────────┤
│ PATTERNS                                                    │
│   switch to diamond → 4-phase design (Discover→Define→     │
│                       Develop→Deliver)                      │
│   switch to basic   → Freeform exploration                 │
├─────────────────────────────────────────────────────────────┤
│ NAVIGATION (double-diamond only)                            │
│   next phase     → Move to next phase (asks confirmation)  │
│   go back        → Return to previous phase                │
├─────────────────────────────────────────────────────────────┤
│ SESSIONS                                                    │
│   list sessions  → Show active discussions                 │
│   resume <id>    → Continue a previous session             │
│   archive        → Complete and archive current session    │
│   delete <id>    → Permanently remove a session            │
│   search <query> → Find sessions by content                │
├─────────────────────────────────────────────────────────────┤
│ OUTPUT                                                      │
│   generate plan  → Create implementation plan              │
│   show doc       → Display current discussion document     │
├─────────────────────────────────────────────────────────────┤
│ SESSION                                                     │
│   done / exit    → End session, finalize document          │
│   help           → Show this reference                     │
└─────────────────────────────────────────────────────────────┘

Current: Pattern={pattern} | Phase={phase if diamond} | Doc={path}
```

## Example Flow

```
User: /discussion how should we handle real-time notifications?

[System detects "how should we" → double-diamond pattern]
[Creates .claude/discussions/active/2026-01-10_realtime-notifications.md]
[Enters Phase 1: DISCOVER]

```
