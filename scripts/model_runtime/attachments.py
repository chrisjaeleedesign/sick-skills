"""Content and attachment helpers for model calls."""

import mimetypes
import sys
from pathlib import Path


def resolve_content(content_arg):
    """Resolve a prompt argument as stdin, file contents, or literal text."""
    if content_arg == "-":
        return sys.stdin.read()

    content_path = Path(content_arg)
    if content_path.exists() and content_path.is_file():
        return content_path.read_text()

    return content_arg


def collect_attachments(attach_paths):
    """Validate attachment paths and detect MIME types."""
    attachments = []
    for path_str in attach_paths or []:
        path = Path(path_str)
        if not path.exists():
            print(f"Warning: attachment not found: {path_str}", file=sys.stderr)
            continue
        mime, _ = mimetypes.guess_type(str(path))
        if mime is None:
            mime = "application/octet-stream"
        attachments.append({"path": str(path.resolve()), "mime": mime})
    return attachments
