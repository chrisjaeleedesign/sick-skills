"""
OpenRouter provider — calls the OpenRouter chat completions API.

Supports text and multimodal (image, video) inputs via the standard
OpenAI-compatible message format.
"""

import os
import sys

import requests

API_URL = "https://openrouter.ai/api/v1/chat/completions"


def call(messages, model, system_prompt=None, attachments=None, thinking=None):
    """
    Call OpenRouter with the given messages and model.

    Args:
        messages: List of message dicts in OpenAI chat format
                  (already assembled by ask.py with system prompt and attachments).
        model: OpenRouter model ID (e.g. "anthropic/claude-sonnet-4-6").
        system_prompt: Unused — already included in messages by ask.py.
        attachments: Unused — already encoded in messages by ask.py.
        thinking: Reasoning effort level (none/minimal/low/medium/high/xhigh).

    Returns:
        Response text string.
    """
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        print(
            "Error: OPENROUTER_API_KEY not set. "
            "Add it to .env at the repo root or set it in your shell.",
            file=sys.stderr,
        )
        raise RuntimeError("OPENROUTER_API_KEY not set")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
    }

    if thinking:
        payload["reasoning"] = {"effort": thinking}

    response = requests.post(API_URL, headers=headers, json=payload, timeout=120)

    if response.status_code != 200:
        error_detail = response.text[:500]
        print(
            f"Error: OpenRouter returned {response.status_code}: {error_detail}",
            file=sys.stderr,
        )
        raise RuntimeError(
            f"OpenRouter API error {response.status_code}: {error_detail}"
        )

    data = response.json()

    try:
        return data["choices"][0]["message"]["content"]
    except (KeyError, IndexError) as e:
        print(f"Error: unexpected response format: {e}", file=sys.stderr)
        print(f"Response: {data}", file=sys.stderr)
        raise RuntimeError(f"Unexpected OpenRouter response format: {e}")
