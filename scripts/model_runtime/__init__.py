"""Shared model runtime for sick-skills."""

from .attachments import collect_attachments, resolve_content
from .client import (
    PROVIDERS,
    call_model,
    call_model_normalized,
    call_model_streaming,
    normalize_response,
)
from .config import (
    ModelResolution,
    default_config_path,
    default_model_for_role,
    load_config,
    load_env,
    model_has_capability,
    resolve_model,
    resolve_model_info,
)
from .messages import build_messages_for_api

__all__ = [
    "ModelResolution",
    "PROVIDERS",
    "build_messages_for_api",
    "call_model",
    "call_model_normalized",
    "call_model_streaming",
    "collect_attachments",
    "default_config_path",
    "default_model_for_role",
    "load_config",
    "load_env",
    "model_has_capability",
    "normalize_response",
    "resolve_content",
    "resolve_model",
    "resolve_model_info",
]
