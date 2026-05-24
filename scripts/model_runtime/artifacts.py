"""Artifact helpers for model runtime outputs."""

import base64
import os
from datetime import datetime
from pathlib import Path


def save_data_url_images(images, artifact_dir=None):
    """Save OpenAI-compatible image data URLs and return absolute paths."""
    img_dir = Path(
        artifact_dir
        or os.environ.get("MODEL_RUNTIME_IMAGE_DIR")
        or ".agents/model-calls/images"
    )
    img_dir.mkdir(parents=True, exist_ok=True)

    saved = []
    timestamp = datetime.now().strftime("%Y%m%d-%H%M%S")
    for i, img in enumerate(images):
        url = img.get("image_url", {}).get("url", "")
        if not url.startswith("data:image/"):
            continue
        header, b64data = url.split(",", 1)
        ext = header.split("/")[1].split(";")[0]
        filepath = img_dir / f"{timestamp}_{i}.{ext}"
        filepath.write_bytes(base64.b64decode(b64data))
        saved.append(str(filepath.resolve()))

    return saved
