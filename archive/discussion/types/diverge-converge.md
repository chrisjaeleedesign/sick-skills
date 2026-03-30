# Diverge-Converge Discussion Type

Go broad to explore options, then narrow to a recommendation. The "double discussion" pattern.

## When to Use

- Making a significant decision with multiple valid approaches
- Designing a system or feature
- Evaluating trade-offs between options
- When you want to avoid premature commitment

## Flow

### Phase 1: Frame (Setup)
1. Clarify the decision or problem
2. Define success criteria
3. Create discussion file with type: `diverge-converge`
4. Announce: "Entering DIVERGE phase - we'll explore all options before narrowing"
5. **Gate:** "Ready to start diverging?"

### Phase 2: Diverge (Go Broad)
Goal: Generate as many viable options as possible without judgment.

1. **Brainstorm Options**
   - What are all the ways we could solve this?
   - What have others done?
   - What unconventional approaches exist?

2. **Research Each Option**
   - Explore codebase for existing patterns
   - Find examples in documentation
   - Web search for prior art

3. **Document Options**
   - List each option with brief description
   - No evaluation yet - just capture

4. **Push for More**
   - "What else haven't we considered?"
   - "What if we combined approaches?"
   - "What would a 10x solution look like?"

**Minimum:** 3 options before converging

5. **Gate:** "We have N options. Ready to converge, or explore more?"

### Phase 3: Converge (Narrow Down)
Goal: Evaluate options and arrive at a recommendation.

1. **Evaluation Criteria**
   - Revisit success criteria from Phase 1
   - Add any new criteria discovered during diverge

2. **Evaluate Each Option**
   - Pros and cons
   - Effort vs. impact
   - Risks and unknowns
   - Alignment with existing patterns

3. **Synthesize**
   - Rank options
   - Identify clear winner or top 2-3

4. **Recommend**
   - Clear recommendation with rationale
   - Acknowledge trade-offs
   - Note what we're giving up

5. **Gate:** "Here's my recommendation. Ready to conclude, or refine the thinking?"

### Phase 4: Conclude
1. Update discussion status to `concluded`
2. **Gate:** "Want me to draft an implementation plan?"
3. If yes → Generate plan, enter Plan Mode
4. If no → Archive discussion

## Thinking Prompts

### Diverge Phase
- "What would we do with unlimited resources?"
- "What's the controversial option no one wants to mention?"
- "How would [expert/company] approach this?"
- "What if we flipped the problem upside down?"
- "What's the lazy solution? The over-engineered one?"
- "What would we build if we had to ship in a day? A year?"

### Converge Phase
- "Which option do we have the most confidence in?"
- "What's the minimum viable version of each?"
- "Which option best fits existing patterns?"
- "What would we regret not trying?"
- "What option has the best learning-to-effort ratio?"
- "Which option keeps the most doors open?"

## Discussion File Updates

**During Diverge phase:**
- Add each option to `## Exploration` section
- Include brief description and source

**During Converge phase:**
- Add evaluation to `## Insights` section
- Document pros/cons for each option
- Note recommendation and rationale

**During Conclude phase:**
- Write final recommendation in `## Conclusion` section
- If planning, add draft to `## Action Plan` section
