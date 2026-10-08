import { useState } from "react";
import { explain } from "../api.js";
import { mergeShapTokens } from "../format.js";
import Section from "./Section.jsx";

/** Red pushes toward FAKE, green toward REAL. Opacity tracks magnitude. */
function ShapWord({ word, value, max }) {
  const strength = max > 0 ? Math.abs(value) / max : 0;
  const colour = value >= 0 ? "var(--color-fake)" : "var(--color-real)";

  return (
    <span
      className="inline-flex items-baseline gap-1.5 border px-2 py-1"
      style={{
        borderColor: `color-mix(in srgb, ${colour} ${20 + 35 * strength}%, transparent)`,
        background: `color-mix(in srgb, ${colour} ${3 + 9 * strength}%, white)`,
      }}
    >
      <span
        className="font-medium"
        style={{ color: colour, opacity: 0.55 + 0.45 * strength }}
      >
        {word}
      </span>
      <span className="font-mono text-[12px] tabular-nums text-muted">
        {value >= 0 ? "+" : ""}
        {value.toFixed(3)}
      </span>
    </span>
  );
}

export default function ShapPanel({ text }) {
  const [state, setState] = useState("idle");
  const [tokens, setTokens] = useState(null);
  const [error, setError] = useState(null);

  async function run() {
    setState("loading");
    setError(null);
    try {
      const data = await explain(text);
      // Sub-word pieces are summed back into whole words for display.
      setTokens(mergeShapTokens(text, data.tokens));
      setState("done");
    } catch (err) {
      setError(err.message);
      setState("idle");
    }
  }

  const max = tokens?.length ? Math.max(...tokens.map(([, v]) => Math.abs(v))) : 0;

  if (state !== "done") {
    return (
      <section className="border border-rule bg-card px-4 py-5 sm:px-6">
        <button
          type="button"
          onClick={run}
          disabled={state === "loading"}
          className="border border-accent bg-accent px-5 py-2.5 text-[14px] font-medium text-white transition-colors hover:bg-accent-ink disabled:border-rule disabled:bg-rule disabled:text-muted"
        >
          {state === "loading"
            ? "Running SHAP\u2026 about 15 seconds"
            : "Why this verdict?"}
        </button>
        {error && <p className="mt-3 text-[13px] text-fake">{error}</p>}
      </section>
    );
  }

  return (
    <Section title="Which words drove it">
      <div className="flex flex-wrap gap-2.5">
        {tokens.map(([word, value], i) => (
          <ShapWord key={i} word={word} value={value} max={max} />
        ))}
      </div>
      <p className="mt-5 border-t border-rule pt-4 text-[12.5px] text-muted">
        <span style={{ color: "var(--color-fake)" }}>red</span> &rarr; FAKE
        &nbsp;&middot;&nbsp;
        <span style={{ color: "var(--color-real)" }}>green</span> &rarr; REAL
      </p>
    </Section>
  );
}
