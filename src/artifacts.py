"""Downloads the trained artifacts from the private HF Hub model repo.

hf_hub_download caches locally, so repeated calls are cheap after the first
download (~736 MB for model.pt).
"""
from huggingface_hub import hf_hub_download

from .config import (
    CALIBRATION_FILE,
    EVIDENCE_FILE,
    HF_REPO,
    HF_TOKEN,
    INDEX_FILE,
    MODEL_FILE,
)


def _download(filename: str) -> str:
    return hf_hub_download(repo_id=HF_REPO, filename=filename, token=HF_TOKEN)


def get_artifact_paths() -> dict:
    """Return local paths for the four trained artifacts."""
    return {
        "model": _download(MODEL_FILE),
        "index": _download(INDEX_FILE),
        "evidence": _download(EVIDENCE_FILE),
        "calibration": _download(CALIBRATION_FILE),
    }
