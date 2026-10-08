import { pct } from "../format.js";
import Section from "./Section.jsx";
import { VerdictLabel } from "./VerdictRow.jsx";

/**
 * Shown only when the evidence changed the answer — the classifier predicted
 * one label and the system reports another.
 *
 * This is the point of the trust layer: the classifier alone would have
 * returned its prediction with full confidence, and the retrieved evidence
 * is what stopped it.
 */
export default function Override({ label, confidence, verdict, trust }) {
  if (!label || label === verdict) return null;

  return (
    <Section title="What the evidence changed">
      <div className="grid gap-5 sm:grid-cols-[1fr_auto_1fr] sm:items-center sm:gap-7">
        <Side
          title="Classifier alone"
          verdict={label}
          metric={pct(confidence)}
          unit="confidence"
        />
        <span
          aria-hidden="true"
          className="hidden text-[20px] text-rule-strong sm:block"
        >
          &rarr;
        </span>
        <Side
          title="With evidence"
          verdict={verdict}
          metric={trust.toFixed(3)}
          unit="trust"
          highlight
        />
      </div>
    </Section>
  );
}

function Side({ title, verdict, metric, unit, highlight = false }) {
  return (
    <div
      className="border border-rule px-4 py-4"
      style={
        highlight
          ? { background: "color-mix(in srgb, var(--color-accent) 5%, white)" }
          : undefined
      }
    >
      <p className="label mb-2.5">{title}</p>
      <div className="flex items-baseline gap-3">
        <VerdictLabel verdict={verdict} />
        <span className="font-mono text-[16px] tabular-nums">{metric}</span>
        <span className="text-[12px] text-muted">{unit}</span>
      </div>
    </div>
  );
}
