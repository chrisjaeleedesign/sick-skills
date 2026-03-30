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
REPO_ROOT = SKILL_DIR.parent.parent  # skills/ask -> skills -> repo root

# Load .env from repo root
load_dotenv(REPO_ROOT / ".env")

# Add scripts dir to path for provider imports
sys.path.insert(0, str(SCRIPT_DIR))

PROVIDERS = {
    "openai": "providers.openai_provider",
    "openrouter": "providers.openrouter",
}

# Approximate token threshold for triggering summarization.
# ~4 chars per token is a rough heuristic. When history exceeds this,
# older exchanges get summarized to save tokens.
SUMMARY_CHAR_THRESHOLD = 80000  # ~20000 tokens
RECENT_EXCHANGES_TO_KEEP = 4


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


# --- Context assembly ---


def estimate_chars(messages):
    """Rough character count of message content."""
    total = 0
    for msg in messages:
        total += len(msg.get("content", ""))
    return total


def summarize_messages(messages, provider_name, config):
    """Summarize a list of messages into a concise paragraph.

    Calls the fastest available model to generate a summary.
    """
    # Build a text representation of the messages to summarize
    text_parts = []
    for msg in messages:
        role = msg.get("type", "unknown")
        sender = msg.get("sender", role)
        persona = msg.get("persona")
        label = sender
        if persona:
            label = f"{sender} [{persona}]"
        text_parts.append(f"{label}: {msg.get('content', '')}")

    conversation_text = "\n\n".join(text_parts)

    summary_prompt = (
        "Summarize this conversation concisely. Capture the key points, "
        "decisions made, and any important context. Keep it under 200 words.\n\n"
        f"{conversation_text}"
    )

    # Use spark if available (fastest), otherwise default model
    try:
        spark_provider, spark_model = resolve_model("spark", config)
        provider_module = importlib.import_module(PROVIDERS[spark_provider])
        summary = provider_module.call(
            messages=[{"role": "user", "content": summary_prompt}],
            model=spark_model,
            thinking=None,
        )
        return summary.strip()
    except Exception as e:
        print(f"Warning: summarization failed: {e}", file=sys.stderr)
        # Fallback: simple truncation
        return conversation_text[:500] + "..."


def build_messages_for_api(messages, system_prompt, current_content,
                           current_attachments, config=None, conv_path=None):
    """Convert stored messages + current input into provider-ready format.

    Uses summarize + recent strategy for long conversations:
    - If history is short, send everything
    - If history is long, summarize older exchanges and keep recent ones verbatim

    System prompt is per-message (from the current persona), not from history.
    Historical messages are sent as clean user/assistant pairs — no metadata.
    """
    api_messages = []

    # System prompt for THIS message only (persona + system-prompt)
    if system_prompt:
        api_messages.append({"role": "system", "content": system_prompt})

    # Check if we need to summarize
    total_chars = estimate_chars(messages)

    if total_chars > SUMMARY_CHAR_THRESHOLD and len(messages) > RECENT_EXCHANGES_TO_KEEP * 2:
        # Split into old (to summarize) and recent (to keep verbatim)
        recent_cutoff = len(messages) - (RECENT_EXCHANGES_TO_KEEP * 2)
        old_messages = messages[:recent_cutoff]
        recent_messages = messages[recent_cutoff:]

        # Generate or reuse summary
        if config and conv_path:
            meta, _ = load_conversation(conv_path)
            existing_summary = meta.get("summary")

            if existing_summary:
                summary = existing_summary
            else:
                summary = summarize_messages(old_messages, None, config)
                update_summary(conv_path, summary)
        else:
            summary = summarize_messages(old_messages, None, config or load_config())

        # Add summary as context
        api_messages.append({
            "role": "system",
            "content": f"Summary of earlier conversation:\n{summary}",
        })

        # Add recent messages verbatim
        history_to_send = recent_messages
    else:
        history_to_send = messages

    # Add historical messages as clean user/assistant pairs
    for msg in history_to_send:
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
    api_messages = build_messages_for_api(
        history_messages, system_prompt, content, attachments,
        config=config, conv_path=conv_path,
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
