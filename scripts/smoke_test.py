"""Phase 1 acceptance checks.

Run:  python -m scripts.smoke_test
A different VERDICT from the notebook means a bug. Trust values may differ in
the last decimal due to CPU / library versions.
"""
import sys
import time
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from src.pipeline import Pipeline

TOL = 0.01

CASES = [
    ("Drinking hot water cures cancer", "FAKE", 0.8720),
    ("The government announced a new tax policy yesterday", "UNVERIFIED", 0.3168),
    ("Drinking hot water cures cancer and boosts your immune system", "FAKE", 0.8720),
    ("Garlic prevents COVID-19 infection", "UNVERIFIED", 0.3490),
    ("Drinking hot water cures cancer.", "FAKE", 0.8720),
]

SHAP_CASE = "Drinking hot water cures cancer"


def main():
    print("Loading pipeline (first run downloads ~736 MB and takes ~30s)...")
    t0 = time.time()
    pipe = Pipeline()
    print(f"Loaded in {time.time() - t0:.1f}s\n")

    failures = []

    for text, want_verdict, want_trust in CASES:
        t0 = time.time()
        res = pipe.verify(text)
        elapsed = time.time() - t0

        got_verdict = res["verdict"]
        got_trust = res["trust_score"]
        verdict_ok = got_verdict == want_verdict
        trust_ok = want_trust is None or abs(got_trust - want_trust) <= TOL

        status = "PASS" if verdict_ok else "FAIL"
        print(f"[{status}] {text}")
        print(f"       verdict: {got_verdict} (expected {want_verdict})")
        expected = "not pinned" if want_trust is None else f"~{want_trust}"
        print(f"       trust:   {got_trust} (expected {expected})"
              f"{'' if trust_ok else '  <- outside tolerance'}")
        print(f"       sub-claims: {len(res['sub_claims'])}, {elapsed:.2f}s")
        for sub in res["sub_claims"]:
            print(f"         - {sub['sub_claim']!r} -> {sub['label']} "
                  f"conf={sub['confidence']} trust={sub['trust_score']}")
            print(f"           attention_top: {sub['attention_top']}")
            if sub["evidence"]:
                top = sub["evidence"][0]
                print(f"           top evidence: sim={top['similarity']} "
                      f"{top['verdict']} :: {top['matched_claim'][:80]!r}")
        print()

        if not verdict_ok:
            failures.append(f"{text!r}: verdict {got_verdict} != {want_verdict}")
        elif not trust_ok:
            print(f"       NOTE: trust drifted more than {TOL} from the notebook\n")

    print("SHAP check (slow, 15-30s on CPU)...")
    t0 = time.time()
    tokens = pipe.explain(SHAP_CASE)
    print(f"  {SHAP_CASE!r}  ({time.time() - t0:.1f}s)")
    for word, value in tokens:
        print(f"    {word:>15}  {value:+.4f}")
    if tokens and tokens[0][0].lower().strip(".,") != "cures":
        print("  NOTE: expected 'cures' to dominate (~+0.58)")
    print()

    if failures:
        print("SMOKE TEST FAILED:")
        for f in failures:
            print(f"  - {f}")
        return 1

    print("SMOKE TEST PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
