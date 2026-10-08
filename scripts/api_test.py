"""Phase 2 endpoint checks.

Start the API first, then run:  python -m scripts.api_test
Override the target with:       set API_URL=http://127.0.0.1:8000

Checks the same three verdicts as scripts/smoke_test.py, plus the /health,
/explain and 422 validation behaviour from the API contract.
"""
import os
import sys
import time

import requests

BASE_URL = os.getenv("API_URL", "http://127.0.0.1:8000").rstrip("/")
LOAD_TIMEOUT = 600   # model load is ~200s cold
TOL = 0.01

CASES = [
    ("Drinking hot water cures cancer", "FAKE", 0.8720),
    ("The government announced a new tax policy yesterday", "UNVERIFIED", 0.3168),
    ("Drinking hot water cures cancer and boosts your immune system", "FAKE", 0.8720),
]

failures = []


def check(name, condition, detail=""):
    print(f"[{'PASS' if condition else 'FAIL'}] {name}" + (f"  {detail}" if detail else ""))
    if not condition:
        failures.append(name)
    return condition


def wait_for_model():
    """Poll /health until model_loaded flips to true."""
    deadline = time.time() + LOAD_TIMEOUT
    announced = False
    while time.time() < deadline:
        try:
            r = requests.get(f"{BASE_URL}/health", timeout=10)
        except requests.RequestException as exc:
            print(f"  cannot reach {BASE_URL}: {exc}")
            time.sleep(3)
            continue

        body = r.json()
        if not announced:
            check("GET /health responds 200", r.status_code == 200, str(body))
            check("health has status + model_loaded keys",
                  set(body) == {"status", "model_loaded"}, str(sorted(body)))
            announced = True
        if body.get("model_loaded"):
            return True
        print("  model_loaded: false, still loading...")
        time.sleep(5)
    return False


def main():
    print(f"Target: {BASE_URL}\n")

    if not wait_for_model():
        print(f"\nModel did not load within {LOAD_TIMEOUT}s. Is the server running?")
        return 1
    check("model_loaded is true", True)
    print()

    # --- the three acceptance verdicts ------------------------------------
    for text, want_verdict, want_trust in CASES:
        r = requests.post(f"{BASE_URL}/verify", json={"text": text}, timeout=120)
        if not check(f"POST /verify 200: {text[:45]}", r.status_code == 200, f"got {r.status_code}"):
            continue
        body = r.json()
        got_verdict, got_trust = body["verdict"], body["trust_score"]
        check(f"  verdict {got_verdict} == {want_verdict}", got_verdict == want_verdict)
        check(f"  trust {got_trust} ~= {want_trust}", abs(got_trust - want_trust) <= TOL)
        check("  sub_claims present", len(body["sub_claims"]) >= 1,
              f"{len(body['sub_claims'])} sub-claim(s)")
    print()

    # --- validation: 422 on empty and oversized ---------------------------
    for label, payload in [
        ("empty string", {"text": ""}),
        ("whitespace only", {"text": "   "}),
        ("1001 characters", {"text": "a" * 1001}),
        ("missing field", {}),
    ]:
        r = requests.post(f"{BASE_URL}/verify", json=payload, timeout=30)
        check(f"POST /verify 422 on {label}", r.status_code == 422, f"got {r.status_code}")
    r = requests.post(f"{BASE_URL}/explain", json={"text": ""}, timeout=30)
    check("POST /explain 422 on empty string", r.status_code == 422, f"got {r.status_code}")
    print()

    # --- /explain ---------------------------------------------------------
    print("POST /explain (slow, 15-30s on CPU)...")
    t0 = time.time()
    r = requests.post(f"{BASE_URL}/explain",
                      json={"text": "Drinking hot water cures cancer"}, timeout=300)
    if check(f"POST /explain 200 ({time.time() - t0:.1f}s)", r.status_code == 200,
             f"got {r.status_code}"):
        tokens = r.json()["tokens"]
        check("  tokens is a non-empty list", bool(tokens), f"{len(tokens)} tokens")
        check("  each token is [word, value]",
              all(len(t) == 2 and isinstance(t[0], str) for t in tokens))
        top_word, top_value = tokens[0]
        check(f"  '{top_word}' dominates (expected 'cures')", top_word.strip(".,").lower() == "cures",
              f"value {top_value:+.4f}")
        for word, value in tokens[:5]:
            print(f"      {word:>15}  {value:+.4f}")
    print()

    if failures:
        print(f"API TEST FAILED ({len(failures)} check(s)):")
        for f in failures:
            print(f"  - {f}")
        return 1
    print("API TEST PASSED")
    return 0


if __name__ == "__main__":
    sys.exit(main())
