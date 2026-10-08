export function cleanJustification(raw) {
  let t = String(raw ?? "");

  t = t.replace(/\s*We rate\b[^.]*\.\s*/gi, " ");
  t = t.replace(/\s*We rate\b.*$/i, "");

  t = t.replace(/\s+([.,;:!?])/g, "$1");
  t = t.replace(/\s{2,}/g, " ").trim();
  t = t.replace(/[\s,;:]+$/, "");

  if (!t) return "";
  if (!/[.!?"'\u201d\u2019]$/.test(t)) t += "\u2026";
  return t;
}

const wordKey = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export const pct = (v) => `${(v * 100).toFixed(1)}%`;

export function alignTokens(text, tokens = []) {
  const parts = text.split(/(\s+)/);
  const flat = (tokens ?? []).filter((t) => Array.isArray(t) && t.length === 2);
  let i = 0;

  return parts.map((part) => {
    if (/^\s*$/.test(part)) return { text: part, weight: undefined };

    const target = wordKey(part);
    if (!target) return { text: part, weight: undefined };

    let acc = "";
    const weights = [];
    while (i < flat.length && acc.length < target.length) {
      acc += wordKey(flat[i][0]);
      weights.push(flat[i][1]);
      i += 1;
    }
    return {
      text: part,
      weight: weights.length ? Math.max(...weights) : undefined,
    };
  });
}

export function normaliseWeights(aligned) {
  const values = aligned.map((a) => a.weight).filter((v) => v !== undefined);
  if (!values.length) return aligned.map((a) => ({ ...a, alpha: 0 }));

  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min;

  return aligned.map((a) => {
    if (a.weight === undefined) return { ...a, alpha: 0 };
    const norm = span > 0 ? (a.weight - min) / span : 1;
    return { ...a, alpha: 0.06 + 0.34 * norm };
  });
}

export function mergeShapTokens(text, tokens = []) {
  const entries = (tokens ?? [])
    .filter((t) => Array.isArray(t) && t.length === 2)
    .map(([word, value], id) => ({ id, word, value, key: wordKey(word) }));

  const used = new Set();
  const merged = [];

  for (const part of String(text).split(/\s+/)) {
    const target = wordKey(part);
    if (!target) continue;

    let remaining = target;
    const claimed = [];
    while (remaining) {
      const match = entries
        .filter((e) => !used.has(e.id) && e.key && remaining.startsWith(e.key))
        .sort((a, b) => b.key.length - a.key.length)[0];
      if (!match) break;
      claimed.push(match);
      used.add(match.id);
      remaining = remaining.slice(match.key.length);
    }

    if (claimed.length) {
      merged.push([part, claimed.reduce((sum, e) => sum + e.value, 0)]);
    }
  }

  for (const e of entries) {
    if (used.has(e.id)) continue;
    let target = e.key
      ? merged.findIndex(([w]) => wordKey(w).includes(e.key))
      : merged.findIndex(([w]) => w.includes(e.word.trim()));
    if (target < 0) target = merged.length - 1;
    if (target >= 0) {
      merged[target][1] += e.value;
      used.add(e.id);
    }
  }

  const leftovers = entries.filter((e) => !used.has(e.id)).map((e) => [e.word, e.value]);
  return [...merged, ...leftovers].sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
}
