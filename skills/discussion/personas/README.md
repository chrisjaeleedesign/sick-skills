# Thinking Personas

Personas provide different thinking lenses. They're activated by saying **"DeepThink"** or **"UltraThink"** during a discussion.

## How It Works

When activated, present each persona's perspective on the current topic:

```markdown
### Devil's Advocate
[Challenge assumptions, find holes]

### Boss
[Business value, priorities]

### Big Picture
[Long-term implications]

---
**Synthesis**: [Combine insights into actionable takeaway]
```

## Adding New Personas

1. Create a new `.md` file in this directory
2. Define:
   - **Role**: One-line description
   - **Lens**: What perspective does this persona bring?
   - **Questions**: What does this persona always ask?
   - **Example**: Sample output

3. Add to the table in `SKILL.md`

## Current Personas

| Persona | File | Focus |
|---------|------|-------|
| Devil's Advocate | `devils-advocate.md` | Challenge, stress-test |
| Boss | `boss.md` | Business value, resources |
| Big Picture | `big-picture.md` | Architecture, long-term |

## Ideas for Future Personas

- **User Advocate**: What would the end-user think?
- **Security Skeptic**: What could go wrong?
- **Pragmatist**: What's the simplest thing that works?
- **Perfectionist**: What would the ideal solution look like?
- **Historian**: What have we tried before? What failed?
