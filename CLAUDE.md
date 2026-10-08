# Trust-Aware Fake News Detection — Project Context

Final-year prototype. The ML model is **already trained** in Google Colab (4 notebooks, in GitHub under `notebooks/`). This repo turns it into a working application.

The developer is experienced with software but a beginner at ML. Explain ML-specific decisions briefly in comments. Do not introduce new ML techniques.

## Hard rules

- **Do not change the model architecture, thresholds, or weights below.** They were tuned and validated. If something seems wrong, ask before changing it.
- **Do not replace the custom `DebertaAttnPool` with `AutoModelForSequenceClassification`.** The attention pooling layer is a required project component and must load the saved weights exactly.
- **CPU only.** No `.cuda()`. Load checkpoints with `map_location='cpu'`.
- **Load models once at startup**, never per request. Loading takes ~30s.
- **Never hard-code the Hugging Face token.** Read `HF_TOKEN` from environment / `.env`. `.env` must be in `.gitignore`.
- Work in the phase requested. Do not start the frontend or deployment unless asked.

## PICO (project spec)

- Intervention: DeBERTa + Attention Mechanism + RAG + SHAP
- Comparison: BiLSTM, BERT, RoBERTa (done in notebooks, results only)
- Outcome: macro-F1 with calibrated confidence

**Training data:** the classifier was trained on **LIAR2 + CoAID**, roughly 21% health claims. It is not LIAR2-only — do not describe it that way.

## Trained artifacts (private HF Hub model repo)

Repo id: `dharuntsk/deberta-fakenews-trust` (set via `HF_REPO` env var)

| File | Contents |
|---|---|
| `model.pt` | `state_dict` of `DebertaAttnPool` (~736 MB, fp32) |
| `faiss.index` | `IndexFlatIP` over 19,770 normalized MiniLM embeddings |
| `evidence.parquet` | 19,770 rows; columns `claim_id, text, evidence_text, label` (label 1 = FAKE, 0 = REAL) |
| `calibration.json` | `{"temperature": <float>, "ece_before": 0.113, "ece_after": 0.0823}` |

Download with `huggingface_hub.hf_hub_download(repo_id, filename, token=HF_TOKEN)`. It caches locally.

**Critical:** row *i* of `evidence.parquet` corresponds to vector *i* in `faiss.index`. Never sort, filter, or dedupe the parquet after loading.

## Configuration constants

```python
BASE_MODEL      = "microsoft/deberta-v3-base"
EMBED_MODEL     = "all-MiniLM-L6-v2"
MAX_LEN         = 64
LABELS          = {0: "REAL", 1: "FAKE"}
TOP_K           = 3
SIM_FLOOR       = 0.65   # evidence below this is topical, not evidential
TRUST_THRESHOLD = 0.55   # below this -> UNVERIFIED
W_SIM, W_AGREE, W_CONF = 0.5, 0.3, 0.2
NO_EVIDENCE_CAP = 0.35
```

## Reference implementation (from the notebook — reproduce exactly)

### Model

```python
class DebertaAttnPool(nn.Module):
    def __init__(self, model_name=BASE_MODEL, n_class=2, dropout=0.3):
        super().__init__()
        # transformers 5.x: `dtype=`. If TypeError, use `torch_dtype=`.
        # Must be float32 — fp16 weights cause dtype mismatch with the custom layers.
        self.encoder = AutoModel.from_pretrained(model_name, dtype=torch.float32)
        h = self.encoder.config.hidden_size          # 768
        self.attn = nn.Sequential(nn.Linear(h, 128), nn.Tanh(), nn.Linear(128, 1))
        self.drop = nn.Dropout(dropout)
        self.fc   = nn.Linear(h, n_class)

    def forward(self, input_ids, attention_mask, labels=None, **kw):
        out = self.encoder(input_ids=input_ids,
                           attention_mask=attention_mask).last_hidden_state
        s = self.attn(out).squeeze(-1)
        s = s.masked_fill(attention_mask == 0, torch.finfo(s.dtype).min)
        w = torch.softmax(s, 1)
        pooled = torch.bmm(w.unsqueeze(1), out).squeeze(1)
        return {"logits": self.fc(self.drop(pooled)), "attn_weights": w}
```

Load: `model.load_state_dict(torch.load(path, map_location="cpu")); model.eval()`.
Tokenizer: `AutoTokenizer.from_pretrained(BASE_MODEL)` (requires `sentencepiece`).

### Classify

```python
def classify(text):
    enc = tok(text, truncation=True, padding="max_length",
              max_length=MAX_LEN, return_tensors="pt")
    with torch.no_grad():
        out = model(**enc)
    prob_cal = torch.softmax(out["logits"] / T_OPT, 1)[0]   # temperature scaling
    pred = int(prob_cal.argmax())

    ids = tok.convert_ids_to_tokens(enc["input_ids"][0])
    w = out["attn_weights"][0].cpu().numpy()
    toks = [(t.replace("▁", ""), round(float(wi), 4))
            for t, wi in zip(ids, w)
            if t not in ("[CLS]", "[SEP]", "[PAD]") and t.replace("▁", "")]
    top = sorted(toks, key=lambda x: -x[1])[:5]

    return {"label": LABELS[pred],
            "confidence": round(float(prob_cal[pred]), 4),
            "attention_top": top}
```

### Retrieve

```python
def retrieve(claim, k=TOP_K):
    q = embedder.encode([claim], normalize_embeddings=True).astype("float32")
    scores, idx = index.search(q, k)
    out = []
    for s, i in zip(scores[0], idx[0]):
        r = evidence.iloc[i]
        out.append({
            "similarity": round(float(s), 4),
            "matched_claim": r.text,
            "verdict": "FAKE" if r.label == 1 else "REAL",
            "justification": str(r.evidence_text)[:300],
        })
    return out
```

### Claim splitter

```python
SPLITTERS = r"\s+(?:and|but|because|which causes|while|whereas|also)\s+|[;]"

def split_claim(claim):
    parts = [p.strip(" ,.") for p in re.split(SPLITTERS, claim, flags=re.I)]
    parts = [p for p in parts if len(p.split()) >= 3]
    return parts if len(parts) > 1 else [claim.strip()]
```

Known limitation: no coreference resolution ("they contain mercury" loses its subject).

### Trust score

Agreement is measured **against the model's predicted label**, not among the evidence items. Measuring it among the items let three retrieved rows agree with each other while all disagreed with the model, which read as perfect agreement and inflated trust.

Returns `(trust, contradicted)`.

```python
def trust_score(conf_cal, ev, label):
    if not ev:
        return 0.0, False
    sim = ev[0]["similarity"]
    strong = [e for e in ev if e["similarity"] >= SIM_FLOOR]
    if not strong:
        return round(float(np.clip(NO_EVIDENCE_CAP * conf_cal, 0, 1)), 4), False
    agree = sum(1 for e in strong if e["verdict"] == label) / len(strong)
    if agree < 0.5:            # evidence contradicts the model -> cap it low
        return round(float(np.clip(NO_EVIDENCE_CAP * conf_cal, 0, 1)), 4), True
    trust = W_SIM * sim + W_AGREE * agree + W_CONF * conf_cal
    return round(float(np.clip(trust, 0, 1)), 4), False
```

An exact 50/50 split is not a contradiction (the test is `agree < 0.5`). A contradicted sub-claim carries `contradicted: true` and falls below `TRUST_THRESHOLD`, so the claim reports UNVERIFIED.

### Verify (the only public entry point)

```python
def verify(text, k=TOP_K):
    results = []
    for s in split_claim(text):
        c  = classify(s)
        ev = retrieve(s, k)
        trust, contradicted = trust_score(c["confidence"], ev, c["label"])
        results.append({
            "sub_claim": s,
            "label": c["label"],
            "confidence": c["confidence"],
            "trust_score": trust,
            "contradicted": contradicted,
            "attention_top": c["attention_top"],
            "evidence": ev,
        })

    strong_fake = [r for r in results
                   if r["label"] == "FAKE" and r["trust_score"] >= TRUST_THRESHOLD]
    if strong_fake:                                   # one proven-false part -> FAKE
        final, trust = "FAKE", max(r["trust_score"] for r in strong_fake)
    elif all(r["trust_score"] < TRUST_THRESHOLD for r in results):
        final, trust = "UNVERIFIED", max(r["trust_score"] for r in results)
    else:                                             # cautious about declaring true
        final, trust = "REAL", min(r["trust_score"] for r in results)

    return {"claim": text, "verdict": final,
            "trust_score": round(trust, 4), "sub_claims": results}
```

### SHAP (slow: 15–30s on CPU — separate endpoint, never inside `verify`)

```python
def shap_explain(text, max_evals=100):
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
```

Positive value pushes toward FAKE, negative toward REAL.

## Target structure

```
src/
  config.py      constants + env vars (HF_TOKEN, HF_REPO)
  artifacts.py   downloads the 4 files from HF Hub, returns local paths
  model.py       DebertaAttnPool
  retrieval.py   Retriever class: loads embedder, index, evidence; retrieve()
  splitter.py    split_claim()
  trust.py       trust_score()
  explain.py     shap_explain()
  pipeline.py    Pipeline class: loads everything once; classify(), verify(), explain()
scripts/
  smoke_test.py  runs the acceptance checks below
api/             (Phase 2)
ui/              (Phase 3)
```

`Pipeline` is the only thing the API imports. Instantiate it once.

## Acceptance checks (must match the notebook)

| Input | Verdict | Trust |
|---|---|---|
| Drinking hot water cures cancer | FAKE | 0.8720 |
| The government announced a new tax policy yesterday | UNVERIFIED | 0.3168 |
| Drinking hot water cures cancer and boosts your immune system | FAKE | 0.8720 |
| Garlic prevents COVID-19 infection | UNVERIFIED | 0.3490 |

Trust values may differ in the last decimal due to CPU/library versions. A different **verdict** means a bug.

The garlic row is a regression test. CoAID originally contributed question-phrased rows ("Can eating garlic help prevent COVID-19?") carrying label 0, so a false claim retrieved them and returned REAL with trust 0.9551. Those rows were removed from the corpus, and the model still predicts REAL here — the UNVERIFIED verdict comes from the contradiction rule, since the surviving evidence is FAKE.

SHAP on "Drinking hot water cures cancer": `cures` should dominate (~+0.58).

## Known limitations

- **Negation blindness.** Retrieval cannot distinguish a claim from its opposite: "masks work" and "masks don’t work" embed almost identically. A true claim can therefore match debunked opposite claims and be reported FAKE with high trust. This is the most serious known failure mode.
- **No coreference resolution in the splitter.** "they contain mercury" loses its subject once split from the sentence that introduced it.
- **Reads only the first 64 tokens** (`MAX_LEN`). Anything beyond that is truncated, so the system is best suited to single-sentence claims.
- **The evidence corpus is static and pre-2023.** Claims about recent events have no matching evidence and fall through as UNVERIFIED.

Reference performance (notebook, CPU): ~1.1s single claim, ~3.2s two-part claim, ~2 GB RAM.

## API contract (Phase 2)

- `GET  /health` → `{"status": "ok", "model_loaded": true}`
- `POST /verify` body `{"text": str}` → output of `verify()`
- `POST /explain` body `{"text": str}` → `{"tokens": [[word, value], ...]}`

Reject empty text and text over ~1000 characters with HTTP 422.

## Deployment

**Not deployed. The project runs locally** — see the README.

The model needs ~2 GB of RAM, which no free tier provides: Render's free web
service gives 512 MB, and Hugging Face Spaces has 16 GB free but gated the
Docker SDK behind PRO in 2026. Cloud Run fits but scales to zero, so a cold
request re-downloads the 736 MB checkpoint.

`Dockerfile` (API, CPU-only torch, port 7860) and `render.yaml` (frontend
static site) are kept ready in the repo. A hosted API must set
`ALLOWED_ORIGINS` to the site origin; it defaults to `*` for local use.

## Model results (for reference, do not recompute)

| Model | Test macro-F1 |
|---|---|
| Majority baseline | 0.3636 |
| BiLSTM | 0.7161 |
| BERT-base | 0.7847 |
| RoBERTa-base | 0.7942 |
| DeBERTa + Attention | 0.8004 |

Calibration: ECE 0.113 → 0.0823, macro-F1 unchanged.
