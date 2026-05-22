# Update Models

Refresh the ask skill's model aliases with the latest available from OpenRouter.

## Step 1: Fetch current catalog

Run:

```bash
curl -s https://openrouter.ai/api/v1/models | python3 -c "
import sys, json
data = json.load(sys.stdin)['data']
# Filter to major providers, sort by id
providers = ['anthropic', 'google', 'meta-llama', 'mistralai', 'deepseek', 'openai']
for m in sorted(data, key=lambda x: x['id']):
    vendor = m['id'].split('/')[0]
    if vendor in providers:
        print(f\"{m['id']}  —  {m.get('name', '')}  ({m.get('context_length', '?')} ctx)\")
"
```

Note what's available. Focus on frontier/flagship models, not every variant.

## Step 2: Read current config

Read `config.yaml` from the skill root (same directory as SKILL.md). Note the current OpenRouter aliases and what they point to. **Do not touch OpenAI aliases** — those use a separate auth system.

## Step 3: Compare and propose updates

For each existing OpenRouter alias (`sonnet`, `opus`, `gemini`, etc.):
- Check if the model ID still exists in the catalog
- Check if a newer version in the same family is available (e.g. `claude-sonnet-4-6` → `claude-sonnet-4-7`)
- Use naming heuristics: same vendor, same tier/family, higher version number

Also consider adding new aliases for:
- Significant new frontier models from major providers that don't have an alias yet
- Keep alias names short and intuitive (e.g. `deepseek`, `llama`, `mistral`)

## Step 4: Show diff and confirm

Present a clear table to the user:

```
Alias     Current                              → Proposed
──────    ─────────────────────────────────     ─────────────────────────────────
sonnet    openrouter/anthropic/claude-sonnet-4-6  → openrouter/anthropic/claude-sonnet-4-7
gemini    openrouter/google/gemini-3.1-pro        → (no change)
+ flash   (new)                                   → openrouter/google/gemini-3.1-flash-lite-preview
```

**Wait for user confirmation before writing anything.**

## Step 5: Write updates

1. Update the `aliases` section in `config.yaml` (skill root)
2. Add or update `last_updated` with today's ISO date at the top level of the config
3. If `.agents/chat/config.yaml` exists in the current working directory, update that copy too
4. Use targeted edits — preserve comments and structure, don't rewrite the whole file

## Step 6: Update SKILL.md

Update the **Models** table in SKILL.md (the `## Models` section) to reflect the new aliases. Keep the same table format.

## Step 7: Summary

Tell the user what changed and remind them:
- Aliases are shortcuts — any full model ID works as passthrough (e.g. `--model anthropic/claude-sonnet-4-6`)
- Run `/ask update models` again anytime to refresh
