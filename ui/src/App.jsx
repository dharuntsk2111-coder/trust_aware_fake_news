import { useState } from "react";
import { ApiError, verify } from "./api.js";
import { TRUST_THRESHOLD } from "./constants.js";
import Attention from "./components/Attention.jsx";
import Evidence from "./components/Evidence.jsx";
import Override from "./components/Override.jsx";
import ShapPanel from "./components/ShapPanel.jsx";
import SubClaims from "./components/SubClaims.jsx";
import VerdictRow from "./components/VerdictRow.jsx";

const EXAMPLES = [
  "Drinking hot water cures cancer",
  "Drinking hot water cures cancer and boosts your immune system",
  "The government announced a new tax policy yesterday",
  "Garlic prevents COVID-19 infection",
];

const MAX_CHARS = 1000;

const highestTrust = (parts) =>
  parts.reduce((a, b) => (b.trust_score > a.trust_score ? b : a));
const lowestTrust = (parts) =>
  parts.reduce((a, b) => (b.trust_score < a.trust_score ? b : a));

function pickDecisive(result) {
  const parts = result?.sub_claims ?? [];
  if (!parts.length) return null;
  if (parts.length === 1) return parts[0];

  if (result.verdict === "FAKE") {
    const strong = parts.filter(
      (p) => p.label === "FAKE" && p.trust_score >= TRUST_THRESHOLD
    );
    return highestTrust(strong.length ? strong : parts);
  }
  if (result.verdict === "UNVERIFIED") return highestTrust(parts);
  return lowestTrust(parts);
}

export default function App() {
  const [text, setText] = useState("");
  const [result, setResult] = useState(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(null);

  async function check(claim) {
    const value = claim.trim();
    if (!value) {
      setError("Enter a claim to check.");
      return;
    }
    setChecking(true);
    setError(null);
    try {
      setResult(await verify(value));
    } catch (err) {
      setResult(null);
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    } finally {
      setChecking(false);
    }
  }

  const subClaims = result?.sub_claims ?? [];
  const multi = subClaims.length > 1;
  const decisive = pickDecisive(result);
  const contradicted = decisive?.contradicted ?? false;

  const resultKey = (result?.claim ?? "") + "|" + (decisive?.sub_claim ?? "");

  return (
    <>
      <header className="border-b-2 border-rule-strong bg-card">
        <div className="shell flex flex-wrap items-center gap-x-4 gap-y-2 py-5">
          <span aria-hidden="true" className="h-7 w-[5px] shrink-0 bg-accent" />
          <h1 className="text-[19px] font-semibold tracking-[-0.015em] sm:text-[21px]">
            Claim verification
          </h1>
          <p className="basis-full text-[13.5px] text-muted sm:ml-auto sm:basis-auto sm:text-right">
            DeBERTa classifier, checked against fact-checked evidence
          </p>
        </div>
      </header>

      <main className="shell py-8 sm:py-12">
        <div className="grid items-start gap-8 lg:grid-cols-[minmax(300px,370px)_1fr] lg:gap-10">
          <div className="space-y-6 lg:sticky lg:top-8">
            <form
              className="border border-rule bg-card px-4 py-5 sm:px-6 sm:py-6"
              onSubmit={(e) => {
                e.preventDefault();
                check(text);
              }}
            >
              <label className="label mb-2 block" htmlFor="claim">
                Claim
              </label>
              <textarea
                id="claim"
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX_CHARS))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    check(text);
                  }
                }}
                rows={4}
                placeholder="Paste a claim"
                className="w-full resize-y border border-rule bg-paper/40 px-3.5 py-3 leading-[1.55] placeholder:text-muted/60 hover:border-muted/45 focus:border-accent focus:bg-card"
              />
              <div className="mt-4 flex items-center gap-4">
                <button
                  type="submit"
                  disabled={checking}
                  className="border border-ink bg-ink px-5 py-2.5 text-[14px] font-medium text-paper transition-colors hover:border-accent-ink hover:bg-accent-ink disabled:cursor-not-allowed disabled:border-rule disabled:bg-rule disabled:text-muted"
                >
                  {checking ? "Checking…" : "Check claim"}
                </button>
                <span className="ml-auto font-mono text-[12px] tabular-nums text-muted/80">
                  {text.length}/{MAX_CHARS}
                </span>
              </div>
            </form>

            <div className="border border-rule bg-card px-4 py-5 sm:px-6">
              <p className="label mb-3">Try one</p>
              <ul className="space-y-2.5">
                {EXAMPLES.map((example) => (
                  <li key={example}>
                    <button
                      type="button"
                      onClick={() => {
                        setText(example);
                        check(example);
                      }}
                      className="text-left text-[14px] leading-[1.5] text-accent underline decoration-accent/30 decoration-1 underline-offset-[5px] transition-colors hover:decoration-accent"
                    >
                      {example}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div aria-live="polite" className="min-w-0">
            {error && (
              <p className="border border-rule border-l-[4px] border-l-fake bg-card px-4 py-3.5 text-[14px] text-fake">
                {error}
              </p>
            )}

            {!result && !error && (
              <p className="border border-dashed border-rule-strong px-4 py-10 text-center text-[14px] text-muted">
                The verdict, the evidence behind it and the words that drove it
                appear here.
              </p>
            )}

            {result && (
              <div className="space-y-7">
                <VerdictRow
                  verdict={result.verdict}
                  confidence={decisive?.confidence ?? 0}
                  trust={result.trust_score}
                  contradicted={contradicted}
                />

                {result.verdict === "UNVERIFIED" && !contradicted && (
                  <p className="-mt-3 text-[14px] text-muted">
                    No sufficiently similar fact-checked claim was found, so the
                    system declines to judge this one.
                  </p>
                )}

                {decisive && (
                  <Override
                    label={decisive.label}
                    confidence={decisive.confidence}
                    verdict={result.verdict}
                    trust={result.trust_score}
                  />
                )}

                {multi && (
                  <SubClaims
                    key={"subs-" + resultKey}
                    subClaims={subClaims}
                    decisive={decisive}
                  />
                )}

                {decisive && (
                  <Attention
                    key={"attn-" + resultKey}
                    text={decisive.sub_claim}
                    attentionAll={decisive.attention_all}
                    attentionTop={decisive.attention_top}
                  />
                )}

                {decisive && !multi && (
                  <Evidence key={"ev-" + resultKey} items={decisive.evidence} />
                )}

                <ShapPanel
                  key={"shap-" + resultKey}
                  text={decisive?.sub_claim ?? result.claim}
                />
              </div>
            )}
          </div>
        </div>
      </main>
    </>
  );
}
