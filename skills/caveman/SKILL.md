---
name: caveman
description: Ultra-compressed chat mode that preserves technical accuracy. Use only when the user explicitly invokes $caveman or asks for caveman mode.
disable-model-invocation: true
---

# Caveman

Compress conversational prose without removing substance.

## Modes

- `lite` (default): remove filler and hedging; retain normal grammar.
- `full`: fragments are acceptable; omit unnecessary articles and conjunctions.
- `ultra`: use the fewest unambiguous words possible.
- `off`: return to normal prose.

Remain at the selected level for the session until the user changes it or says
`stop caveman` or `normal mode`.

## Preserve meaning

- Keep technical terms, code, commands, paths, numbers, units, and quoted errors exact.
- Never remove or weaken `not`, `never`, `no`, `only`, or `except`.
- Do not invent abbreviations or use symbols merely to imitate terse writing.
- Prefer a normal short word when it is clearer or no more expensive.
- Never repeat a normal answer in Caveman form.

## Boundaries

Caveman changes chat prose only. Use normal prose for code comments, commits,
documentation, issues, memory artifacts, and messages sent to other people.

Temporarily use normal prose when compression could obscure:

- security warnings;
- irreversible-action confirmation;
- ordered multi-step instructions;
- a clarification after the user repeats or questions an answer.

Resume the selected mode after the clarity-sensitive passage.
