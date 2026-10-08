import { MOCK_VERIFY } from "./mock.js";

const BASE = (import.meta.env.VITE_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "true";

export const apiBase = BASE;
export const usingMock = USE_MOCK;

export class ApiError extends Error {
  constructor(message, { notReady = false } = {}) {
    super(message);
    this.notReady = notReady;
  }
}

async function post(path, text) {
  let res;
  try {
    res = await fetch(`${BASE}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text }),
    });
  } catch {
    throw new ApiError(
      "Could not reach the verification service. It may be starting up or offline — try again in a moment."
    );
  }

  if (res.status === 503) {
    throw new ApiError(
      "The model is still loading — this takes a few minutes after startup. Try again shortly.",
      { notReady: true }
    );
  }
  if (res.status === 422) {
    throw new ApiError("Enter a claim between 1 and 1000 characters.");
  }
  if (!res.ok) {
    throw new ApiError("The verification service returned an error. Please try again.");
  }
  return res.json();
}

/** Pick the fixture whose shape best matches the typed claim. */
function mockFor(text) {
  const t = text.toLowerCase();
  if (t.includes("garlic")) return MOCK_VERIFY.contradicted;
  if (t.includes("and") && t.includes("cures")) return MOCK_VERIFY.compound;
  if (t.includes("tax") || t.includes("government")) return MOCK_VERIFY.unverified;
  return { ...MOCK_VERIFY.fake, claim: text };
}

export async function verify(text) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 400));
    return mockFor(text);
  }
  return post("/verify", text);
}

export async function explain(text) {
  if (USE_MOCK) {
    await new Promise((r) => setTimeout(r, 1200));
    return {
      tokens: [
        ["cures", 0.581], ["water", 0.1434], ["Drinking", 0.137],
        ["hot", -0.0342], ["cancer", 0.0102],
      ],
    };
  }
  return post("/explain", text);
}

export async function health() {
  if (USE_MOCK) return { status: "ok", model_loaded: true };
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
