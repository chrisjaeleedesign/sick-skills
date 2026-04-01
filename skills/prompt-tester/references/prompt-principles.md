# Prompt Engineering Principles

## Structure

Follow this order: role (1 line) -> context -> task -> constraints -> output format -> examples.

Use XML tags or markdown headings to visually separate each section. Models parse structured prompts more reliably than walls of text.

## Explain the Why

Every instruction should have a reason. "Respond in bullet points so the user can scan quickly" beats "Respond in bullet points." When the model understands intent, it generalizes better to edge cases you didn't anticipate.

## Examples Are King

3-5 diverse examples are the most reliable steering mechanism. Cover the typical case, an edge case, and at least one case showing what NOT to produce. Show input/output pairs, not just outputs.

## Output Contracts

Be explicit about format: JSON schema, markdown structure, length bounds, required fields. Vague formats produce vague outputs. If you want JSON, say "Return valid JSON only -- no markdown fences, no commentary."

## Say What To Do, Not What Not To Do

"Keep responses under 100 words" outperforms "Don't write long responses." Positive instructions give the model a target; negative ones leave the target ambiguous.

## Eliminate Contradictions

Conflicting instructions waste reasoning tokens as the model tries to satisfy both. Audit your prompt for tension between instructions (e.g., "be concise" vs. "explain thoroughly"). Resolve contradictions explicitly with priority ordering.

## Conciseness

Every instruction that doesn't measurably improve output is noise. Remove instructions that aren't pulling their weight. Shorter prompts are cheaper, faster, and often more effective.

## Constraint Placement

Place constraints and guardrails toward the end of the prompt. Models weight later instructions more heavily during generation (recency bias). Critical rules belong near the bottom.

## Personality vs. Controls

Separate persistent personality traits (tone, role, expertise level) from per-response controls (format, length, specific task). Personality goes at the top; task-specific controls go with the task.

## Cross-Model Testing

What works for one model may fail on another. Test across your target models. Larger models tolerate ambiguity; smaller models need more explicit structure. Always verify on the cheapest model you intend to deploy on.
