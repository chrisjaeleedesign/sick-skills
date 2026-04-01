---
name: prompt-tester
description: "Iterate on system prompts for AI products. Write a prompt, run test scenarios against models, review outputs with AI scoring and human card review, auto-improve based on feedback. Use when the user is building a chatbot, coaching AI, agent, or any product that needs a system prompt — even if they don't say 'test' or 'prompt'. Also use when they say things like 'help me write a system prompt', 'test this prompt', 'improve this prompt', 'this prompt isn't working well', or 'compare these prompts'."
---

# prompt-tester

A local webapp for iterating on system prompts. The core loop: **write a prompt, run test scenarios against a model, evaluate outputs (AI scoring + human review), improve the prompt based on feedback, repeat.**

## When to use

- Building any AI product that needs a system prompt (chatbot, agent, coaching AI, support bot, etc.)
- "This prompt isn't working right"
- "Help me write a system prompt for..."
- "Test this prompt against some scenarios"
- "Compare v1 and v2 of this prompt"

If the user is working on anything that involves a system prompt, this is the skill to reach for.

## Quick start

1. Run `/prompt-tester init` to set up the workspace (copies scaffold, installs deps, creates data dirs)
2. Run `/prompt-tester run` to start the servers and open the webapp

The agent should:
1. Check if `.agents/prompt-tester/app/` exists -- if not, copy the scaffold from the skill directory
2. Install dependencies with `bun install`
3. Start the Python API server on port 3200 and the Next.js webapp on port 3201
4. Open `http://localhost:3201` in the browser

## Key concepts

- **Prompts** are versioned. Each prompt gets v1, v2, v3... as you iterate. Old versions are never overwritten.
- **Scenarios** are test cases: an input message + expected behavior + eval rules. Think of them as unit tests for your prompt.
- **Runs** execute a set of scenarios against a specific prompt version on a specific model. Each run produces outputs for every scenario.
- **AI scoring** checks each output for instruction following, eval rule compliance, and overall quality. Scores are automatic.
- **Human review** is card-by-card: flip through outputs and mark each as good, bad, or add a note. This is where you catch what AI scoring misses.
- **Improve** uses AI to rewrite the prompt based on all feedback (AI scores + human notes). It drafts a new version for you to review.

## Webapp structure

- **Dashboard** -- lists all prompts, recent runs, quick stats
- **Prompt workspace** -- editor for the system prompt + scenario list + run history
- **Review** -- card-by-card human evaluation of run outputs
- **Compare** -- side-by-side diff of two prompt versions with run results

## CLI-compatible

All results are stored as files in `.agents/prompt-tester/` so the agent can read, reference, and act on them directly from the CLI. You don't have to use the webapp for everything.

## Storage layout

```
.agents/prompt-tester/
├── app/                          # Next.js webapp (from scaffold)
├── prompts/{id}/
│   ├── meta.json                 # name, description, created_at
│   ├── v1.md                     # prompt version 1
│   ├── v2.md                     # prompt version 2
│   └── ...
├── scenarios/{id}.json           # input, expected behavior, eval rules
└── runs/{run-id}/
    ├── meta.json                 # prompt id, version, model, timestamp
    ├── results.json              # model outputs for each scenario
    └── review.json               # human review cards (good/bad/notes)
```

## Ports

| Service        | Port |
|---------------|------|
| Python API    | 3200 |
| Next.js webapp | 3201 |
