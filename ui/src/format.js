// Display helpers. Nothing here changes model output — it only cleans up
// artifacts of the training corpus for the screen.

/**
 * LIAR2 stripped the rating words out of its justification text to stop the
 * label leaking into the input. That leaves two visible scars: orphaned
 * "We rate it ." fragments and doubled spaces where a word was removed.
 * The API also truncates to 300 characters, so text can stop mid-sentence.
 */
export function cleanJustification(raw) {
  let t = String(raw ?? "");

  // Rating fragments turn up mid-text as well as at the end, so remove the
  // complete form globally, then any truncated tail left by the 300-char cut.
  t = t.replace(/\s*We rate\b[^.]*\.\s*/gi, " ");
  t = t.replace(/\s*We rate\b.*$/i, "");

  // Close the gaps left by the removed words.
  t = t.replace(/\s+([.,;:!?])/g, "$1");
  t = t.replace(/\s{2,}/g, " ").trim();
  t = t.replace(/[\s,;:]+$/, "");

  if (!t) return "";
  // Mark text the API cut at 300 characters rather than implying it ended.
  if (!/[.!?"'\u201d\u2019]$/.test(t)) t += "\u2026";
  return t;
}

const wordKey = (w) => w.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "");

export const pct = (v) => `${(v * 100).toFixed(1)}%`;

/**
 * Align the token weights back onto whole words.
 *
 * attention_all is in sentence order but may contain sub-word pieces
 * ("immunity" -> "immun", "ity"), so tokens are consumed greedily until they
 * spell out the next word. A word takes the max weight of its pieces.
 */
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

/** Min-max normalise the aligned weights across the sentence. */
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

/**
 * Merge SHAP tokens back into whole words, summing their values.
 *
 * The API strips the sentencepiece word-start marker and sorts by magnitude,
 * so "microchip" + "s" arrive as separate, unordered entries, and bare
 * punctuation ("-") arrives as an entry of its own. Everything is
 * reassembled against the claim text so only whole words are displayed:
 * each word consumes the tokens that spell it, longest prefix first, and
 * anything left over is folded into the word it belongs to.
 */
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

    // Commit even a partial match: /explain returns only the top 8 tokens, so
    // a word can arrive with pieces missing. Showing the whole word with the
    // pieces we have beats printing a fragment.
    if (claimed.length) {
      merged.push([part, claimed.reduce((sum, e) => sum + e.value, 0)]);
    }
  }

  // Fold the remainder in: a fragment joins the word that contains it, and a
  // punctuation-only token joins the word before it.
  for (const e of entries) {
    if (used.has(e.id)) continue;
    // A fragment joins the word that contains it; a punctuation-only token
    // joins the word it punctuates ("-" belongs to "COVID-19"), falling
    // back to the last word when nothing matches.
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
