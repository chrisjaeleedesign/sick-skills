---
name: ask
description: "Get perspectives from external models, personas, or structured thinking flows — via CLI or a browser chat UI. Use whenever the user wants a second opinion, fresh take, multi-model comparison, structured exploration, or says things like 'ask gpt5', 'what would a security engineer think', 'let's think through this', 'go wide', 'challenge this', or 'DeepThink'. Also use when the user wants to: open a chat UI, start a web-based conversation, talk to models in a browser, manage chat projects, or says 'open the chat', 'start the chat app', 'launch the chat', 'web chat'. Also use when another skill needs to call an external model."
---

# ask

Get a perspective — from an external model, through a persona lens, via a structured thinking flow, or in a browser chat UI. One skill, shared conversation logs, composable pieces.

User's request: $ARGUMENTS

## Step 0: Check State

Use Glob to check for `.agents/chat/package.json` in the current working directory.

## Step 1: Route Based on Intent

**Regardless of `.agents/chat/` state:**
- If `$ARGUMENTS` is "help" → display **HELP** text below

**If `.agents/chat/` does NOT exist:**
- If `$ARGUMENTS` is empty or blank → route to **UI-INIT** (setup + run)
- If `$ARGUMENTS` implies wanting the browser chat → route to **UI-INIT**, then chain to **UI-RUN**
- If `$ARGUMENTS` is a question or model request → route to **CLI** (the CLI works without the web UI)

**If `.agents/chat/` exists:**

Read `$ARGUMENTS` naturally and determine which route matches:

- **UI-RUN** — User wants to see or open the chat UI. ("open the chat", "launch it", "run the web ui", "start the server", "let me chat in the browser", "fire it up", "I want the web interface")
- **UI-STATUS** — User wants to know what conversations exist or if the server is running. ("what conversations do I have", "is the chat running", "show me my projects", "status")
- **CLI** — User wants to call a model right now from the terminal. This is any question, request for a perspective, or explicit model/persona flags. ("ask gpt5 about X", "what would a security engineer think", "challenge this", "go wide on caching", "--model sonnet", "is this thread-safe")
- **STATUS** — The input is empty. Show current state: whether server is running, number of conversations, and suggest either `/ask open` or `/ask [question]`.

When ambiguous between UI-RUN and CLI: if the user mentions "browser", "web", "ui", "open", "launch", or implies wanting a visual interface, route to UI-RUN. If they have a specific question or topic, route to CLI. **Default: CLI** — most users invoking `/ask` with content want a model response, not to start a server.

## Step 2: Execute Route

| Route | Action |
|-------|--------|
| UI-INIT | Read and follow [prompts/ui-init.md](prompts/ui-init.md) |
| UI-RUN | Read and follow [prompts/ui-run.md](prompts/ui-run.md) |
| UI-STATUS | Read and follow [prompts/ui-status.md](prompts/ui-status.md) |
| CLI | Read [references/cli.md](references/cli.md) for the full CLI reference, then execute the request |
| STATUS | Show state briefly — server running? how many conversations? suggest next action |

## CLI Quick Start

For CLI usage, read the full reference at [references/cli.md](references/cli.md). The basics:

```bash
# Simple question
python3 ~/.claude/skills/ask/scripts/ask.py \
  --model gpt5 --content "What's the best approach for rate limiting?"

# With a persona
python3 ~/.claude/skills/ask/scripts/ask.py \
  --model gpt5 --persona devils-advocate \
  --content "Challenge this architecture decision"

# Continue a conversation
python3 ~/.claude/skills/ask/scripts/ask.py \
  --continue .agents/model-calls/2026-03-30_arch-review.jsonl \
  --content "What about the scaling concerns?"
```

**The principle: the simpler the ask, the less you bother the user.** Questions with one right answer just go. Questions with tradeoffs get a brief check-in. Open exploration gets a flow suggestion.

### CLI Intent Sub-Routing

When routing to CLI, further classify the intent:

**Simple question, one right answer** → just call the model and return the answer. No ceremony.

**Comparison or tradeoff question** → suggest going wide or checking in first.
- Suggest: "There are good arguments on both sides here. Want me to go wide and get a few different takes, or just give you my recommendation?"

**Wants a specific perspective** → use a persona.

**Broad exploration, open-ended** → suggest or start a flow.
- "DeepThink" or "UltraThink" → start a wide flow with parallel persona calls

**Explicit flags** → respect them, skip the routing.

**Ambiguous** → ask briefly.

## Models

| Alias | Provider | Model | Best for |
|-------|----------|-------|----------|
| `gpt5` | OpenAI | GPT-5.4 | Vision, multimodal, general reasoning (default) |
| `mini` | OpenAI | GPT-5.4-mini | Fast, efficient responses |
| `codex` | OpenAI | GPT-5.3-Codex | Complex software engineering |
| `spark` | OpenAI | GPT-5.3-Codex-Spark | Ultra-fast (1000+ tok/s), real-time iteration. Text-only. |
| `sonnet` | OpenRouter | Claude Sonnet 4.6 | Fast, balanced responses |
| `opus` | OpenRouter | Claude Opus 4.6 | Complex writing, nuanced analysis |
| `gemini` | OpenRouter | Gemini 3.1 Pro | Long context, multimodal |

## Important

1. **The called model has ZERO project context.** Include everything it needs in `--content` and `--system-prompt`.
2. **Use `--continue` for follow-ups** rather than starting a new conversation.
3. **Use `--branch` to explore alternatives.** The original stays untouched.

## Conversation Files

Stored as JSONL in `.agents/model-calls/`. Shared between CLI and web UI — start in the browser, continue from the terminal, or vice versa.

## First-Time OpenAI Setup

OpenAI models use tokens from `~/.codex/auth.json` (created by `codex login`). If tokens are expired, the script runs `codex login` automatically. No API key needed — uses your ChatGPT subscription.

---

## HELP Text

> **ask** — multi-model perspectives, CLI and browser
>
> ### Browser Chat
> ```
> /ask open                    # Start chat UI at localhost:3002
> /ask                         # Same — sets up on first run
> /ask status                  # Show conversations and server state
> ```
>
> ### CLI (from within Claude Code)
> ```
> /ask is this function thread-safe?
> /ask what would a security engineer think about this auth flow?
> /ask go wide on how to handle caching
> /ask --model sonnet challenge this architecture
> ```
>
> ### Features
> - **Multi-model**: gpt5, sonnet, opus, spark, gemini, and more
> - **Personas**: devils-advocate, pragmatist, visionary, or any custom perspective
> - **Flows**: wide (fan out), challenge (steelman), double-diamond
> - **Streaming**: Real-time responses in both CLI and browser
> - **Shared history**: JSONL files in `.agents/model-calls/` — CLI and browser share conversations
> - **Thinking mode**: `--thinking high` for deep reasoning on complex problems
