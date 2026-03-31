"""
OpenAI provider — calls OpenAI via Codex CLI auth tokens.

Reads tokens from ~/.codex/auth.json (created by `codex login` or
`npx @openai/codex login`). If tokens are expired, runs `codex login`
to refresh. No separate auth flow needed.
"""

import json
import subprocess
import sys
import time
from pathlib import Path

import jwt
import requests

# Codex auth token locations (checked in order)
AUTH_PATHS = [
    Path.home() / ".codex" / "auth.json",
    Path.home() / ".chatgpt-local" / "auth.json",
]

# API endpoint for Codex backend
API_URL = "https://chatgpt.com/backend-api/codex/responses"


def _find_auth_file():
    """Find the Codex auth.json file."""
    for path in AUTH_PATHS:
        if path.exists():
            return path
    return None


def _load_codex_auth():
    """Load tokens from Codex auth.json. Returns dict or None."""
    auth_path = _find_auth_file()
    if auth_path is None:
        return None
    try:
        data = json.loads(auth_path.read_text())
        tokens = data.get("tokens", {})
        if not tokens.get("access_token"):
            return None
        return {
            "access_token": tokens["access_token"],
            "refresh_token": tokens.get("refresh_token"),
            "account_id": tokens.get("account_id"),
        }
    except (json.JSONDecodeError, KeyError) as e:
        print(f"Warning: failed to parse auth.json: {e}", file=sys.stderr)
        return None


def _is_token_expired(access_token):
    """Check if a JWT access token is expired (with 5 min buffer)."""
    try:
        payload = jwt.decode(access_token, options={"verify_signature": False})
        exp = payload.get("exp", 0)
        return time.time() > (exp - 300)
    except jwt.DecodeError:
        return True


def _extract_account_id(access_token):
    """Extract chatgpt_account_id from the JWT access token."""
    try:
        payload = jwt.decode(access_token, options={"verify_signature": False})
        auth_claim = payload.get("https://api.openai.com/auth", {})
        if isinstance(auth_claim, dict):
            return auth_claim.get("chatgpt_account_id")
        return None
    except jwt.DecodeError:
        return None


def _run_codex_login():
    """Run codex login to refresh auth tokens."""
    print("Codex tokens expired or missing. Running `codex login`...", file=sys.stderr)
    print("Please complete the login in your browser.", file=sys.stderr)
    try:
        subprocess.run(["codex", "login"], check=True, timeout=120)
        return _load_codex_auth()
    except FileNotFoundError:
        print(
            "Error: `codex` CLI not found. Install with: npm install -g @openai/codex",
            file=sys.stderr,
        )
        raise RuntimeError("Codex CLI not found. Run: npm install -g @openai/codex")
    except subprocess.CalledProcessError as e:
        raise RuntimeError(f"codex login failed: {e}")


def _get_valid_tokens():
    """Get valid tokens, re-logging in if needed."""
    tokens = _load_codex_auth()

    if tokens is None:
        tokens = _run_codex_login()
        if tokens is None:
            raise RuntimeError("Failed to obtain OpenAI tokens after login.")
        return tokens

    if _is_token_expired(tokens["access_token"]):
        tokens = _run_codex_login()
        if tokens is None:
            raise RuntimeError("Failed to refresh OpenAI tokens.")

    return tokens


def _collect_stream_response(response):
    """Collect text from an SSE stream response.

    Prints reasoning summary progress to stderr so the agent/user can see
    the model is actively thinking. Final output text goes to the return value.
    """
    text_parts = []
    reasoning_active = False

    for raw_line in response.iter_lines():
        line = raw_line.decode("utf-8") if isinstance(raw_line, bytes) else raw_line
        if not line or not line.startswith("data: "):
            continue
        data_str = line[6:]  # Strip "data: " prefix
        if data_str == "[DONE]":
            break
        try:
            event = json.loads(data_str)
        except json.JSONDecodeError:
            continue

        event_type = event.get("type", "")

        # --- Reasoning progress (printed to stderr) ---
        if event_type == "response.reasoning_summary_text.delta":
            delta = event.get("delta", "")
            if delta:
                if not reasoning_active:
                    print("[thinking] ", end="", file=sys.stderr, flush=True)
                    reasoning_active = True
                print(delta, end="", file=sys.stderr, flush=True)
        elif event_type == "response.reasoning_summary_part.done":
            if reasoning_active:
                print(file=sys.stderr, flush=True)  # newline after summary
                reasoning_active = False
        elif event_type == "response.reasoning_summary_text.done":
            if reasoning_active:
                print(file=sys.stderr, flush=True)
                reasoning_active = False

        # --- Output text (collected for return) ---
        elif event_type == "response.output_text.delta":
            delta = event.get("delta", "")
            if delta:
                text_parts.append(delta)
        elif event_type == "response.content_part.delta":
            delta = event.get("delta", {})
            if isinstance(delta, dict) and delta.get("type") == "output_text":
                text_parts.append(delta.get("text", ""))
        # Chat completions streaming fallback
        elif "choices" in event:
            for choice in event.get("choices", []):
                delta = choice.get("delta", {})
                if "content" in delta and delta["content"]:
                    text_parts.append(delta["content"])
        # Response completed — extract from final object
        elif event_type == "response.completed":
            resp = event.get("response", {})
            extracted = _extract_response_text(resp)
            if extracted:
                if not text_parts:
                    text_parts.append(extracted)

    # Close any open reasoning line
    if reasoning_active:
        print(file=sys.stderr, flush=True)

    if not text_parts:
        raise RuntimeError("No text received from streaming response")

    return "".join(text_parts)


def _messages_to_responses_format(messages):
    """Convert OpenAI chat messages to Codex Responses API format.

    The Codex backend uses the Responses API, not Chat Completions.
    - System messages become the `instructions` field
    - User/assistant messages become the `input` array
    """
    instructions = ""
    input_items = []

    for msg in messages:
        role = msg.get("role", "user")
        content = msg.get("content", "")

        if role == "system":
            instructions = content if isinstance(content, str) else json.dumps(content)
        else:
            input_items.append({"role": role, "content": content})

    return instructions, input_items


def _make_request(headers, payload):
    """Make a streaming request to the Codex API.

    No hard timeout — streaming keeps the connection alive as SSE events flow.
    For thinking models, the initial response may take minutes before the first
    event arrives, so we use a generous connect timeout with no read timeout.
    """
    return requests.post(
        API_URL, headers=headers, json=payload, timeout=(30, None), stream=True
    )


def _extract_response_text(data):
    """Extract text from a Codex Responses API response."""
    # Responses API format: output is a list of items
    if "output" in data and isinstance(data["output"], list):
        text_parts = []
        for item in data["output"]:
            if item.get("type") == "message":
                for content in item.get("content", []):
                    if content.get("type") == "output_text":
                        text_parts.append(content.get("text", ""))
        if text_parts:
            return "\n".join(text_parts)

    # Simple output string
    if "output" in data and isinstance(data["output"], str):
        return data["output"]

    # Chat completions fallback
    if "choices" in data:
        try:
            return data["choices"][0]["message"]["content"]
        except (KeyError, IndexError):
            pass

    if "text" in data:
        return data["text"]

    return None


def call(messages, model, system_prompt=None, attachments=None, thinking=None):
    """
    Call OpenAI via Codex auth tokens.

    Args:
        messages: List of message dicts in OpenAI chat format
                  (already assembled by ask.py with system prompt and attachments).
        model: OpenAI model ID (e.g. "gpt-5.4", "o3").
        system_prompt: Unused — already included in messages by ask.py.
        attachments: Unused — already encoded in messages by ask.py.
        thinking: Reasoning effort level (none/minimal/low/medium/high/xhigh).

    Returns:
        Response text string.
    """
    tokens = _get_valid_tokens()
    access_token = tokens["access_token"]
    account_id = tokens.get("account_id") or _extract_account_id(access_token)

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "OpenAI-Beta": "responses=experimental",
    }
    if account_id:
        headers["chatgpt-account-id"] = account_id

    # Convert chat messages to Responses API format
    instructions, input_items = _messages_to_responses_format(messages)

    payload = {
        "model": model,
        "instructions": instructions,
        "input": input_items,
        "store": False,
        "stream": True,
    }

    if thinking:
        payload["reasoning"] = {"effort": thinking, "summary": "auto"}

    response = _make_request(headers, payload)

    if response.status_code == 401:
        # Token invalid — re-login
        print("Got 401, re-authenticating...", file=sys.stderr)
        tokens = _run_codex_login()
        if tokens is None:
            raise RuntimeError("Re-authentication failed.")
        headers["Authorization"] = f"Bearer {tokens['access_token']}"
        account_id = tokens.get("account_id") or _extract_account_id(
            tokens["access_token"]
        )
        if account_id:
            headers["chatgpt-account-id"] = account_id
        response = _make_request(headers, payload)

    if response.status_code != 200:
        error_detail = response.text[:500]
        print(
            f"Error: OpenAI returned {response.status_code}: {error_detail}",
            file=sys.stderr,
        )
        raise RuntimeError(
            f"OpenAI API error {response.status_code}: {error_detail}"
        )

    # Parse SSE stream and collect text
    return _collect_stream_response(response)


def call_streaming(messages, model, thinking=None):
    """
    Call OpenAI via Codex auth tokens with streaming. Yields dicts:
      {"type": "reasoning", "content": "..."}
      {"type": "text", "content": "..."}
      {"type": "done"}

    Args:
        messages: List of message dicts in OpenAI chat format.
        model: OpenAI model ID.
        thinking: Reasoning effort level.
    """
    tokens = _get_valid_tokens()
    access_token = tokens["access_token"]
    account_id = tokens.get("account_id") or _extract_account_id(access_token)

    headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json",
        "OpenAI-Beta": "responses=experimental",
    }
    if account_id:
        headers["chatgpt-account-id"] = account_id

    instructions, input_items = _messages_to_responses_format(messages)

    payload = {
        "model": model,
        "instructions": instructions,
        "input": input_items,
        "store": False,
        "stream": True,
    }

    if thinking:
        payload["reasoning"] = {"effort": thinking, "summary": "auto"}

    response = _make_request(headers, payload)

    if response.status_code == 401:
        tokens = _run_codex_login()
        if tokens is None:
            raise RuntimeError("Re-authentication failed.")
        headers["Authorization"] = f"Bearer {tokens['access_token']}"
        account_id = tokens.get("account_id") or _extract_account_id(
            tokens["access_token"]
        )
        if account_id:
            headers["chatgpt-account-id"] = account_id
        response = _make_request(headers, payload)

    if response.status_code != 200:
        error_detail = response.text[:500]
        raise RuntimeError(
            f"OpenAI API error {response.status_code}: {error_detail}"
        )

    for raw_line in response.iter_lines():
        line = raw_line.decode("utf-8") if isinstance(raw_line, bytes) else raw_line
        if not line or not line.startswith("data: "):
            continue
        data_str = line[6:]
        if data_str == "[DONE]":
            break
        try:
            event = json.loads(data_str)
        except json.JSONDecodeError:
            continue

        event_type = event.get("type", "")

        # Reasoning summary events
        if event_type == "response.reasoning_summary_text.delta":
            delta = event.get("delta", "")
            if delta:
                yield {"type": "reasoning", "content": delta}

        # Output text events
        elif event_type == "response.output_text.delta":
            delta = event.get("delta", "")
            if delta:
                yield {"type": "text", "content": delta}
        elif event_type == "response.content_part.delta":
            delta = event.get("delta", {})
            if isinstance(delta, dict) and delta.get("type") == "output_text":
                text = delta.get("text", "")
                if text:
                    yield {"type": "text", "content": text}

        # Chat completions streaming fallback
        elif "choices" in event:
            for choice in event.get("choices", []):
                delta = choice.get("delta", {})
                if "content" in delta and delta["content"]:
                    yield {"type": "text", "content": delta["content"]}

        # Response completed — only extract if we got no streaming deltas
        elif event_type == "response.completed":
            pass  # Text already yielded via delta events

    yield {"type": "done"}
