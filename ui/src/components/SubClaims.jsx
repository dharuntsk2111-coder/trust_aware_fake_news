import { pct } from "../format.js";
import Evidence from "./Evidence.jsx";
import Section from "./Section.jsx";
import { VerdictLabel } from "./VerdictRow.jsx";

/**
 * Only rendered when the splitter found more than one checkable part.
 *
 * Each part carries its own evidence, because a compound claim is judged
 * part by part, and hiding the non-deciding part's evidence hides half of
 * why the verdict came out the way it did.
 */
export default function SubClaims({ subClaims, decisive }) {
  return (
    <Section title={`The claim in ${subClaims.length} parts`}>
      <ol className="space-y-6">
        {subClaims.map((part, i) => {
          const decided = part === decisive;
          return (
            <li
              key={i}
              className="border border-l-[4px] border-rule px-4 py-4"
              style={{
                borderLeftColor: decided
                  ? "var(--color-accent)"
                  : "var(--color-rule-strong)",
                background: decided
                  ? "color-mix(in srgb, var(--color-accent) 4%, white)"
                  : undefined,
              }}
            >
              <p className="mb-3 leading-[1.5]">{part.sub_claim}</p>

              <div className="flex flex-wrap items-center gap-x-3 gap-y-2 text-[13px] text-muted">
                <VerdictLabel verdict={part.label} small />
                <span className="font-mono tabular-nums">{pct(part.confidence)}</span>
                <span className="font-mono tabular-nums">
                  trust {part.trust_score.toFixed(3)}
                </span>
                {part.contradicted && <span>evidence disagrees</span>}
                {decided && (
                  <span className="font-medium text-accent">decided the verdict</span>
                )}
              </div>

              <div className="mt-5 border-t border-rule pt-5">
                <Evidence items={part.evidence} bare />
              </div>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
