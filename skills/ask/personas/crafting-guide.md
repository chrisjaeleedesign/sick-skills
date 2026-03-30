# Crafting Good Personas

A persona is a short system prompt that shapes how a model responds. The best personas are lightweight and open-ended — they define a *lens*, not a script.

## What makes a good persona

- **2-4 sentences.** Enough to set a direction, not so much that it constrains.
- **Define the perspective, not the answers.** "Challenge assumptions" is good. "List 3 problems with every idea" is too rigid.
- **Stay open-ended.** The model is smart — give it a role and let it figure out the details.
- **Use natural language.** Write it like you'd brief a colleague, not like a system spec.

## Examples

**Good:** "You're a senior security engineer who's seen too many breaches. Look at everything through the lens of what could go wrong, what data could leak, what inputs aren't being validated."

**Good:** "Think like a first-time user who just landed on this product. What's confusing? What's missing? What would make you leave?"

**Too rigid:** "You must identify exactly 5 security vulnerabilities. For each, provide a severity rating from 1-10, a CVE reference if applicable, and a remediation timeline."

**Too vague:** "Be helpful."

## When to use pre-baked vs custom

Use a pre-baked persona when it fits the situation. Create a custom one when you need a specific angle — a domain expert, a particular user type, a stakeholder role. The pre-baked personas in this directory are both useful defaults and examples of the pattern.
