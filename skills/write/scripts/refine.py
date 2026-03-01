#!/usr/bin/env python3
"""
refine.py — Gemini API pipe for writing refinement.

Takes content (draft + instructions) and an optional system prompt (writing style),
sends them to Gemini, and prints the response. No intelligence — just a pipe.
The calling agent decides what to send.

Usage:
    python3 refine.py --content <path or ->
    python3 refine.py --system-prompt <path> --content <path or ->
    python3 refine.py --system-prompt <path> --content - < draft.md
"""

import argparse
import sys
from pathlib import Path

from dotenv import load_dotenv
from google import genai

# Load .env from the same directory as this script
SCRIPT_DIR = Path(__file__).resolve().parent
load_dotenv(SCRIPT_DIR.parent / ".env")


def main():
    parser = argparse.ArgumentParser(
        description="Send content to Gemini with an optional system prompt."
    )
    parser.add_argument(
        "--system-prompt",
        required=False,
        default=None,
        help="Path to the file used as Gemini system instruction. Optional.",
    )
    parser.add_argument(
        "--content",
        required=True,
        help="Path to user content file, or '-' to read from stdin.",
    )
    parser.add_argument(
        "--model",
        default="gemini-2.5-pro",
        help="Gemini model to use (default: gemini-2.5-pro).",
    )
    args = parser.parse_args()

    # Read system prompt if provided
    system_prompt = None
    if args.system_prompt:
        system_prompt = Path(args.system_prompt).read_text()

    # Read content from file or stdin
    if args.content == "-":
        content = sys.stdin.read()
    else:
        content = Path(args.content).read_text()

    if not content.strip():
        print("Error: content is empty.", file=sys.stderr)
        sys.exit(1)

    # Build config — include system instruction only if a prompt was provided
    config_kwargs = {}
    if system_prompt:
        config_kwargs["system_instruction"] = system_prompt
    config = genai.types.GenerateContentConfig(**config_kwargs)

    # Call Gemini
    client = genai.Client()
    response = client.models.generate_content(
        model=args.model,
        contents=content,
        config=config,
    )

    print(response.text)


if __name__ == "__main__":
    main()
