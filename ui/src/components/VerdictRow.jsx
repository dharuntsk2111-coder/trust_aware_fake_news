import { pct } from "../format.js";
import { TRUST_THRESHOLD } from "../constants.js";

const VERDICT_COLOUR = {
  FAKE: "var(--color-fake)",
  REAL: "var(--color-real)",
  UNVERIFIED: "var(--color-unverified)",
};

const SUBTITLE = {
  FAKE: "Matches claims rated false by fact-checkers.",
  REAL: "Consistent with fact-checked evidence.",
  UNVERIFIED: "Not enough evidence to judge.",
};

export const colourOf = (verdict) =>
  VERDICT_COLOUR[verdict] ?? "var(--color-muted)";

export function VerdictLabel({ verdict, small = false }) {
  const size = small ? "px-1.5 py-[1px] text-[10px]" : "px-2.5 py-[3px] text-[11px]";
  const colour = colourOf(verdict);
  return (
    <span
      className={`inline-block border font-semibold tracking-[0.08em] ${size}`}
      style={{
        color: colour,
        borderColor: `color-mix(in srgb, ${colour} 40%, transparent)`,
        background: `color-mix(in srgb, ${colour} 8%, white)`,
      }}
    >
      {verdict}
    </span>
  );
}

function Bar({ name, value, fill, threshold, format }) {
  const width = `${Math.max(0, Math.min(1, value)) * 100}%`;

  return (
    <div className="flex-1">
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <span className="label">{name}</span>
        <span className="font-mono text-[17px] tabular-nums">{format(value)}</span>
      </div>
      <div className="relative h-[10px] w-full border border-rule bg-card">
        <div className="absolute inset-y-0 left-0" style={{ width, background: fill }} />
        {threshold !== undefined && (
          <div
            className="absolute -top-[4px] h-[18px] w-px bg-ink/60"
            style={{ left: `${threshold * 100}%` }}
          />
        )}
      </div>
      {threshold !== undefined && (
        <span
          className="mt-1.5 block font-mono text-[10.5px] tabular-nums text-muted"
          style={{ marginLeft: `${threshold * 100}%` }}
        >
          {threshold}
        </span>
      )}
    </div>
  );
}

export default function VerdictRow({ verdict, confidence, trust, contradicted }) {
  const CONFIDENT = 0.7;
  const unsupported =
    confidence >= CONFIDENT && trust < TRUST_THRESHOLD && !contradicted;

  const colour = colourOf(verdict);
  const note = contradicted
    ? "The model and the closest fact-checks disagree, so the system declines to judge."
    : unsupported
      ? "The model is confident, but the evidence doesn\u2019t support that confidence."
      : null;

  return (
    <section
      className="border border-l-[5px] border-rule bg-card"
      style={{ borderLeftColor: colour }}
    >
      <div
        className="px-4 py-6 sm:px-7 sm:py-7"
        style={{ background: `color-mix(in srgb, ${colour} 7%, white)` }}
      >
        <p
          className="text-[34px] font-semibold leading-none tracking-[0.06em] sm:text-[42px]"
          style={{ color: colour }}
        >
          {verdict}
        </p>
        <p className="mt-3 text-[14.5px] text-muted">{SUBTITLE[verdict]}</p>
      </div>

      <div className="border-t-2 border-rule-strong px-4 py-6 sm:px-7">
        <div className="flex flex-col gap-7 sm:flex-row sm:gap-12">
          <Bar
            name="Model confidence"
            value={confidence}
            fill="var(--color-ink)"
            format={pct}
          />
          <Bar
            name="Trust score"
            value={trust}
            fill={colour}
            threshold={TRUST_THRESHOLD}
            format={(v) => v.toFixed(3)}
          />
        </div>

        {note && (
          <p
            className="mt-7 border-l-2 pl-3.5 text-[14.5px] leading-[1.6]"
            style={{ borderColor: `color-mix(in srgb, ${colour} 50%, transparent)` }}
          >
            {note}
          </p>
        )}
      </div>
    </section>
  );
}
