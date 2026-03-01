# Story Mode

Figure out the narrative before writing anything. This is the ideation phase — what's the story, who's it for, why should they care, and how does it land?

The output is a **story brief** that feeds into draft and refine modes.

## When to use

Before drafting, when:
- The piece needs a clear narrative arc (not just "write an email")
- The audience, angle, or purpose isn't obvious
- Multiple valid approaches exist and the user needs to choose
- The piece is high-stakes and worth thinking through first

## Context

Read `.artifacts/.writing/registry.md` to understand what source material exists, then load KB files relevant to the topic. You need real facts to ground the story, not invented claims.

## The seven questions

Work through these with the user. Don't dump all seven at once — have a conversation. Start with whatever feels most uncertain.

| Question | What it reveals |
|----------|----------------|
| **Purpose** — What should this piece accomplish? | The success criteria. "They reply to the email" vs. "they understand our thesis." |
| **Reader** — Who specifically reads this? | Sophistication level, what they already know, what they care about. |
| **Core message** — If they remember one thing, what is it? | Forces prioritization. Everything else supports this. |
| **Emotional arc** — How should they feel at the start vs. end? | The emotional journey: curious → convinced, skeptical → intrigued, confused → clear. |
| **Evidence** — What proves the core message? | Specific facts, examples, traction, product behavior. Grounded in source material, not invented. |
| **Angle** — What makes this piece different from the obvious version? | The hook. Why this framing and not the default one. |
| **Structure** — What shape does this take? | Format, length, sections, flow. Determined by purpose + reader + medium. |

As the narrative takes shape, check claims against source material in the registry. Flag anything the user wants to claim that isn't backed by KB files — either it needs to be added first, or the claim needs to be softened.

## Brief template

```markdown
# Story Brief: <title>

**Date:** YYYY-MM-DD
**Purpose:** <what this piece should accomplish>
**Reader:** <who, specifically>
**Core message:** <the one thing they should remember>
**Emotional arc:** <start state → end state>

## Angle
<why this framing, not the default version>

## Evidence
<specific facts, examples, product behavior that support the core message>

## Structure
<format, sections, flow, approximate length>

## Constraints
<what to avoid, what the reader doesn't know, what would undermine credibility>

## Open questions
<anything still unresolved that the draft will need to handle>
```

## Example: completed brief

```markdown
# Story Brief: Pre-seed fund cold email

**Date:** 2026-02-15
**Purpose:** Get a reply and a 15-minute call. Not explain the whole product.
**Reader:** Pre-seed GP who sees 200 cold emails a week. Knows AI, knows SaaS, pattern-matches fast.
**Core message:** AI multiplied creation but broke coordination. We fix the coordination layer.
**Emotional arc:** Recognition ("I've seen this problem") → curiosity ("interesting angle") → willingness to reply

## Angle
Don't lead with "we built an AI workspace." Lead with the coordination problem — something the reader has experienced firsthand with their portfolio companies. The product is the answer, not the opening.

## Evidence
- Teams using ChatGPT + Slack + Notion lose context across tools (manifesto framing)
- Product keeps conversations, decisions, and plans in one shared context (current product)
- Two technical co-founders, both shipped production AI systems (team bios)

## Structure
Cold email. 80-120 words. One short paragraph on the problem, one on the product, one-line ask. Subject line under 8 words.

## Constraints
- No product screenshots or feature lists — too early for that
- Don't claim traction we don't have (check company status)
- Avoid "AI-native" and "next-generation" — every pitch uses these

## Open questions
- Should we mention the fundraise explicitly or keep it implicit?
```

## Saving the brief

Save to `.artifacts/.writing/briefs/YYYY-MM-DD-<slug>.md`. The slug should be short and descriptive: `investor-cold-email`, `homepage-hero`, `yc-application`. Create the `briefs/` directory if it doesn't exist.

After saving, suggest `/write draft` to write a first draft grounded in the brief.

## Guardrails

- **Don't write the copy.** Story mode produces a brief, not a draft.
- **Ground everything.** Every claim in the brief should trace to source material in the registry. If it doesn't exist, flag it.
- **Don't force all seven questions.** If the user knows exactly what they want, capture it and move on. The questions are tools, not a checklist.
- **Be opinionated.** If the user's angle is generic, say so. Push toward something specific and interesting.
