# Status — Show Current State

When invoked with no arguments and `.agents/design/` exists, read the manifest and display a brief summary:

## Steps

1. **Read manifest** to get current family, sections, and families.

2. **Display summary** in this format:

> **Current:** {family name} v{N} — "{direction}"
>
> **Sections:**
> - **{section name}** {🎯 if focused} — {family1}, {family2}
> - {section name} — {family1}
>
> **Unsorted:** {family1}, {family2} _(or "none")_
>
> **Archived:** _{name}_, _{name}_ _(or "none")_

3. **Check Agentation** for pending annotations — if any exist, mention: "You have {N} pending annotations from the browser."

4. **Prompt:** "What would you like to do? Describe a direction to iterate, or say 'new' to start a fresh concept."
