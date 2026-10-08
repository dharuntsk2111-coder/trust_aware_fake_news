// These mirror src/config.py. They are display logic only — the backend owns
// the real decisions — but they must stay in step with it, so they live in
// one place rather than being repeated in each component.
export const TRUST_THRESHOLD = 0.55; // below this -> UNVERIFIED
export const SIM_FLOOR = 0.65; // evidence below this is topical, not evidential
