---
name: write
description: Write copy for any audience and format using workspace source material and writing preferences. Story mode develops the narrative. Draft mode writes the first version. Refine mode runs it through Gemini for clean output. Invoke with `/write` followed by a mode.
---

# Write

Write copy for any audience and format — through story, draft, and refine.

## Modes

| Mode | Trigger | What it does |
|------|---------|--------------|
| **story** | `/write story <description>` | Develop the narrative: purpose, reader, angle, structure. Produces a story brief. |
| **draft** | `/write <audience> <description>` | Write a first draft using KB content + learnings + optional story brief |
| **refine** | `/write refine <instruction>` | Run the current draft through Gemini with a writing style prompt |
| **learn** | `/write learn [source]` | Extract writing preferences from conversations, persist as learnings |
| **file** | `/write file [path]` | Save finished copy to the writing system for future reference |
| **help** | `/write help` | Show this usage guide |

## Router

Parse the user's input and route to the correct mode:

1. **`help`** — If the argument is "help" or the user asks how to use `/write`, show the usage guide below.

2. **`story`** — If the argument starts with "story", load `modes/story.md` and follow its instructions.

3. **`refine`** — If the argument starts with "refine" or "polish", load `modes/refine.md` and follow its instructions. Everything after "refine" is the refinement instruction.

4. **`learn`** — If the argument starts with "learn" or "learn from", load `modes/learn.md` and follow its instructions.

5. **`file`** — If the argument starts with "file", load `modes/file.md` and follow its instructions. If a file path follows "file", pass it as the source.

6. **Draft (default)** — If the input contains an audience (investor, customer, technical, general) or a writing task description, load `modes/draft.md` and follow its instructions.

7. **Ambiguous** — If you can't tell which mode the user wants, ask:
   > "Which mode? **story** (develop the narrative), **draft** (write it), **refine** (polish through Gemini), **learn** (extract preferences), or **file** (archive finished copy)?"

## Typical flow

```
/write story cold email to pre-seed funds     → story brief
/write investor cold email based on brief      → first draft
/write refine tighten the prose                → Gemini-polished output
/write learn                                   → extract preferences
/write file                                    → archive the final version
```

Each step is independent — you can jump in anywhere. But story → draft → refine is the intended progression for high-stakes pieces.

## Usage guide

```
/write story <description>
/write <audience> <description>
/write refine <instruction>
/write learn
/write learn from <file or conversation>
/write file
/write file <path>
/write help
```

**Story examples:**
- `/write story cold email to pre-seed AI funds`
- `/write story homepage hero rewrite`
- `/write story YC application narrative`

**Draft examples:**
- `/write investor cold email to a pre-seed fund`
- `/write customer landing page hero section`
- `/write technical blog post about our architecture choices`
- `/write general one-paragraph company description`

**Refine examples:**
- `/write refine tighten the prose`
- `/write refine shorter and more concrete`
- `/write refine warmer, less corporate`
- `/write refine` — general polish

**Learn examples:**
- `/write learn` — extract learnings from the current conversation
- `/write learn from .artifacts/01_outreach/some-transcript.md` — extract from a file

**File examples:**
- `/write file` — file the finished copy from this conversation
- `/write file .artifacts/01_outreach/some-email.md` — file copy from an existing file

