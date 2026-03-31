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
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

# Resolve real path (through symlinks) to find repo root
SCRIPT_DIR = Path(__file__).resolve().parent
SKILL_DIR = SCRIPT_DIR.parent
REPO_ROOT = SKILL_DIR.parent.parent  # skills/ask -> skills -> repo root

# Add shared scripts to path for imports
sys.path.insert(0, str(REPO_ROOT / "scripts"))

from core import (
    call_model,
    collect_attachments,
    load_config,
    load_env,
    resolve_content,
    resolve_model,
    PROVIDERS,
)
from messages import build_messages_for_api

# Load .env from repo root
load_env(REPO_ROOT)


def resolve_persona(persona_arg):
    """Resolve --persona: load from file or treat as inline text."""
    if persona_arg is None:
        return None

    # Check for pre-baked persona file
    persona_path = SKILL_DIR / "personas" / f"{persona_arg}.md"
    if persona_path.exists():
        return persona_path.read_text().strip()

    # Treat as inline persona description
    return persona_arg


# --- Conversation file management ---


def conversation_dir():
    """Get the model-calls directory in the current workspace."""
    d = Path.cwd() / ".agents" / "model-calls"
    d.mkdir(parents=True, exist_ok=True)
    return d


def generate_id(content):
    """Generate a short hash ID from content."""
    return hashlib.sha256(content.encode()).hexdigest()[:8]


def create_conversation(conv_id, tags, flow=None, title=None):
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
        "title": title,
        "summary": None,
        "created": datetime.now(timezone.utc).isoformat(),
        "updated": datetime.now(timezone.utc).isoformat(),
        "parent": None,
        "branch_from": None,
        "exchanges": 0,
        "tags": tags or [],
        "flow": flow,
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

    # Rewrite file: updated meta + existing messages + new exchange
    exchange_num = meta["exchanges"]
    user_msg["exchange"] = exchange_num
    assistant_msg["exchange"] = exchange_num

    lines[0] = json.dumps(meta)
    lines.append(json.dumps(user_msg))
    lines.append(json.dumps(assistant_msg))

    path.write_text("\n".join(lines) + "\n")


def update_summary(path, summary_text):
    """Update the summary field in conversation metadata."""
    path = Path(path)
    lines = path.read_text().strip().split("\n")
    meta = json.loads(lines[0])
    meta["summary"] = summary_text
    lines[0] = json.dumps(meta)
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
    new_meta["title"] = meta.get("title")
    new_meta["summary"] = meta.get("summary")
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

    title = meta.get("title") or meta["id"]
    print(f"# {title}")
    print(f"**ID:** {meta['id']}")
    print(f"**Created:** {meta['created']}")
    print(f"**Exchanges:** {meta['exchanges']}")
    if meta.get("tags"):
        print(f"**Tags:** {', '.join(meta['tags'])}")
    if meta.get("flow"):
        print(f"**Flow:** {meta['flow']}")
    if meta.get("parent"):
        print(f"**Branched from:** {meta['parent']}")
    if meta.get("summary"):
        print(f"\n**Summary:** {meta['summary']}")
    print()

    current_exchange = 0
    for msg in messages:
        exchange = msg.get("exchange", 0)
        if exchange != current_exchange:
            current_exchange = exchange
            print(f"---\n### Exchange {exchange}\n")

        role = msg.get("type", "unknown")
        content = msg.get("content", "")
        sender = msg.get("sender", role)
        persona = msg.get("persona")
        model = msg.get("model")

        if role == "user":
            label = f"**{sender}:**" if sender != "user" else "**User:**"
            print(f"{label}\n{content}\n")
            attachments = msg.get("attachments", [])
            if attachments:
                print("**Attachments:**")
                for att in attachments:
                    print(f"  - {att['path']} ({att['mime']})")
                print()
        elif role == "assistant":
            label = model or sender or "Assistant"
            if persona:
                label = f"{label} [{persona}]"
            print(f"**{label}:**\n{content}\n")


def parse_args():
    """Parse CLI arguments."""
    parser = argparse.ArgumentParser(
        description="Call external models via OpenRouter or OpenAI."
    )
    parser.add_argument(
        "--model",
        default=None,
        help="Model alias (gpt5, spark, sonnet, etc.) or provider/model-id.",
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
        "--title",
        default=None,
        help="Human-readable title for the conversation.",
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
        help="Reasoning effort level for models that support it.",
    )
    parser.add_argument(
        "--persona",
        default=None,
        help="Persona name (loads from personas/ dir) or inline persona description.",
    )
    parser.add_argument(
        "--flow",
        default=None,
        help="Flow name (recorded in metadata for agent orchestration).",
    )
    return parser.parse_args()


def main():
    args = parse_args()
    config = load_config(SKILL_DIR / "config.yaml")

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

    # --- Resolve persona ---
    persona_name = args.persona  # Keep the name/string for metadata
    persona_text = resolve_persona(args.persona)

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

    # Combine persona + system prompt for THIS message
    if persona_text and system_prompt:
        system_prompt = persona_text + "\n\n" + system_prompt
    elif persona_text:
        system_prompt = persona_text

    # --- Collect attachments ---
    attachments = collect_attachments(args.attach)

    # --- Determine conversation mode ---
    history_messages = []
    conv_path = None

    if args.continue_path:
        # Continue existing conversation
        conv_path = Path(args.continue_path)
        _meta, history_messages = load_conversation(conv_path)

    elif args.branch:
        # Branch from existing conversation
        conv_path = branch_conversation(
            args.branch, args.from_exchange, args.id
        )
        _meta, history_messages = load_conversation(conv_path)

    else:
        # New conversation
        conv_id = args.id or generate_id(content)
        conv_path = create_conversation(
            conv_id, args.tag, flow=args.flow, title=args.title,
        )

    # --- Build API messages ---
    # For continuing conversations, pass summary cache and call_model for summarization
    summary_cache = None
    if args.continue_path or args.branch:
        meta, _ = load_conversation(conv_path)
        summary_cache = {"summary": meta.get("summary")}

    api_messages = build_messages_for_api(
        history_messages, system_prompt, content, attachments,
        config=config,
        summary_cache=summary_cache,
        call_model_fn=call_model,
    )

    # --- Call provider ---
    try:
        response_text = call_model(model_str, config, api_messages, thinking=args.thinking)
    except Exception as e:
        print(f"Error calling {provider_name}/{model_id}: {e}", file=sys.stderr)
        sys.exit(1)

    # --- Save exchange ---
    # Per-message fields: each message tracks its own model, persona, system_prompt
    user_msg = {
        "type": "user",
        "sender": "user",
        "content": content,
        "attachments": [
            {"path": a["path"], "mime": a["mime"]} for a in attachments
        ],
    }
    assistant_msg = {
        "type": "assistant",
        "sender": model_id,
        "model": model_id,
        "content": response_text,
    }
    if persona_name:
        assistant_msg["persona"] = persona_name
    if system_prompt:
        # Store truncated for reference — not sent to future messages
        assistant_msg["system_prompt"] = system_prompt[:200]

    append_exchange(conv_path, user_msg, assistant_msg, args.tag)

    # --- Output ---
    print(response_text)
    print(f"\n---\nconversation: {conv_path}")


if __name__ == "__main__":
    main()
