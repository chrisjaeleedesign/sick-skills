"""
OpenRouter provider — calls the OpenRouter chat completions API.

Supports text and multimodal (image, video) inputs via the standard
OpenAI-compatible message format. Handles image generation responses
from models like Nano Banana 2 and GPT-5 Image.
"""

import json
import os
import sys

import requests
from model_runtime.artifacts import save_data_url_images

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

    # No hard read timeout — thinking models can take arbitrarily long
    response = requests.post(
        API_URL, headers=headers, json=payload, timeout=(30, None)
    )

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
        msg = data["choices"][0]["message"]
    except (KeyError, IndexError) as e:
        print(f"Error: unexpected response format: {e}", file=sys.stderr)
        print(f"Response: {data}", file=sys.stderr)
        raise RuntimeError(f"Unexpected OpenRouter response format: {e}")

    text = msg.get("content") or ""
    images = msg.get("images", [])

    if images:
        saved_paths = save_data_url_images(images)
        return {"text": text, "images": saved_paths}

    return text


def call_streaming(messages, model, thinking=None):
    """
    Call OpenRouter with streaming enabled. Yields dicts:
      {"type": "reasoning", "content": "..."}
      {"type": "text", "content": "..."}
      {"type": "image", "content": "/path/to/saved.png"}
      {"type": "done"}

    Image models don't stream usefully, so we detect empty streams
    and fall back to a non-streaming call to capture image output.

    Args:
        messages: List of message dicts in OpenAI chat format.
        model: OpenRouter model ID.
        thinking: Reasoning effort level.
    """
    api_key = os.environ.get("OPENROUTER_API_KEY")
    if not api_key:
        raise RuntimeError("OPENROUTER_API_KEY not set")

    headers = {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }

    payload = {
        "model": model,
        "messages": messages,
        "stream": True,
    }

    if thinking:
        payload["reasoning"] = {"effort": thinking}

    response = requests.post(
        API_URL, headers=headers, json=payload, timeout=(30, None), stream=True
    )

    if response.status_code != 200:
        error_detail = response.text[:500]
        raise RuntimeError(
            f"OpenRouter API error {response.status_code}: {error_detail}"
        )

    yielded_text = False

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

        for choice in event.get("choices", []):
            delta = choice.get("delta", {})

            reasoning = delta.get("reasoning")
            if reasoning:
                yield {"type": "reasoning", "content": reasoning}

            content = delta.get("content")
            if content:
                yielded_text = True
                yield {"type": "text", "content": content}

    # Image models return content=null with an images array in non-streaming mode.
    # If streaming yielded no text, fall back to a non-streaming call.
    if not yielded_text:
        result = call(messages, model, thinking=thinking)
        if isinstance(result, dict) and result.get("images"):
            if result.get("text"):
                yield {"type": "text", "content": result["text"]}
            for img_path in result["images"]:
                yield {"type": "image", "content": img_path}
        elif isinstance(result, str) and result:
            yield {"type": "text", "content": result}

    yield {"type": "done"}
