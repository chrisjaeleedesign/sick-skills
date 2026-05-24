"""Model registry and config loading for sick-skills."""

import sys
from dataclasses import dataclass
from pathlib import Path
from typing import Optional, Tuple

import yaml

PROVIDERS = {
    "openai": "model_runtime.providers.openai_codex",
    "openrouter": "model_runtime.providers.openrouter",
}

ROLE_DEFAULTS = {
    "default": "default_model",
    "summarizer": "default_summarizer_model",
    "image": "default_image_model",
}


@dataclass(frozen=True)
class ModelResolution:
    """Resolved model identity plus registry metadata."""

    requested: str
    provider: str
    model_id: str
    full_id: str
    alias: Optional[str]
    capabilities: Tuple[str, ...]


def _repo_root_from_here():
    return Path(__file__).resolve().parents[2]


def default_config_path(repo_root=None):
    """Return the shared model registry path."""
    root = Path(repo_root) if repo_root else _repo_root_from_here()
    return root / "config" / "models.yaml"


def load_config(config_path=None, repo_root=None):
    """Load the shared model registry."""
    path = Path(config_path) if config_path else default_config_path(repo_root)
    if not path.exists():
        print(f"Error: config not found at {path}", file=sys.stderr)
        sys.exit(2)
    with open(path) as f:
        return yaml.safe_load(f) or {}


def _alias_entry(alias, config):
    aliases = config.get("aliases", {})
    return aliases.get(alias)


def _alias_id_and_capabilities(alias, config):
    entry = _alias_entry(alias, config)
    if entry is None:
        return None, ()
    if isinstance(entry, str):
        return entry, ()
    return entry.get("id"), tuple(entry.get("capabilities") or ())


def resolve_model_info(model_str, config):
    """Resolve a model alias or full ID to structured metadata."""
    aliases = config.get("aliases", {})
    requested = model_str or config.get("default_model")
    if not requested:
        print("Error: no model provided and no default_model configured.", file=sys.stderr)
        sys.exit(2)

    alias = requested if requested in aliases else None
    full_id, capabilities = _alias_id_and_capabilities(requested, config)
    if full_id is None:
        full_id = requested
        capabilities = ()

    if "/" not in full_id:
        alias_list = ", ".join(aliases.keys())
        print(
            f"Error: cannot resolve model '{requested}'. "
            f"Use an alias ({alias_list}) or provider/model format.",
            file=sys.stderr,
        )
        sys.exit(2)

    provider, model_id = full_id.split("/", 1)

    if provider not in PROVIDERS:
        provider = "openrouter"
        model_id = full_id

    return ModelResolution(
        requested=requested,
        provider=provider,
        model_id=model_id,
        full_id=full_id,
        alias=alias,
        capabilities=capabilities,
    )


def resolve_model(model_str, config):
    """Compatibility API: resolve to (provider, model_id)."""
    resolution = resolve_model_info(model_str, config)
    return resolution.provider, resolution.model_id


def model_has_capability(model_str, config, capability):
    """Return whether a model alias advertises a capability."""
    resolution = resolve_model_info(model_str, config)
    return capability in resolution.capabilities


def default_model_for_role(config, role="default"):
    """Return the configured model alias for a runtime role."""
    key = ROLE_DEFAULTS.get(role, role)
    fallback = config.get("default_model")
    model = config.get(key) or fallback
    if not model:
        print(f"Error: no model configured for role '{role}'.", file=sys.stderr)
        sys.exit(2)
    return model


def load_env(repo_root):
    """Load .env from a repo root."""
    from dotenv import load_dotenv

    load_dotenv(Path(repo_root) / ".env")
