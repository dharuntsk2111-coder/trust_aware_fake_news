"""FAISS retrieval over the evidence corpus.

Row i of evidence.parquet corresponds to vector i in faiss.index.
Never sort, filter, or dedupe the dataframe after loading — that breaks the
alignment and the retrieved evidence becomes silently wrong.
"""
import faiss
import pandas as pd
from sentence_transformers import SentenceTransformer

from .config import EMBED_MODEL, TOP_K


class Retriever:
    def __init__(self, index_path: str, evidence_path: str):
        self.embedder = SentenceTransformer(EMBED_MODEL, device="cpu")
        self.index = faiss.read_index(index_path)
        self.evidence = pd.read_parquet(evidence_path)

    def retrieve(self, claim, k=TOP_K):
        # The index is IndexFlatIP over normalized vectors, so inner product
        # is cosine similarity.
        q = self.embedder.encode([claim], normalize_embeddings=True).astype("float32")
        scores, idx = self.index.search(q, k)
        out = []
        for s, i in zip(scores[0], idx[0]):
            r = self.evidence.iloc[i]
            out.append({
                "similarity": round(float(s), 4),
                "matched_claim": r.text,
                "verdict": "FAKE" if r.label == 1 else "REAL",
                "justification": str(r.evidence_text)[:300],
            })
        return out
