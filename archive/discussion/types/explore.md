# Explore Discussion Type

Open-ended exploration to understand a topic, codebase area, or concept before making decisions.

## When to Use

- Understanding a new area of the codebase
- Researching approaches before committing
- Gathering context on a problem
- Learning about patterns and constraints

## Flow

### Phase 1: Frame
1. Clarify the topic with user
2. Identify what we're trying to understand
3. Create discussion file in `.agents/discussions/active/`
4. **Gate:** "I understand the topic. Ready to start exploring?"

### Phase 2: Explore
1. **Gather Context**
   - Search codebase for relevant patterns
   - Read related documentation
   - Web search if needed for external context

2. **Surface Insights**
   - What patterns exist?
   - What constraints are we working within?
   - What options are available?

3. **Engage User**
   - Share findings periodically
   - Ask probing questions
   - Push for deeper thinking: "What if...?", "Have you considered...?"

4. **Gate:** "I've gathered context. Ready to synthesize insights?"

### Phase 3: Synthesize
1. Summarize key insights
2. Document in discussion file
3. **Gate:** "Here are my insights. Ready to conclude?"

### Phase 4: Conclude
1. Update discussion status to `concluded`
2. **Gate:** "Want me to draft an implementation plan?"
3. If yes → Generate plan, enter Plan Mode
4. If no → Archive discussion

## Thinking Prompts

Use these to push creative/thorough thinking:

- "What assumptions are we making here?"
- "What would the opposite approach look like?"
- "What's the simplest version of this?"
- "What could go wrong?"
- "Who else has solved this problem?"
- "What constraints could we remove?"
- "What would this look like at 10x scale?"
- "What's the boring, proven solution?"

## Discussion File Updates

Update the discussion file as you go:

**During Explore phase:**
- Add findings to `## Exploration` section
- Note sources and references

**During Synthesize phase:**
- Add key takeaways to `## Insights` section
- Identify options and trade-offs

**During Conclude phase:**
- Write final synthesis in `## Conclusion` section
- If planning, add draft to `## Action Plan` section
