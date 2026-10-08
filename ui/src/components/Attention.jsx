import { alignTokens, normaliseWeights } from "../format.js";
import Section from "./Section.jsx";

export default function Attention({ text, attentionAll, attentionTop }) {
  const tokens = attentionAll?.length ? attentionAll : attentionTop;
  const words = normaliseWeights(alignTokens(text, tokens));

  return (
    <Section title="Where the model looked">
      <p className="text-[17px] leading-[2.2] sm:text-[18px]">
        {words.map((w, i) =>
          w.alpha ? (
            <span
              key={i}
              className="px-[3px] py-[3px]"
              style={{
                background: `color-mix(in srgb, var(--color-accent) ${
                  w.alpha * 100
                }%, transparent)`,
              }}
            >
              {w.text}
            </span>
          ) : (
            <span key={i}>{w.text}</span>
          )
        )}
      </p>
    </Section>
  );
}
