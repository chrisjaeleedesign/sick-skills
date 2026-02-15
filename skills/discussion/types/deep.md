# Deep Think Discussion Type

Multi-agent parallel thinking that explores a problem from multiple perspectives simultaneously.

## When to Use

- Complex problems with many unknowns
- When you want to avoid blind spots
- Important decisions that benefit from diverse viewpoints
- When single-threaded thinking feels limiting
- High-stakes decisions where thorough exploration matters

## Flow

### Phase 1: Frame
1. Clarify the topic with user
2. Create discussion file with type: `deep`
3. Announce: "Entering DEEP THINK mode - launching 4 thinking agents in parallel"
4. **Gate:** "Ready to launch the thinking agents?"

### Phase 2: Parallel Exploration
Launch 4 subagents via Task tool simultaneously:

**Agent 1: Devils Advocate**
```
Analyze this problem/idea: [TOPIC]

Your role: Devils Advocate
- Challenge every assumption
- Find weaknesses and failure modes
- Ask "what could go wrong?"
- Identify hidden risks
- Be constructively critical

Context from discussion: [DISCUSSION_CONTEXT]

Return a structured analysis with:
1. Key assumptions being made
2. Potential failure modes
3. Risks and concerns
4. Questions that should be answered
```

**Agent 2: Brainstorm Partner**
```
Explore this problem/idea: [TOPIC]

Your role: Brainstorm Partner
- Generate diverse options and approaches
- Include unconventional/wild ideas
- "Yes, and..." energy
- Quantity over quality initially
- Don't self-censor

Context from discussion: [DISCUSSION_CONTEXT]

Return a structured exploration with:
1. List of possible approaches (aim for 5-10)
2. Creative/unconventional ideas
3. Combinations and variations
4. "What if..." possibilities
```

**Agent 3: Pragmatist**
```
Evaluate this problem/idea: [TOPIC]

Your role: Pragmatist
- Assess feasibility and constraints
- Consider implementation realities
- Identify resource requirements
- What's the minimum viable approach?
- Consider effort vs. impact

Context from discussion: [DISCUSSION_CONTEXT]

Return a structured evaluation with:
1. Key constraints and limitations
2. Resource requirements
3. Implementation complexity
4. Quick wins vs. long-term investments
```

**Agent 4: Analogist**
```
Research this problem/idea: [TOPIC]

Your role: Analogist
- Find similar problems in other domains
- What patterns exist from past solutions?
- Who has solved something like this before?
- What can we learn from adjacent fields?
- Look for transferable insights

Context from discussion: [DISCUSSION_CONTEXT]

Return a structured research summary with:
1. Similar problems and how they were solved
2. Relevant patterns and best practices
3. Examples from other domains
4. Transferable insights
```

### Phase 3: Synthesis
1. Collect all 4 agent responses
2. Identify:
   - Common themes across perspectives
   - Contradictions to resolve
   - Unexpected insights
   - Key risks and opportunities
3. Create unified synthesis in discussion file
4. **Gate:** "We have perspectives from all 4 angles. Want to explore deeper, or synthesize conclusions?"

### Phase 4: Iterate or Conclude
If deeper exploration requested:
- Can launch focused agents on specific aspects
- Can re-run with refined questions
- Can combine perspectives for new prompts

If concluding:
1. Write final synthesis
2. **Gate:** "Want me to draft an implementation plan?"
3. If yes → Generate plan, enter Plan Mode
4. If no → Archive discussion

## Agent Perspective Summary

| Agent | Focus | Key Question |
|-------|-------|--------------|
| **Devils Advocate** | Risks, assumptions, failure modes | "What could go wrong?" |
| **Brainstorm Partner** | Options, creativity, possibilities | "What are all the ways?" |
| **Pragmatist** | Feasibility, constraints, effort | "What's realistic?" |
| **Analogist** | Patterns, precedents, lessons | "Who's done this before?" |

## Discussion File Updates

**During Phase 2:**
- Add each agent's response to `## Exploration` section
- Label clearly by perspective

**During Phase 3:**
- Add synthesis to `## Insights` section
- Note areas of agreement and conflict
- Highlight unexpected findings

**During Phase 4:**
- Write final conclusions in `## Conclusion` section
- If planning, add draft to `## Action Plan` section
