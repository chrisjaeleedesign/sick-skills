# Wide Flow

Get multiple perspectives on a question in parallel, then synthesize.

## When to use

The user is exploring a broad question and would benefit from hearing different angles before committing to a direction. Good for architecture decisions, approach selection, or any "how should we..." question.

## Steps

1. **Frame** — Restate the question clearly so each perspective gets the same framing.
2. **Fan out** — Make 2-3 parallel ask calls with different angles. Use different models, personas, or both. Each call should approach the question from a distinct direction.
3. **Collect** — All responses land in the same conversation log with sender identity.
4. **Synthesize** — Summarize the perspectives: where they agree, where they diverge, and what's surprising.
5. **Check in** — Ask the user which direction resonates or if they want to go deeper on any thread.

## Tips

- Vary the angles meaningfully. "GPT-5.4 with devils-advocate" and "Gemini with pragmatist" give you both model diversity and perspective diversity.
- Don't over-fan. 2-3 perspectives is plenty. More than that creates noise.
- The synthesis is the most valuable step — don't skip it.
