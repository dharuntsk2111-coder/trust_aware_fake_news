"""Splits a compound claim into independently checkable sub-claims.

Known limitation: no coreference resolution ("they contain mercury" loses its
subject).
"""
import re

SPLITTERS = r"\s+(?:and|but|because|which causes|while|whereas|also)\s+|[;]"


def split_claim(claim):
    parts = [p.strip(" ,.") for p in re.split(SPLITTERS, claim, flags=re.I)]
    parts = [p for p in parts if len(p.split()) >= 3]
    return parts if len(parts) > 1 else [claim.strip()]


def clean_input(text):
    """Strip trailing punctuation and whitespace from a sub-claim.

    "Drinking hot water cures cancer." and the same text without the full
    stop must reach the model identically. The cleaned string is what gets
    classified, retrieved on, and explained, so SHAP explains exactly the
    text the classifier saw.
    """
    return str(text).strip().rstrip(".!? \t\n").strip()
