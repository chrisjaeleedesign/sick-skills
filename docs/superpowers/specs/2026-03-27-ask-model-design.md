# ask-model: External Model Calling Skill

**Date:** 2026-03-27
**Status:** Approved

## Purpose

A general-purpose skill that lets coding agents (and other skills) call external models via OpenRouter and OpenAI. Coding agents have prompts optimized for code — this skill provides access to fresh context, multimodal capabilities, and the strengths of different models for non-coding tasks like analysis, review, writing, and reasoning.

Designed agent-first. A human will never call the script directly — it's always invoked through a coding agent in the terminal.

## Skill Structure

```
skills/ask-model/
├── SKILL.md                      # Teaches the agent when/how to use ask-model
├── config.yaml                   # Model aliases, defaults, provider routing
└── scripts/
    ├── ask.py                    # Main entry point — CLI, conversation files, routing
    └── providers/
        ├── openrouter.py         # OpenRouter API calls
        └── openai_provider.py    # OpenAI Codex OAuth + API calls
```

- **API keys:** `.env` at repo root (`/Users/chrislee/Documents/sick-skills/.env`), shared by all skills
- **Conversation files:** `<workspace>/.claude/model-calls/`
- **Installation:** Symlinked to `~/.claude/skills/ask-model`

## CLI Interface

### New call

```bash
python3 ~/.claude/skills/ask-model/scripts/ask.py \
  --model gpt5 \
  --system-prompt instructions.md \
  --content "What do you think about this architecture?" \
  --attach screenshot.png \
  --attach diagram.png \
  --id architecture-review \
  --tag architecture --tag review
```

### Continue a conversation

```bash
python3 ~/.claude/skills/ask-model/scripts/ask.py \
  --continue .claude/model-calls/2026-03-27_architecture-review.jsonl \
  --content "What about caching?"
```

### Branch from an exchange

```bash
python3 ~/.claude/skills/ask-model/scripts/ask.py \
  --branch .claude/model-calls/2026-03-27_architecture-review.jsonl \
  --from 2 \
  --content "What if we used GraphQL instead?"
```

### Show a conversation (readable format)

```bash
python3 ~/.claude/skills/ask-model/scripts/ask.py \
  --show .claude/model-calls/2026-03-27_architecture-review.jsonl
```

### Arguments

| Arg | Required | Description |
|-----|----------|-------------|
| `--model <alias or id>` | No | Model to use. Defaults to `config.yaml` default. |
| `--content <string, path, or ->` | Yes (except `--show`) | The prompt. If `-`, reads stdin. If the value is an existing file path, reads the file. Otherwise treated as a literal prompt string. To force file reading when the path doesn't exist yet, use `--content-file` instead. |
| `--system-prompt <path>` | No | Path to a file used as the system instruction. |
| `--attach <path>` | No | Repeatable. Path to an image/video/file. Auto-detects mime type. |
| `--id <name>` | No | Names the conversation file. If omitted, uses timestamp + short hash. |
| `--tag <tag>` | No | Repeatable. Tags stored in metadata for later retrieval. Additive on continues. |
| `--continue <path>` | No | Path to existing conversation file. Appends a new exchange. |
| `--branch <path>` | No | Path to existing conversation file to branch from. Requires `--from`. |
| `--from <N>` | With `--branch` | Exchange number to branch from. |
| `--show <path>` | No | Pretty-prints a conversation file as readable markdown. |

## Output

The script prints the model's response to stdout so the agent captures it directly in chat. After the response, it prints a separator with the conversation file path:

```
[model response text here]

---
conversation: .claude/model-calls/2026-03-27_architecture-review.jsonl
```

**Exit codes:**
- `0` — success
- `1` — API error (provider returned an error)
- `2` — bad input (missing args, file not found, etc.)

## Conversation File Format (JSONL)

Each conversation is a `.jsonl` file. The first line is a metadata object. Subsequent lines are messages.

### Metadata line (first line)

```json
{
  "type": "meta",
  "id": "architecture-review",
  "model": "gpt-5.4",
  "provider": "openai",
  "created": "2026-03-27T10:00:00Z",
  "updated": "2026-03-27T10:15:00Z",
  "parent": null,
  "branch_from": null,
  "exchanges": 2,
  "tags": ["architecture", "review"],
  "system_prompt": "You are a senior API architect. Be direct and opinionated..."
}
```

| Field | Description |
|-------|-------------|
| `id` | The `--id` value or generated hash |
| `model` | Model used (updated if continuation uses a different model) |
| `provider` | Provider used |
| `created` | Timestamp of first exchange |
| `updated` | Timestamp of most recent exchange |
| `parent` | Null for originals. For branches: `filename#exchange-N` |
| `branch_from` | Same as parent (explicit for clarity) |
| `exchanges` | Count of exchanges, updated on each append |
| `tags` | Categorization tags, additive across continues |
| `system_prompt` | First ~200 chars of the system prompt for quick identification |

### Message lines

```json
{"type": "user", "exchange": 1, "content": "What's the best approach for rate limiting?", "attachments": [{"path": "screenshot.png", "mime": "image/png"}]}
{"type": "assistant", "exchange": 1, "content": "I'd recommend a token bucket algorithm..."}
{"type": "user", "exchange": 2, "content": "What about distributed systems?", "attachments": []}
{"type": "assistant", "exchange": 2, "content": "In that case, consider Redis-backed..."}
```

### Behavior

- **New call:** Creates `{timestamp}_{id}.jsonl` (or `{timestamp}_{hash}.jsonl`) in `.claude/model-calls/`
- **Continue:** Reads all messages from the file, sends the full history + new message to the provider, appends the new user + assistant messages, updates metadata (`updated`, `exchanges`, merges new tags)
- **Branch:** Copies metadata + messages up to exchange N into a new file with `_branch-{N}` suffix. Sets `parent` and `branch_from` to `original_filename#exchange-N`. Appends the new exchange.
- **Attachments:** Stored as path references in the JSONL. On `--continue`, the script reads attachment paths from history and re-encodes them for the API. If a file is missing, warns to stderr but sends the text portions.

## Provider Architecture

### Provider module interface

Each provider module exposes one function:

```python
def call(
    messages: list[dict],       # Conversation history
    model: str,                 # Model ID (provider-specific)
    system_prompt: str | None,  # System instruction text
    attachments: list[dict],    # Current message attachments with paths + mimes
) -> str:                       # Response text
```

The main script handles all file I/O, conversation parsing, and CLI logic. Providers just make API calls and return text.

### OpenRouter provider (`openrouter.py`)

- Uses `OPENROUTER_API_KEY` from `.env`
- Standard REST API calls
- Handles multimodal by encoding attachments as base64 data URIs in the message content

### OpenAI provider (`openai_provider.py`)

- Uses the Codex Device Authorization Grant (OAuth 2.0) flow
- **First use:**
  1. Calls `/api/accounts/deviceauth/usercode` with client ID `app_EMoamEEZ73f0CkXaXp7hrann`
  2. Displays user code and verification URL (`auth.openai.com/codex/device`) in terminal
  3. Polls `/api/accounts/deviceauth/token` until user approves
  4. Exchanges authorization code + PKCE verifier for access/refresh tokens via `/oauth/token`
  5. Extracts `chatgpt_account_id` from JWT access token
  6. Stores encrypted tokens at `.claude/ask-model/openai-tokens.enc`
- **Subsequent calls:** Uses stored access token, auto-refreshes when expired
- **No API key needed** — uses ChatGPT Pro subscription quotas

## Config

### `config.yaml`

```yaml
default_model: gpt5

aliases:
  gpt5: openai/gpt-5.4
  o3: openai/o3
  sonnet: openrouter/anthropic/claude-sonnet-4-6
  opus: openrouter/anthropic/claude-opus-4-6
  gemini: openrouter/google/gemini-3.1-pro

providers:
  openai:
    auth: codex-oauth
    token_store: .claude/ask-model/openai-tokens.enc
  openrouter:
    env_key: OPENROUTER_API_KEY
```

### Alias format

`provider/model-id` — the script splits on the first `/` to determine the provider. For OpenRouter models, the remainder is the full OpenRouter model path (e.g. `anthropic/claude-sonnet-4-6`).

If `--model` doesn't match an alias and contains `/`, assume OpenRouter. Otherwise, error.

### `.env` (repo root)

```
OPENROUTER_API_KEY=sk-or-...
```

## SKILL.md Guidance

The skill prompt teaches the coding agent:

### When to use ask-model

- Need a fresh perspective on an approach or architecture decision
- Want to leverage a model's strengths (e.g. o3 for reasoning, GPT-5.4 for vision)
- Need to process multimodal input (analyze a screenshot, review a diagram)
- Want a second opinion without the coding-agent's context biasing the response
- Another skill delegates to ask-model

### How to use it

- Frame the prompt clearly — the called model has zero context about the project, so include what it needs
- Choose the right model for the task (the skill provides model strength guidance)
- Use `--system-prompt` to set the role/framing, `--content` for the actual question
- Use `--continue` to keep a thread going rather than starting fresh each time
- Use `--tag` to categorize for later retrieval
- Always capture the conversation file path from the output for follow-ups

### What ask-model is NOT

- Not a replacement for the agent's own judgment — it's a tool, not a crutch
- Does not make decisions about which provider is cheaper or faster — that's config
- Does not teach API details — the script handles that

## Cross-Skill Integration

This skill is designed to be consumed by other skills. A skill that wants to call a model:

1. Reads the `ask-model` SKILL.md to understand the interface
2. Constructs the appropriate `ask.py` call
3. Captures stdout for the response and the conversation file path
4. Can `--continue` for follow-up exchanges

Example: the `write` skill's refine mode could eventually delegate to `ask-model` instead of its own `refine.py`, gaining model flexibility and conversation history for free.

## Future Considerations (not v1)

- Provider module for Anthropic direct API
- `--list` flag to browse/search conversation history by tags
- Token usage tracking in metadata
- Conversation summarization for long threads before continuing
