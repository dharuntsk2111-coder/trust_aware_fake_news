"""Request and response models.

Pydantic handles the input contract: FastAPI turns a validation failure into
HTTP 422 automatically, which is what the spec asks for.
"""
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

# strip_whitespace runs before the length checks, so "   " is rejected as
# empty rather than sneaking through as 3 characters.
ClaimText = Annotated[
    str,
    StringConstraints(strip_whitespace=True, min_length=1, max_length=1000),
]


class ClaimRequest(BaseModel):
    text: ClaimText

    model_config = {
        "json_schema_extra": {
            "example": {"text": "Drinking hot water cures cancer"}
        }
    }


class HealthResponse(BaseModel):
    status: str
    model_loaded: bool


class Evidence(BaseModel):
    similarity: float
    matched_claim: str
    verdict: str
    justification: str


class SubClaim(BaseModel):
    sub_claim: str
    label: str
    confidence: float
    trust_score: float
    # True when strong evidence exists but mostly disagrees with the label.
    contradicted: bool = False
    attention_top: list[tuple[str, float]]
    # Every token in sentence order; attention_top stays the sorted top 5.
    attention_all: list[tuple[str, float]]
    evidence: list[Evidence]


class VerifyResponse(BaseModel):
    claim: str
    verdict: str
    trust_score: float
    sub_claims: list[SubClaim]


class ExplainResponse(BaseModel):
    # Positive value pushes toward FAKE, negative toward REAL.
    tokens: list[tuple[str, float]]
