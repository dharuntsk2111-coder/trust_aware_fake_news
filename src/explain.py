"""SHAP token attributions.

Slow: 15-30s on CPU. This belongs on its own endpoint and must never be
called inside verify().

Positive value pushes toward FAKE, negative toward REAL.
"""
import numpy as np
import shap
import torch

from .config import MAX_LEN


def shap_explain(text, model, tok, T_OPT, max_evals=100):
    def f(texts):
        probs = []
        for t in texts:
            enc = tok(str(t), truncation=True, padding="max_length",
                      max_length=MAX_LEN, return_tensors="pt")
            with torch.no_grad():
                lg = model(**enc)["logits"]
            probs.append(torch.softmax(lg / T_OPT, 1)[0, 1].item())  # P(FAKE)
        return np.array(probs)

    explainer = shap.Explainer(f, shap.maskers.Text(tok))
    sv = explainer([text], max_evals=max_evals)
    pairs = [(w.strip(), round(float(v), 4))
             for w, v in zip(sv.data[0], sv.values[0]) if w.strip()]
    return sorted(pairs, key=lambda x: -abs(x[1]))[:8]
