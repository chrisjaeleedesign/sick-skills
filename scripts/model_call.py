#!/usr/bin/env python3
"""Low-level CLI for one-off model runtime calls."""

import argparse
import json
import sys
from pathlib import Path

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

SCRIPT_DIR = Path(__file__).resolve().parent
REPO_ROOT = SCRIPT_DIR.parent

load_env(REPO_ROOT)


def parse_args():
    parser = argparse.ArgumentParser(
        description="Call a configured model through the shared model runtime."
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Model alias or provider/model-id. Defaults by --role.",
    )
    parser.add_argument(
        "--role",
        choices=["default", "summarizer", "image"],
        default="default",
        help="Default model role to use when --model is omitted.",
    )
    parser.add_argument(
        "--content",
        required=True,
        help="Prompt: literal string, file path, or '-' for stdin.",
    )
    parser.add_argument(
        "--system-prompt",
        default=None,
        help="System prompt: literal string, file path, or '-' for stdin.",
    )
    parser.add_argument(
        "--attach",
        action="append",
        default=[],
        help="Attachment path. Repeatable.",
    )
    parser.add_argument(
        "--thinking",
        choices=["none", "minimal", "low", "medium", "high", "xhigh"],
        default=None,
        help="Reasoning effort for models that support it.",
    )
    parser.add_argument(
        "--config",
        default=None,
        help="Override model registry YAML path.",
    )
    parser.add_argument(
        "--json",
        action="store_true",
        help="Print normalized JSON instead of plain text plus image paths.",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    config = load_config(args.config)

    model_str = args.model or default_model_for_role(config, args.role)
    resolution = resolve_model_info(model_str, config)

    content = resolve_content(args.content)
    if not content.strip():
        print("Error: content is empty.", file=sys.stderr)
        sys.exit(2)

    system_prompt = None
    if args.system_prompt:
        system_prompt = resolve_content(args.system_prompt)

    attachments = collect_attachments(args.attach)
    api_messages = build_messages_for_api(
        [],
        system_prompt,
        content,
        attachments,
        config=config,
        summary_cache=None,
        call_model_fn=call_model,
    )

    try:
        response = call_model(model_str, config, api_messages, thinking=args.thinking)
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
        print(f"[Image saved: {image_path}]")


if __name__ == "__main__":
    main()
