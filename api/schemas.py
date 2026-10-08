"""Request and response models.

Pydantic handles the input contract: FastAPI turns a validation failure into
HTTP 422 automatically, which is what the spec asks for.
"""
from typing import Annotated

from pydantic import BaseModel, Field, StringConstraints

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
    contradicted: bool = False
    attention_top: list[tuple[str, float]]
    attention_all: list[tuple[str, float]]
    evidence: list[Evidence]


class VerifyResponse(BaseModel):
    claim: str
    verdict: str
    trust_score: float
    sub_claims: list[SubClaim]


class ExplainResponse(BaseModel):
    tokens: list[tuple[str, float]]
