"""Trust score: how well the retrieved evidence backs the model's prediction.

Blends evidence similarity, agreement with the model's label, and the
calibrated confidence. Claims with no strong evidence are capped low, and so
are claims whose strong evidence contradicts the model.
"""
import numpy as np

from .config import NO_EVIDENCE_CAP, SIM_FLOOR, W_AGREE, W_CONF, W_SIM


def trust_score(conf_cal, ev, label):
    """Return (trust, contradicted).

    Agreement is measured against the model's predicted label, not among the
    evidence items themselves: three retrieved items can agree with each
    other while all disagreeing with the model, which used to read as perfect
    agreement and inflate trust.

    When strong evidence exists but most of it points the other way, the
    evidence contradicts the model, so trust is capped the same way as the
    no-evidence case — low enough to fall under TRUST_THRESHOLD.
    """
    if not ev:
        return 0.0, False

    sim = ev[0]["similarity"]
    strong = [e for e in ev if e["similarity"] >= SIM_FLOOR]
    if not strong:
        return round(float(np.clip(NO_EVIDENCE_CAP * conf_cal, 0, 1)), 4), False

    agree = sum(1 for e in strong if e["verdict"] == label) / len(strong)
    if agree < 0.5:
        return round(float(np.clip(NO_EVIDENCE_CAP * conf_cal, 0, 1)), 4), True

    trust = W_SIM * sim + W_AGREE * agree + W_CONF * conf_cal
    return round(float(np.clip(trust, 0, 1)), 4), False
