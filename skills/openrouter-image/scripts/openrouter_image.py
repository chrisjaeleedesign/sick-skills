#!/usr/bin/env python3
"""OpenRouter image generation/editing wrapper over the shared runtime."""

import argparse
import json
import os
import sys
from pathlib import Path

SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
REPO_ROOT = SKILL_DIR.parent.parent

sys.path.insert(0, str(REPO_ROOT / "scripts"))

from messages import build_messages_for_api
from model_runtime import (
    call_model,
    collect_attachments,
    default_model_for_role,
    load_config,
    load_env,
    normalize_response,
    resolve_content,
    resolve_model_info,
)

load_env(REPO_ROOT)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Generate or edit images through OpenRouter image models."
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Image model alias. Default comes from default_image_model.",
    )
    parser.add_argument(
        "--content",
        required=True,
        help="Image prompt: literal string, file path, or '-' for stdin.",
    )
    parser.add_argument(
        "--attach",
        action="append",
        default=[],
        help="Reference/source image path. Repeatable.",
    )
    parser.add_argument(
        "--output-dir",
        default=None,
        help="Directory for saved images. Default: .agents/model-calls/images.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print normalized JSON output.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    config = load_config()
    model_str = args.model or default_model_for_role(config, "image")
    resolution = resolve_model_info(model_str, config)

    if resolution.provider != "openrouter" or "image" not in resolution.capabilities:
        print(
            "Error: openrouter-image requires an OpenRouter image-capable model.",
            file=sys.stderr,
        )
        sys.exit(2)

    if args.output_dir:
        os.environ["MODEL_RUNTIME_IMAGE_DIR"] = str(Path(args.output_dir).resolve())

    content = resolve_content(args.content)
    if not content.strip():
        print("Error: content is empty.", file=sys.stderr)
        sys.exit(2)

    attachments = collect_attachments(args.attach)
    messages = build_messages_for_api(
        [],
        None,
        content,
        attachments,
        config=config,
        summary_cache=None,
        call_model_fn=call_model,
    )

    try:
        response = call_model(model_str, config, messages)
    except Exception as e:
        print(
            f"Error calling {resolution.provider}/{resolution.model_id}: {e}",
            file=sys.stderr,
        )
        sys.exit(1)

    normalized = normalize_response(response, resolution)
    if args.json:
        print(json.dumps(normalized, indent=2))
        return

    if normalized["text"]:
        print(normalized["text"])
    for image_path in normalized["images"]:
        print(image_path)


if __name__ == "__main__":
    main()
