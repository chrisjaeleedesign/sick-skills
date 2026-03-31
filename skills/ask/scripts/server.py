#!/usr/bin/env python3
"""
server.py — Flask API server for the ask skill.

Wraps ask.py functions so a web frontend can manage conversations
and stream model responses via SSE.

Usage:
    python3 server.py --port 3100 --dir /path/to/project
"""

import argparse
import importlib
import json
import os
import sys
from pathlib import Path

from flask import Flask, Response, jsonify, request, stream_with_context
from flask_cors import CORS

# Ensure ask.py and providers are importable
SCRIPT_DIR = Path(__file__).resolve().parent
sys.path.insert(0, str(SCRIPT_DIR))

from ask import (
    PROVIDERS,
    SKILL_DIR,
    append_exchange,
    branch_conversation,
    build_messages_for_api,
    collect_attachments,
    conversation_dir,
    create_conversation,
    load_config,
    load_conversation,
    resolve_content,
    resolve_model,
    resolve_persona,
)

app = Flask(__name__)
CORS(app)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _error(message, status=400):
    """Return a JSON error response."""
    return jsonify({"error": message}), status


def _list_dir_md(subdir, exclude=None):
    """List .md files in a SKILL_DIR subdirectory, returning name + content."""
    exclude = exclude or set()
    dirpath = SKILL_DIR / subdir
    if not dirpath.is_dir():
        return []
    results = []
    for f in sorted(dirpath.iterdir()):
        if f.suffix == ".md" and f.name not in exclude:
            results.append({
                "name": f.stem,
                "content": f.read_text(),
            })
    return results


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------


@app.route("/api/config", methods=["GET"])
def get_config():
    """Return config.yaml contents."""
    try:
        config = load_config()
        return jsonify(config)
    except Exception as e:
        return _error(str(e), 500)


@app.route("/api/personas", methods=["GET"])
def get_personas():
    """List persona files (excluding crafting-guide.md)."""
    return jsonify(_list_dir_md("personas", exclude={"crafting-guide.md"}))


@app.route("/api/flows", methods=["GET"])
def get_flows():
    """List flow files (excluding crafting-guide.md)."""
    return jsonify(_list_dir_md("flows", exclude={"crafting-guide.md"}))


@app.route("/api/conversations", methods=["GET"])
def list_conversations():
    """List all conversations sorted by updated desc."""
    conv_dir = conversation_dir()
    conversations = []
    for f in conv_dir.glob("*.jsonl"):
        try:
            first_line = f.open().readline().strip()
            if first_line:
                meta = json.loads(first_line)
                meta["filename"] = f.name
                conversations.append(meta)
        except (json.JSONDecodeError, IOError):
            continue
    conversations.sort(key=lambda m: m.get("updated", ""), reverse=True)
    return jsonify(conversations)


@app.route("/api/conversations/<filename>", methods=["GET"])
def get_conversation(filename):
    """Load a single conversation."""
    conv_path = conversation_dir() / filename
    if not conv_path.exists():
        return _error("Conversation not found", 404)
    try:
        meta, messages = load_conversation(conv_path)
        return jsonify({"meta": meta, "messages": messages})
    except Exception as e:
        return _error(str(e), 500)


@app.route("/api/conversations", methods=["POST"])
def create_conversation_endpoint():
    """Create a new conversation."""
    body = request.get_json(silent=True) or {}
    conv_id = body.get("id")
    title = body.get("title")
    tags = body.get("tags", [])
    flow = body.get("flow")

    if not conv_id:
        return _error("id is required")

    try:
        path = create_conversation(conv_id, tags, flow=flow, title=title)
        meta, _ = load_conversation(path)
        return jsonify({"meta": meta, "path": str(path)}), 201
    except Exception as e:
        return _error(str(e), 500)


@app.route("/api/conversations/<filename>/messages", methods=["POST"])
def post_message(filename):
    """Send a message and stream the response via SSE."""
    conv_path = conversation_dir() / filename
    if not conv_path.exists():
        return _error("Conversation not found", 404)

    body = request.get_json(silent=True) or {}
    content = body.get("content")
    model_alias = body.get("model")
    persona_arg = body.get("persona")
    thinking = body.get("thinking")
    attachment_paths = body.get("attachments", [])

    if not content:
        return _error("content is required")

    # Resolve everything before streaming
    try:
        config = load_config()
        model_str = model_alias or config.get("default_model", "gpt5")
        provider_name, model_id = resolve_model(model_str, config)

        persona_text = resolve_persona(persona_arg)
        system_prompt = persona_text  # No separate system-prompt file in API mode

        meta, history_messages = load_conversation(conv_path)

        attachments = collect_attachments(attachment_paths)

        api_messages = build_messages_for_api(
            history_messages, system_prompt, content, attachments,
            config=config, conv_path=conv_path,
        )

        provider_module = importlib.import_module(PROVIDERS[provider_name])
    except Exception as e:
        return _error(str(e), 500)

    def generate():
        full_text_parts = []
        try:
            for chunk in provider_module.call_streaming(
                messages=api_messages, model=model_id, thinking=thinking
            ):
                chunk_type = chunk.get("type")
                if chunk_type == "text":
                    full_text_parts.append(chunk["content"])
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk_type == "reasoning":
                    yield f"data: {json.dumps(chunk)}\n\n"
                elif chunk_type == "done":
                    pass  # handled below

            # Append the exchange to the JSONL file after stream is consumed
            full_text = "".join(full_text_parts)
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
                "content": full_text,
            }
            if persona_arg:
                assistant_msg["persona"] = persona_arg
            if system_prompt:
                assistant_msg["system_prompt"] = system_prompt[:200]

            append_exchange(conv_path, user_msg, assistant_msg)

            yield f"data: {json.dumps({'type': 'done', 'conversation': str(conv_path)})}\n\n"
        except Exception as e:
            yield f"data: {json.dumps({'type': 'error', 'content': str(e)})}\n\n"

    return Response(
        stream_with_context(generate()),
        mimetype="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )


@app.route("/api/conversations/<filename>/branch", methods=["POST"])
def branch_conversation_endpoint(filename):
    """Branch a conversation from a specific exchange."""
    conv_path = conversation_dir() / filename
    if not conv_path.exists():
        return _error("Conversation not found", 404)

    body = request.get_json(silent=True) or {}
    from_exchange = body.get("from_exchange")
    new_id = body.get("id")

    if from_exchange is None:
        return _error("from_exchange is required")

    try:
        new_path = branch_conversation(conv_path, from_exchange, new_id)
        meta, _ = load_conversation(new_path)
        meta["filename"] = new_path.name
        return jsonify({"meta": meta, "path": str(new_path)}), 201
    except Exception as e:
        return _error(str(e), 500)


# ---------------------------------------------------------------------------
# CLI
# ---------------------------------------------------------------------------


def main():
    parser = argparse.ArgumentParser(description="Ask skill API server")
    parser.add_argument("--port", type=int, default=3100, help="Port to listen on")
    parser.add_argument("--dir", default=None, help="Working directory for conversations")
    args = parser.parse_args()

    if args.dir:
        os.chdir(args.dir)
        print(f"Working directory: {args.dir}")

    print(f"Starting ask API server on port {args.port}")
    print(f"Conversations dir: {conversation_dir()}")
    app.run(host="0.0.0.0", port=args.port, debug=False)


if __name__ == "__main__":
    main()
