"""Message assembly and context management for API calls."""

import base64
import sys
from pathlib import Path

SUMMARY_CHAR_THRESHOLD = 80000  # ~20000 tokens
RECENT_EXCHANGES_TO_KEEP = 4


def estimate_chars(messages):
    """Rough character count of message content."""
    total = 0
    for msg in messages:
        total += len(msg.get("content", ""))
    return total


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


def summarize_messages(messages, config, call_model_fn):
    """Summarize a list of messages into a concise paragraph.

    call_model_fn should be a function that takes (model_str, config, messages) and returns text.
    This avoids circular imports with core.py.
    """
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

    try:
        summary = call_model_fn(
            "spark", config,
            [{"role": "user", "content": summary_prompt}]
        )
        return summary.strip()
    except Exception as e:
        print(f"Warning: summarization failed: {e}", file=sys.stderr)
        return conversation_text[:500] + "..."


def build_messages_for_api(messages, system_prompt, current_content,
                           current_attachments, config=None,
                           summary_cache=None, call_model_fn=None):
    """Convert stored messages + current input into provider-ready format.

    Args:
        messages: Historical message dicts
        system_prompt: System prompt for THIS message only
        current_content: Current user message text
        current_attachments: Current message attachments
        config: Config dict (for summarization model resolution)
        summary_cache: Dict with 'summary' key if a cached summary exists, or None
        call_model_fn: Function(model_str, config, messages) -> str for summarization
    """
    api_messages = []

    if system_prompt:
        api_messages.append({"role": "system", "content": system_prompt})

    total_chars = estimate_chars(messages)

    if (total_chars > SUMMARY_CHAR_THRESHOLD
            and len(messages) > RECENT_EXCHANGES_TO_KEEP * 2
            and config and call_model_fn):
        recent_cutoff = len(messages) - (RECENT_EXCHANGES_TO_KEEP * 2)
        old_messages = messages[:recent_cutoff]
        recent_messages = messages[recent_cutoff:]

        if summary_cache and summary_cache.get("summary"):
            summary = summary_cache["summary"]
        else:
            summary = summarize_messages(old_messages, config, call_model_fn)

        api_messages.append({
            "role": "system",
            "content": f"Summary of earlier conversation:\n{summary}",
        })
        history_to_send = recent_messages
    else:
        history_to_send = messages

    for msg in history_to_send:
        role = "user" if msg["type"] == "user" else "assistant"
        content_parts = []

        if msg.get("content"):
            content_parts.append({"type": "text", "text": msg["content"]})

        for att in msg.get("attachments", []):
            att_path = Path(att["path"])
            if not att_path.exists():
                print(f"Warning: historical attachment missing: {att['path']}", file=sys.stderr)
                continue
            encoded = encode_attachment(att["path"], att["mime"])
            if encoded:
                content_parts.append(encoded)

        if len(content_parts) == 1 and content_parts[0]["type"] == "text":
            api_messages.append({"role": role, "content": content_parts[0]["text"]})
        elif content_parts:
            api_messages.append({"role": role, "content": content_parts})

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
