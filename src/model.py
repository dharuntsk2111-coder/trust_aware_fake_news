"""DeBERTa encoder with a learned attention-pooling head.

Attention pooling replaces the usual [CLS] pooling: a small network scores
every token, and the pooled vector is the softmax-weighted sum of the token
states. The weights double as a per-token explanation.

This class must stay byte-compatible with the saved state_dict.
"""
import torch
import torch.nn as nn
from transformers import AutoModel

from .config import BASE_MODEL


class DebertaAttnPool(nn.Module):
    def __init__(self, model_name=BASE_MODEL, n_class=2, dropout=0.3):
        super().__init__()
        # transformers 5.x: `dtype=`. If TypeError, use `torch_dtype=`.
        # Must be float32 — fp16 weights cause dtype mismatch with the custom layers.
        try:
            self.encoder = AutoModel.from_pretrained(model_name, dtype=torch.float32)
        except TypeError:
            self.encoder = AutoModel.from_pretrained(model_name, torch_dtype=torch.float32)
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


def load_model(checkpoint_path: str) -> DebertaAttnPool:
    """Build the model and load the trained weights. CPU only."""
    model = DebertaAttnPool()
    model.load_state_dict(torch.load(checkpoint_path, map_location="cpu"))
    model.eval()
    return model
