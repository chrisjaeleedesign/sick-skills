#!/usr/bin/env python3
"""
ask.py — Call external models via OpenRouter or OpenAI.

A general-purpose pipe for coding agents to call external models.
Handles CLI parsing, conversation file management, provider routing,
and multimodal attachments. Providers are thin modules that just make
API calls and return text.

Usage:
    python3 ask.py --model gpt5 --content "What do you think?"
    python3 ask.py --model gemini --content prompt.md --attach image.png
    python3 ask.py --continue conversation.jsonl --content "Follow up"
    python3 ask.py --branch conversation.jsonl --from 2 --content "New direction"
    python3 ask.py --show conversation.jsonl
"""

import argparse
import base64
import hashlib
import importlib
import json
import mimetypes
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import yaml
from dotenv import load_dotenv

# Resolve real path (through symlinks) to find repo root
SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
REPO_ROOT = SKILL_DIR.parent.parent  # skills/ask-model -> skills -> repo root

# Load .env from repo root
load_dotenv(REPO_ROOT / ".env")

# Add scripts dir to path for provider imports
sys.path.insert(0, str(SCRIPT_DIR))

PROVIDERS = {
    "openai": "providers.openai_provider",
    "openrouter": "providers.openrouter",
}


def load_config():
    """Load config.yaml from skill directory."""
    config_path = SKILL_DIR / "config.yaml"
    if not config_path.exists():
        print(f"Error: config not found at {config_path}", file=sys.stderr)
        sys.exit(2)
    with open(config_path) as f:
        return yaml.safe_load(f)


def resolve_model(model_str, config):
    """Resolve a model alias or full ID to (provider, model_id)."""
    aliases = config.get("aliases", {})

    # Check aliases first
    if model_str in aliases:
        full_id = aliases[model_str]
    else:
        full_id = model_str

    # Split provider/model
    if "/" not in full_id:
        print(
            f"Error: cannot resolve model '{model_str}'. "
            f"Use an alias ({', '.join(aliases.keys())}) or provider/model format.",
            file=sys.stderr,
        )
        sys.exit(2)

    parts = full_id.split("/", 1)
    provider = parts[0]
    model_id = parts[1]

    if provider not in PROVIDERS:
        print(
            f"Error: unknown provider '{provider}'. Known: {', '.join(PROVIDERS.keys())}",
            file=sys.stderr,
        )
        sys.exit(2)

    return provider, model_id


def resolve_content(content_arg):
    """Resolve --content value: stdin, file path, or literal string."""
    if content_arg == "-":
        return sys.stdin.read()

    content_path = Path(content_arg)
    if content_path.exists() and content_path.is_file():
        return content_path.read_text()

    # Treat as literal string
    return content_arg


def collect_attachments(attach_paths):
    """Validate attachment paths and detect mime types."""
    attachments = []
    for path_str in (attach_paths or []):
        path = Path(path_str)
        if not path.exists():
            print(f"Warning: attachment not found: {path_str}", file=sys.stderr)
            continue
        mime, _ = mimetypes.guess_type(str(path))
        if mime is None:
            mime = "application/octet-stream"
        attachments.append({"path": str(path.resolve()), "mime": mime})
    return attachments


# --- Conversation file management ---


def conversation_dir():
    """Get the model-calls directory in the current workspace."""
    d = Path.cwd() / ".agents" / "model-calls"
    d.mkdir(parents=True, exist_ok=True)
    return d


def generate_id(content):
    """Generate a short hash ID from content."""
    return hashlib.sha256(content.encode()).hexdigest()[:8]


def create_conversation(conv_id, model, provider, system_prompt, tags):
    """Create a new conversation file with metadata. Returns the path."""
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    filename = f"{date_str}_{conv_id}.jsonl"
    path = conversation_dir() / filename

    # Avoid collisions
    counter = 1
    while path.exists():
        filename = f"{date_str}_{conv_id}_{counter}.jsonl"
        path = conversation_dir() / filename
        counter += 1

    meta = {
        "type": "meta",
        "id": conv_id,
        "model": model,
        "provider": provider,
        "created": datetime.now(timezone.utc).isoformat(),
        "updated": datetime.now(timezone.utc).isoformat(),
        "parent": None,
        "branch_from": None,
        "exchanges": 0,
        "tags": tags or [],
        "system_prompt": (system_prompt[:200] if system_prompt else None),
    }

    with open(path, "w") as f:
        f.write(json.dumps(meta) + "\n")

    return path


def load_conversation(path):
    """Load a conversation file. Returns (meta, messages)."""
    path = Path(path)
    if not path.exists():
        print(f"Error: conversation file not found: {path}", file=sys.stderr)
        sys.exit(2)

    lines = path.read_text().strip().split("\n")
    if not lines:
        print(f"Error: conversation file is empty: {path}", file=sys.stderr)
        sys.exit(2)

    meta = json.loads(lines[0])
    messages = [json.loads(line) for line in lines[1:]]
    return meta, messages


def append_exchange(path, user_msg, assistant_msg, new_tags=None):
    """Append an exchange and update metadata."""
    path = Path(path)
    lines = path.read_text().strip().split("\n")
    meta = json.loads(lines[0])

    # Update metadata
    meta["exchanges"] = meta.get("exchanges", 0) + 1
    meta["updated"] = datetime.now(timezone.utc).isoformat()
    if new_tags:
        existing = set(meta.get("tags", []))
        existing.update(new_tags)
        meta["tags"] = sorted(existing)

    # Update model/provider if different from original
    if "model" in user_msg:
        meta["model"] = user_msg.get("model", meta["model"])

    # Rewrite file: updated meta + existing messages + new exchange
    exchange_num = meta["exchanges"]
    user_msg["exchange"] = exchange_num
    assistant_msg["exchange"] = exchange_num

    lines[0] = json.dumps(meta)
    lines.append(json.dumps(user_msg))
    lines.append(json.dumps(assistant_msg))

    path.write_text("\n".join(lines) + "\n")


def branch_conversation(source_path, from_exchange, new_id=None):
    """Branch a conversation from a specific exchange. Returns new file path."""
    source_path = Path(source_path)
    meta, messages = load_conversation(source_path)

    # Filter messages up to and including the target exchange
    kept_messages = [m for m in messages if m.get("exchange", 0) <= from_exchange]

    # Create new file
    date_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
    branch_id = new_id or f"{meta['id']}_branch-{from_exchange}"
    filename = f"{date_str}_{branch_id}.jsonl"
    new_path = conversation_dir() / filename

    # Update metadata for branch
    new_meta = dict(meta)
    new_meta["id"] = branch_id
    new_meta["created"] = datetime.now(timezone.utc).isoformat()
    new_meta["updated"] = datetime.now(timezone.utc).isoformat()
    new_meta["parent"] = f"{source_path.name}#exchange-{from_exchange}"
    new_meta["branch_from"] = f"{source_path.name}#exchange-{from_exchange}"
    new_meta["exchanges"] = from_exchange

    with open(new_path, "w") as f:
        f.write(json.dumps(new_meta) + "\n")
        for msg in kept_messages:
            f.write(json.dumps(msg) + "\n")

    return new_path


def show_conversation(path):
    """Pretty-print a conversation as readable markdown."""
    meta, messages = load_conversation(path)

    print(f"# Conversation: {meta['id']}")
    print(f"**Model:** {meta['model']} ({meta['provider']})")
    print(f"**Created:** {meta['created']}")
    print(f"**Exchanges:** {meta['exchanges']}")
    if meta.get("tags"):
        print(f"**Tags:** {', '.join(meta['tags'])}")
    if meta.get("parent"):
        print(f"**Branched from:** {meta['parent']}")
    if meta.get("system_prompt"):
        print(f"\n**System prompt:** {meta['system_prompt']}")
    print()

    current_exchange = 0
    for msg in messages:
        exchange = msg.get("exchange", 0)
        if exchange != current_exchange:
            current_exchange = exchange
            print(f"---\n### Exchange {exchange}\n")

        role = msg.get("type", "unknown")
        content = msg.get("content", "")

        if role == "user":
            print(f"**User:**\n{content}\n")
            attachments = msg.get("attachments", [])
            if attachments:
                print("**Attachments:**")
                for att in attachments:
                    print(f"  - {att['path']} ({att['mime']})")
                print()
        elif role == "assistant":
            print(f"**Assistant:**\n{content}\n")


def build_messages_for_api(messages, system_prompt, current_content, current_attachments):
    """Convert stored messages + current input into provider-ready format."""
    api_messages = []

    # System prompt as first message
    if system_prompt:
        api_messages.append({"role": "system", "content": system_prompt})

    # Historical messages
    for msg in messages:
        role = "user" if msg["type"] == "user" else "assistant"
        content_parts = []

        # Text content
        if msg.get("content"):
            content_parts.append({"type": "text", "text": msg["content"]})

        # Re-encode historical attachments
        for att in msg.get("attachments", []):
            att_path = Path(att["path"])
            if not att_path.exists():
                print(
                    f"Warning: historical attachment missing: {att['path']}",
                    file=sys.stderr,
                )
                continue
            encoded = encode_attachment(att["path"], att["mime"])
            if encoded:
                content_parts.append(encoded)

        # If only text and no attachments, use simple string format
        if len(content_parts) == 1 and content_parts[0]["type"] == "text":
            api_messages.append({"role": role, "content": content_parts[0]["text"]})
        elif content_parts:
            api_messages.append({"role": role, "content": content_parts})

    # Current user message
    current_parts = []
    if current_content:
        current_parts.append({"type": "text", "text": current_content})
    for att in current_attachments:
        encoded = encode_attachment(att["path"], att["mime"])
        if encoded:
            current_parts.append(encoded)

    if len(current_parts) == 1 and current_parts[0]["type"] == "text":
        api_messages.append({"role": "user", "content": current_parts[0]["text"]})
    elif current_parts:
        api_messages.append({"role": "user", "content": current_parts})

    return api_messages


def encode_attachment(file_path, mime_type):
    """Encode a file as a base64 content part for the API."""
    path = Path(file_path)
    if not path.exists():
        return None

    if mime_type.startswith("image/"):
        data = base64.b64encode(path.read_bytes()).decode("utf-8")
        return {
            "type": "image_url",
            "image_url": {"url": f"data:{mime_type};base64,{data}"},
        }
    elif mime_type.startswith("video/"):
        data = base64.b64encode(path.read_bytes()).decode("utf-8")
        return {
            "type": "video_url",
            "video_url": {"url": f"data:{mime_type};base64,{data}"},
        }
    else:
        # For other file types, include as text if possible
        try:
            text = path.read_text()
            return {"type": "text", "text": f"[File: {path.name}]\n{text}"}
        except (UnicodeDecodeError, ValueError):
            print(
                f"Warning: cannot encode non-media attachment: {file_path}",
                file=sys.stderr,
            )
            return None


def parse_args():
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Call external models via OpenRouter or OpenAI."
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Model alias (gpt5, o3, sonnet, etc.) or provider/model-id.",
    )
    parser.add_argument(
        "--content",
        default=None,
        help="Prompt: literal string, file path, or '-' for stdin.",
    )
    parser.add_argument(
        "--system-prompt",
        default=None,
        help="Path to system instruction file.",
    )
    parser.add_argument(
        "--attach",
        action="append",
        default=[],
        help="Path to attachment (image, video, file). Repeatable.",
    )
    parser.add_argument(
        "--id",
        default=None,
        help="Name for the conversation file.",
    )
    parser.add_argument(
        "--tag",
        action="append",
        default=[],
        help="Tag for categorization. Repeatable.",
    )
    # Conversation management — use dest to avoid Python keyword conflicts
    parser.add_argument(
        "--continue",
        dest="continue_path",
        default=None,
        help="Path to conversation file to continue.",
    )
    parser.add_argument(
        "--branch",
        default=None,
        help="Path to conversation file to branch from.",
    )
    parser.add_argument(
        "--from",
        dest="from_exchange",
        type=int,
        default=None,
        help="Exchange number to branch from (required with --branch).",
    )
    parser.add_argument(
        "--show",
        default=None,
        help="Path to conversation file to display.",
    )
    parser.add_argument(
        "--thinking",
        default=None,
        choices=["none", "minimal", "low", "medium", "high", "xhigh"],
        help="Reasoning effort level for models that support it (e.g. o3).",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    config = load_config()

    # --- Handle --show ---
    if args.show:
        show_conversation(args.show)
        sys.exit(0)

    # --- Validate inputs ---
    if args.content is None:
        print("Error: --content is required.", file=sys.stderr)
        sys.exit(2)

    if args.branch and args.from_exchange is None:
        print("Error: --branch requires --from.", file=sys.stderr)
        sys.exit(2)

    # --- Resolve model ---
    model_str = args.model or config.get("default_model", "gpt5")
    provider_name, model_id = resolve_model(model_str, config)

    # --- Resolve content ---
    content = resolve_content(args.content)
    if not content.strip():
        print("Error: content is empty.", file=sys.stderr)
        sys.exit(2)

    # --- Read system prompt ---
    system_prompt = None
    if args.system_prompt:
        sp_path = Path(args.system_prompt)
        if not sp_path.exists():
            print(
                f"Error: system prompt file not found: {args.system_prompt}",
                file=sys.stderr,
            )
            sys.exit(2)
        system_prompt = sp_path.read_text()

    # --- Collect attachments ---
    attachments = collect_attachments(args.attach)

    # --- Determine conversation mode ---
    history_messages = []
    conv_path = None

    if args.continue_path:
        # Continue existing conversation
        conv_path = Path(args.continue_path)
        meta, history_messages = load_conversation(conv_path)
        # Use system prompt from original if not overridden
        if system_prompt is None and meta.get("system_prompt"):
            system_prompt = meta["system_prompt"]

    elif args.branch:
        # Branch from existing conversation
        conv_path = branch_conversation(
            args.branch, args.from_exchange, args.id
        )
        meta, history_messages = load_conversation(conv_path)
        if system_prompt is None and meta.get("system_prompt"):
            system_prompt = meta["system_prompt"]

    else:
        # New conversation
        conv_id = args.id or generate_id(content)
        conv_path = create_conversation(
            conv_id, model_id, provider_name, system_prompt, args.tag
        )

    # --- Build API messages ---
    api_messages = build_messages_for_api(
        history_messages, system_prompt, content, attachments
    )

    # --- Call provider ---
    try:
        provider_module = importlib.import_module(PROVIDERS[provider_name])
        response_text = provider_module.call(
            messages=api_messages,
            model=model_id,
            system_prompt=None,  # Already included in api_messages
            attachments=[],  # Already encoded in api_messages
            thinking=args.thinking,
        )
    except Exception as e:
        print(f"Error calling {provider_name}/{model_id}: {e}", file=sys.stderr)
        sys.exit(1)

    # --- Save exchange ---
    user_msg = {
        "type": "user",
        "content": content,
        "attachments": [
            {"path": a["path"], "mime": a["mime"]} for a in attachments
        ],
    }
    assistant_msg = {
        "type": "assistant",
        "content": response_text,
    }
    append_exchange(conv_path, user_msg, assistant_msg, args.tag)

    # --- Output ---
    print(response_text)
    print(f"\n---\nconversation: {conv_path}")


if __name__ == "__main__":
    main()
