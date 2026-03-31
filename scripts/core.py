"""Shared model-calling infrastructure for sick-skills."""

import importlib
import mimetypes
import sys
from pathlib import Path

import yaml

PROVIDERS = {
    "openai": "providers.openai_provider",
    "openrouter": "providers.openrouter",
}


def load_config(config_path):
    """Load a config.yaml file."""
    config_path = Path(config_path)
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


def call_model(model_str, config, messages, thinking=None):
    """Resolve model and call the provider. Returns response text."""
    provider_name, model_id = resolve_model(model_str, config)
    # Ensure providers dir is importable
    scripts_dir = Path(__file__).resolve().parent
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    provider_module = importlib.import_module(PROVIDERS[provider_name])
    return provider_module.call(
        messages=messages,
        model=model_id,
        thinking=thinking,
    )


def call_model_streaming(model_str, config, messages, thinking=None):
    """Resolve model and call the provider with streaming. Yields chunks."""
    provider_name, model_id = resolve_model(model_str, config)
    scripts_dir = Path(__file__).resolve().parent
    if str(scripts_dir) not in sys.path:
        sys.path.insert(0, str(scripts_dir))
    provider_module = importlib.import_module(PROVIDERS[provider_name])
    yield from provider_module.call_streaming(
        messages=messages,
        model=model_id,
        thinking=thinking,
    )


def load_env(repo_root):
    """Load .env from repo root."""
    from dotenv import load_dotenv
    load_dotenv(Path(repo_root) / ".env")
