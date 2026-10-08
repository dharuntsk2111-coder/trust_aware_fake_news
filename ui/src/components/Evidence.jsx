import { useState } from "react";
import { cleanJustification } from "../format.js";
import { SIM_FLOOR } from "../constants.js";
import Section from "./Section.jsx";
import { VerdictLabel, colourOf } from "./VerdictRow.jsx";

const COAID_PLACEHOLDER = "Fact-checked COVID-19 health claim (CoAID dataset).";

function EvidenceItem({ item, position }) {
  const [open, setOpen] = useState(false);
  const isCoaid = String(item.justification ?? "").trim() === COAID_PLACEHOLDER;
  const justification = isCoaid ? "" : cleanJustification(item.justification);
  const weak = item.similarity < SIM_FLOOR;
  const colour = colourOf(item.verdict);

  return (
    <li className="border-t border-rule py-5 first:border-t-0 first:pt-0 last:pb-0">
      <div className="grid grid-cols-[1.9rem_1fr] gap-x-3">
        <span className="pt-[3px] font-mono text-[12px] tabular-nums text-muted/70">
          {String(position).padStart(2, "0")}
        </span>

        <div>
          <p className="mb-3 leading-[1.5]">{item.matched_claim}</p>

          <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted">
            <VerdictLabel verdict={item.verdict} small />

            <span className="flex items-center gap-2">
              <span className="relative block h-[6px] w-[72px] border border-rule bg-card">
                <span
                  className="absolute inset-y-0 left-0"
                  style={{
                    width: `${Math.max(0, Math.min(1, item.similarity)) * 100}%`,
                    background: weak ? "var(--color-rule-strong)" : colour,
                  }}
                />
              </span>
              <span className="font-mono tabular-nums">
                {item.similarity.toFixed(4)}
              </span>
            </span>

            {isCoaid && <span>CoAID</span>}
            {weak && <span>below {SIM_FLOOR} &mdash; topical</span>}
            {justification && (
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="font-medium text-accent underline decoration-accent/40 decoration-1 underline-offset-[4px] transition-colors hover:decoration-accent"
              >
                {open ? "hide" : "show"}
              </button>
            )}
          </div>

          {open && justification && (
            <p
              className="mt-3.5 border-l-2 border-accent/35 px-3.5 py-2.5 text-[13.5px] leading-[1.65] text-muted"
              style={{
                background: "color-mix(in srgb, var(--color-accent) 4%, white)",
              }}
            >
              {justification}
            </p>
          )}
        </div>
      </div>
    </li>
  );
}

export default function Evidence({ items, bare = false }) {
  if (!items?.length) return null;

  const list = (
    <ul>
      {items.map((item, i) => (
        <EvidenceItem key={i} item={item} position={i + 1} />
      ))}
    </ul>
  );

  return bare ? list : <Section title="Closest fact-checks">{list}</Section>;
}
