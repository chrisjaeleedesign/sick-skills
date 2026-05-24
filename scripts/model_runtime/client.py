"""Provider dispatch and response normalization."""

import importlib
import sys
from pathlib import Path

from .config import PROVIDERS, resolve_model_info


def _import_provider(provider_name):
    scripts_dir = Path(__file__).resolve().parents[1]
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    return importlib.import_module(PROVIDERS[provider_name])


def normalize_response(response, resolution=None):
    """Normalize provider output into text/images/provider/model fields."""
    if isinstance(response, dict):
        text = response.get("text") or ""
        images = response.get("images") or []
    else:
        text = response or ""
        images = []

    normalized = {
        "text": text,
        "images": images,
    }
    if resolution:
        normalized.update(
            {
                "provider": resolution.provider,
                "model": resolution.model_id,
                "requested_model": resolution.requested,
                "capabilities": list(resolution.capabilities),
            }
        )
    return normalized


def call_model(model_str, config, messages, thinking=None):
    """Resolve model and call its provider. Returns raw provider output."""
    resolution = resolve_model_info(model_str, config)
    provider_module = _import_provider(resolution.provider)
    return provider_module.call(
        messages=messages,
        model=resolution.model_id,
        thinking=thinking,
    )


def call_model_normalized(model_str, config, messages, thinking=None):
    """Call a model and return normalized text/image output."""
    resolution = resolve_model_info(model_str, config)
    provider_module = _import_provider(resolution.provider)
    response = provider_module.call(
        messages=messages,
        model=resolution.model_id,
        thinking=thinking,
    )
    return normalize_response(response, resolution)


def call_model_streaming(model_str, config, messages, thinking=None):
    """Resolve model and call its provider with streaming."""
    resolution = resolve_model_info(model_str, config)
    provider_module = _import_provider(resolution.provider)
    yield from provider_module.call_streaming(
        messages=messages,
        model=resolution.model_id,
        thinking=thinking,
    )
