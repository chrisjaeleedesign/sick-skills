---
name: write-like-chris
description: "Write or rewrite reflective essays, arguments, notes, rough thoughts, and unfinished drafts in Chris's voice. Use when the user asks for writing to sound like Chris/me, to turn rough thinking into concise clear prose, to preserve blunt self-critical reasoning, or to remove AI-sounding polish without forcing a template."
---

# Write Like Chris

Write concise reflective prose in Chris's voice: plain, direct, specific, and lightly self-critical. The goal is not polish or cleverness. The goal is a thought stated clearly enough that a reader can reason with it.

## Model Routing

- Use the `ask` skill with `--model openrouter/google/gemini-3.5-flash` for drafting whenever tool access is available.
- Do not substitute another model unless the user explicitly asks.
- If Gemini is unavailable, say so instead of silently falling back.
- Give Gemini the user's raw notes plus the writing rules below. Return Gemini's draft only.

## Write

- Keep the user's situation, claim, uncertainty, and ordinary words.
- Prefer concrete statements over interpretive gloss.
- Make every referent clear. If "this", "that", or "it" could make the reader ask what you mean, name the thing.
- Be specific before being short: "struggled to understand" beats "got stuck" when understanding is the point.
- Prefer direct explanatory sentences over aphorisms or clever transitions.
- Use full sentences by default. Fragments are rare and only for rhythm.
- Keep pronouns consistent inside a paragraph.
- Use examples or metaphors only when they make the thought easier to reason about.
- Cut any sentence that explains the writing instead of adding the thought.

## Hard Rules

- Do not invent context: no added timing, motives, backstory, or extra conversation.
- Do not narrate the writing or conversation process unless that process is the point. Delete phrases like "we talked", "we had a long conversation", "I ended up", and "trying to say".
- Do not dress up plain language. Avoid clever verbs or metaphors like "slid", "jumped", "ruler", "curve", "line", "lens", "frame", or "benchmark" unless the user used them.
- Avoid vague bridge sentences like "This changes..." or "This is the issue..." unless the referent is explicit.
- Paraphrase ordinary dialogue unless the exact wording matters.
- Use complete sentences. Write questions as sentences, not colon fragments. Never return "Then:" or "And then:".
- Do not add a tidy closing insight. Stop on the final useful question or decision, not a summary sentence about why it matters.
- Do not add titles, bold text, italics, numbered sections, or Markdown emphasis unless the user asks.

## Preference Checks

Before returning, revise toward these patterns:

- "He immediately compared himself to the average." not "The question slid from the passage to where he ranked."
- "That bothered me." not "That move bothered me."
- "When he didn't understand it, his first reaction was to ask if he should be able to understand it and whether the average person could." not "He told me he did not understand it."
- "Most people define intelligence and stupidity against the average." not "Most people define intelligence and stupidity this way."
- "Is it worth my time to understand it?" not "Then: is it worth understanding?" or "And then: is it worth understanding?"
- Stop at "Is it worth my time to understand it?" not "The answer tells you what to do next."

Return the draft only.
