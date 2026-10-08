"""Pipeline: the only thing the API imports. Instantiate it once at startup.

Loading takes ~30s and ~2 GB RAM, so never build this per request.
"""
import json

import torch
from transformers import AutoTokenizer

from .artifacts import get_artifact_paths
from .config import BASE_MODEL, LABELS, MAX_LEN, TOP_K, TRUST_THRESHOLD
from .explain import shap_explain
from .model import load_model
from .retrieval import Retriever
from .splitter import clean_input, split_claim
from .trust import trust_score


class Pipeline:
    def __init__(self):
        paths = get_artifact_paths()

        self.tok = AutoTokenizer.from_pretrained(BASE_MODEL)
        self.model = load_model(paths["model"])
        self.retriever = Retriever(paths["index"], paths["evidence"])

        with open(paths["calibration"]) as fh:
            calibration = json.load(fh)
        self.T_OPT = float(calibration["temperature"])

    def classify(self, text):
        tok, model, T_OPT = self.tok, self.model, self.T_OPT

        enc = tok(text, truncation=True, padding="max_length",
                  max_length=MAX_LEN, return_tensors="pt")
        with torch.no_grad():
            out = model(**enc)
        prob_cal = torch.softmax(out["logits"] / T_OPT, 1)[0]
        pred = int(prob_cal.argmax())

        ids = tok.convert_ids_to_tokens(enc["input_ids"][0])
        w = out["attn_weights"][0].cpu().numpy()
        toks = [(t.replace("\u2581", ""), round(float(wi), 4))
                for t, wi in zip(ids, w)
                if t not in ("[CLS]", "[SEP]", "[PAD]") and t.replace("\u2581", "")]
        top = sorted(toks, key=lambda x: -x[1])[:5]

        return {"label": LABELS[pred],
                "confidence": round(float(prob_cal[pred]), 4),
                "attention_top": top,
                "attention_all": toks}

    def retrieve(self, claim, k=TOP_K):
        return self.retriever.retrieve(claim, k)

    def verify(self, text, k=TOP_K):
        results = []
        for s in split_claim(text):
            s  = clean_input(s)
            c  = self.classify(s)
            ev = self.retrieve(s, k)
            trust, contradicted = trust_score(c["confidence"], ev, c["label"])
            results.append({
                "sub_claim": s,
                "label": c["label"],
                "confidence": c["confidence"],
                "trust_score": trust,
                "contradicted": contradicted,
                "attention_top": c["attention_top"],
                "attention_all": c["attention_all"],
                "evidence": ev,
            })

        strong_fake = [r for r in results
                       if r["label"] == "FAKE" and r["trust_score"] >= TRUST_THRESHOLD]
        if strong_fake:
            final, trust = "FAKE", max(r["trust_score"] for r in strong_fake)
        elif all(r["trust_score"] < TRUST_THRESHOLD for r in results):
            final, trust = "UNVERIFIED", max(r["trust_score"] for r in results)
        else:
            final, trust = "REAL", min(r["trust_score"] for r in results)

        return {"claim": text, "verdict": final,
                "trust_score": round(trust, 4), "sub_claims": results}

    def explain(self, text, max_evals=100):
        return shap_explain(clean_input(text), self.model, self.tok, self.T_OPT,
                            max_evals=max_evals)
