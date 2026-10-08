"""Rebuild evidence.parquet + faiss.index and upload them to the Hub.

Why: CoAID contributed rows whose text is a *question* ("Can eating garlic
help prevent COVID-19?") carrying label 0. A question has no truth value, but
label 0 reads as "this claim is REAL", so a false assertion retrieved those
rows and came back REAL with high trust.

Dropped here:
  1. CoAID rows with label 0 (identified by the placeholder evidence_text).
     The 718 CoAID label-1 rows are kept — debunked claims are valid evidence.
  2. Any remaining row whose text ends with "?".

The index is rebuilt from scratch over the surviving rows, so row i of the
parquet is vector i by construction.

Run:  python -m scripts.rebuild_corpus            (build + verify only)
      python -m scripts.rebuild_corpus --upload   (also push to the Hub)
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

import faiss
import numpy as np
import pandas as pd
from huggingface_hub import HfApi, hf_hub_download
from sentence_transformers import SentenceTransformer

from src.config import EMBED_MODEL, EVIDENCE_FILE, HF_REPO, HF_TOKEN, INDEX_FILE

PLACEHOLDER = "Fact-checked COVID-19 health claim (CoAID dataset)."
OUT_DIR = Path("artifacts_rebuilt")


def main(upload: bool) -> int:
    OUT_DIR.mkdir(exist_ok=True)

    src = hf_hub_download(HF_REPO, EVIDENCE_FILE, token=HF_TOKEN)
    df = pd.read_parquet(src)
    print(f"loaded {len(df):,} rows from the Hub")

    is_coaid = df.evidence_text.astype(str).str.strip() == PLACEHOLDER
    drop_coaid_real = is_coaid & (df.label == 0)
    print(f"  CoAID rows total          : {int(is_coaid.sum()):,}")
    print(f"  dropping CoAID label 0    : {int(drop_coaid_real.sum()):,}")
    print(f"  keeping  CoAID label 1    : {int((is_coaid & (df.label == 1)).sum()):,}")

    kept = df[~drop_coaid_real]

    is_question = kept.text.astype(str).str.strip().str.endswith("?")
    print(f"  dropping rows ending '?'  : {int(is_question.sum()):,}")
    kept = kept[~is_question]

    kept = kept.reset_index(drop=True)
    print(f"final corpus: {len(kept):,} rows\n")

    print(f"embedding with {EMBED_MODEL} (CPU, a few minutes)...")
    embedder = SentenceTransformer(EMBED_MODEL, device="cpu")
    vectors = embedder.encode(
        kept.text.astype(str).tolist(),
        normalize_embeddings=True,
        batch_size=64,
        show_progress_bar=True,
    ).astype("float32")
    print(f"vectors: {vectors.shape}")

    index = faiss.IndexFlatIP(vectors.shape[1])
    index.add(vectors)

    parquet_path = OUT_DIR / EVIDENCE_FILE
    index_path = OUT_DIR / INDEX_FILE
    kept.to_parquet(parquet_path, index=False)
    faiss.write_index(index, str(index_path))

    check_df = pd.read_parquet(parquet_path)
    check_index = faiss.read_index(str(index_path))
    aligned = len(check_df) == check_index.ntotal == len(kept)
    norms = np.linalg.norm(vectors, axis=1)

    print()
    print(f"parquet rows      : {len(check_df):,}")
    print(f"index.ntotal      : {check_index.ntotal:,}")
    print(f"aligned           : {aligned}")
    print(f"vectors normalised: {bool(np.allclose(norms, 1.0, atol=1e-5))}")
    print(f"rows ending '?'   : {int(check_df.text.astype(str).str.strip().str.endswith('?').sum())}")
    print(f"placeholder rows  : {int((check_df.evidence_text.astype(str).str.strip() == PLACEHOLDER).sum())}")
    print(f"label counts      : {check_df.label.value_counts().to_dict()}")

    if not aligned:
        print("\nALIGNMENT CHECK FAILED — not uploading.")
        return 1

    probe = embedder.encode([check_df.text.iloc[0]], normalize_embeddings=True).astype("float32")
    scores, idx = check_index.search(probe, 1)
    print(f"self-retrieval    : row 0 -> {int(idx[0][0])} (score {scores[0][0]:.4f})")
    if int(idx[0][0]) != 0:
        print("\nSELF-RETRIEVAL FAILED — not uploading.")
        return 1

    if not upload:
        print(f"\nBuilt in {OUT_DIR}/. Re-run with --upload to push to the Hub.")
        return 0

    api = HfApi(token=HF_TOKEN)
    for path, name in [(parquet_path, EVIDENCE_FILE), (index_path, INDEX_FILE)]:
        api.upload_file(
            path_or_fileobj=str(path),
            path_in_repo=name,
            repo_id=HF_REPO,
            repo_type="model",
            commit_message="Drop CoAID label-0 rows and question-phrased claims; rebuild index",
        )
        print(f"uploaded {name}")
    return 0


if __name__ == "__main__":
    sys.exit(main("--upload" in sys.argv))
