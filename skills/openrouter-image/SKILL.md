---
name: openrouter-image
description: "Generate or edit images with OpenRouter image-capable models through the shared sick-skills model runtime. Use when the user explicitly wants OpenRouter image generation/editing, Nano Banana, GPT image through OpenRouter, or asks for this skill by name. Do not use for generic Codex image generation unless the user specifically wants OpenRouter."
---

# openrouter-image

Generate or edit raster images through OpenRouter image models using the shared model runtime.

User's request: $ARGUMENTS

## Route

- Use this skill only for OpenRouter image-generation or image-editing requests.
- For generic image requests without an OpenRouter preference, use Codex's built-in image generation path instead.
- Do not call `ask`; skills should not call other skills.
- Use `scripts/openrouter_image.py`, which wraps the shared `scripts/model_call.py` runtime.

## Models

Image aliases live in `config/models.yaml`.

| Alias | Best for |
|-------|----------|
| `nanobanana` | Default image generation/editing |
| `gpt-image` | OpenAI image model through OpenRouter |

## Commands

Generate:

```bash
python3 /Volumes/Misc/sick-skills/skills/openrouter-image/scripts/openrouter_image.py \
  --content "A clean product render of a matte black accountability device on a white desk"
```

Edit/reference:

```bash
python3 /Volumes/Misc/sick-skills/skills/openrouter-image/scripts/openrouter_image.py \
  --content "Keep the layout, change the device to translucent blue plastic" \
  --attach /absolute/path/reference.png
```

Use a specific model:

```bash
python3 /Volumes/Misc/sick-skills/skills/openrouter-image/scripts/openrouter_image.py \
  --model gpt-image \
  --content "Minimal editorial hero image for an AI accountability coach"
```

JSON output:

```bash
python3 /Volumes/Misc/sick-skills/skills/openrouter-image/scripts/openrouter_image.py \
  --json \
  --content "A square app icon, pebble shape, clean high-contrast background"
```

## Output

Images are saved under `.agents/model-calls/images/` by default. Return the absolute image path(s) to the user. In Codex desktop, show the image with Markdown when useful:

```markdown
![generated image](/absolute/path/to/image.png)
```

## Prompting Rules

- State the image type, subject, composition, style, lighting, and constraints.
- For edits, attach the source image and explicitly say what must stay unchanged.
- Use `--output-dir` when the user wants images somewhere other than `.agents/model-calls/images/`.
- Do not invent a browser UI or separate testing flow.
