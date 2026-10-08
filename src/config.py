"""Configuration constants and environment variables.

The constants below were tuned and validated in the training notebooks.
Do not change them without re-validating against the acceptance checks.
"""
import os

from dotenv import load_dotenv

load_dotenv()

HF_TOKEN = os.getenv("HF_TOKEN")
HF_REPO = os.getenv("HF_REPO", "dharuntsk/deberta-fakenews-trust")

BASE_MODEL = "microsoft/deberta-v3-base"
EMBED_MODEL = "all-MiniLM-L6-v2"
MAX_LEN = 64
LABELS = {0: "REAL", 1: "FAKE"}

TOP_K = 3
SIM_FLOOR = 0.65

TRUST_THRESHOLD = 0.55
W_SIM, W_AGREE, W_CONF = 0.5, 0.3, 0.2
NO_EVIDENCE_CAP = 0.35

MODEL_FILE = "model.pt"
INDEX_FILE = "faiss.index"
EVIDENCE_FILE = "evidence.parquet"
CALIBRATION_FILE = "calibration.json"
