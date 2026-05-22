# Image Generation

Generate or edit images using image-capable models via the ask CLI.

## Step 1: Determine the request

Classify what the user wants:

- **Generate from text** — "draw a cat", "create an image of a sunset", "make a logo"
- **Edit/transform an existing image** — "make this look like a painting", "remove the background", "turn this into pixel art"
- **Image with reference** — "create something like this but in blue", "use this as inspiration"

If the user provides reference images (files, paths, or URLs), you'll pass them as attachments.

## Step 2: Choose the model

Default to `nanobanana` (Nano Banana 2 / Gemini 3.1 Flash Image) unless:
- User explicitly requests another model (e.g. "use gpt-image")
- The task requires a specific model's strengths

Available image models:
| Alias | Model | Notes |
|-------|-------|-------|
| `nanobanana` | Gemini 3.1 Flash Image | Fast, good quality, handles text-to-image and image editing |
| `gpt-image` | GPT-5 Image | OpenAI's image generation |

## Step 3: Build and run the command

**Text-to-image (no reference images):**
```bash
python3 ~/.claude/skills/ask/scripts/ask.py \
  --model nanobanana \
  --content "Generate an image: [user's description]"
```

**Image editing / with reference images:**
```bash
python3 ~/.claude/skills/ask/scripts/ask.py \
  --model nanobanana \
  --content "Edit this image: [user's instructions]" \
  --attach /path/to/reference.png
```

Multiple reference images can be attached by repeating `--attach`:
```bash
  --attach image1.png --attach image2.png
```

**Prompting tips for better results:**
- Be specific about style, composition, and details
- For edits, clearly describe what should change and what should stay
- Include aspect ratio or size preferences if the user mentioned them

## Step 4: Handle the response

The provider saves generated images to `.agents/model-calls/images/` and returns their paths.

- If the response is a dict with an `images` key, show the user the image paths
- Use the Read tool to display the image(s) to the user so they can see the result
- If the response includes text alongside the image, show that too

## Step 5: Offer next steps

After showing the result:
- "Want me to adjust anything?" (re-run with modified prompt)
- "Want to try a different model?" (switch between nanobanana / gpt-image)
- "Want to use this as a starting point for another edit?" (chain --attach with the output)

Image models can iterate — the output of one generation can be fed back as input for refinement.
