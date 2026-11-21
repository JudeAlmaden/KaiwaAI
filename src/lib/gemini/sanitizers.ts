import type { KaiResponse } from "../types";
import { validateTokens } from "../tokenization";
import { repairSplitTokenSurfaces } from "../token-repair";
import type { GeminiContent } from "./types";

/** Extract a top-level JSON string field value, tolerating truncation/escapes.
 *  Returns null if the key/opening quote isn't present. Exported for tests. */
export function extractJsonString(text: string, key: string): string | null {
  const marker = `"${key}"`;
  const at = text.indexOf(marker);
  if (at === -1) return null;
  // Find the opening quote of the value after the colon.
  let i = text.indexOf(":", at + marker.length);
  if (i === -1) return null;
  i++;
  while (i < text.length && /\s/.test(text[i])) i++;
  if (text[i] !== '"') return null;
  i++; // past opening quote
  let out = "";
  while (i < text.length) {
    const ch = text[i];
    if (ch === "\\") {
      // Keep escape sequences intact for JSON.parse to resolve.
      const next = text[i + 1];
      if (next === undefined) break; // truncated mid-escape
      out += ch + next;
      i += 2;
      continue;
    }
    if (ch === '"') {
      try {
        return JSON.parse(`"${out}"`) as string;
      } catch {
        return null;
      }
    }
    out += ch;
    i++;
  }
  return null; // never hit a closing quote — value was truncated
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

/** Cleans and converts any Japanese date/age patterns in memory suggestions into clear English. */
export function cleanMemorySuggestion(raw: string): string {
  let text = raw.trim();

  // Convert YYYY年M月D日 -> Month D, YYYY
  text = text.replace(/(\d{4})年(\d{1,2})月(\d{1,2})日/g, (_, y, m, d) => {
    const monthIdx = parseInt(m, 10) - 1;
    const monthName = MONTH_NAMES[monthIdx] || `${m}/`;
    return `${monthName} ${d}, ${y}`;
  });

  // Convert M月D日 -> Month D
  text = text.replace(/(\d{1,2})月(\d{1,2})日/g, (_, m, d) => {
    const monthIdx = parseInt(m, 10) - 1;
    const monthName = MONTH_NAMES[monthIdx] || `${m}/`;
    return `${monthName} ${d}`;
  });

  // Convert X歳 / X才 -> X years old
  text = text.replace(/(\d+)(?:歳|才)/g, "$1 years old");

  // Strip trailing Japanese copula/particles if present
  text = text.replace(/(?:です|ですね|です！|です。)$/g, "").trim();

  return text;
}

/** Last-ditch recovery when the model's JSON is cut off (usually mid-`tokens`).
 *  Salvages `reply`/`english` so the user still sees the message; drops tokens
 *  (no tap-to-translate for that message) rather than failing the whole turn.
 *  Exported for tests. */
export function salvageKaiResponse(text: string): KaiResponse | null {
  const reply = extractJsonString(text, "reply");
  if (!reply) return null;
  const english = extractJsonString(text, "english") ?? "";
  const { tokens } = validateTokens(reply, []);
  return {
    reply,
    english,
    correction: null,
    tokens,
    newWords: [],
    memorySuggestions: [],
  };
}

const KANA_KANJI = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
const ROMAJI_ONLY = /^[A-Za-zāīūēōâîûêô' .,-]+$/;
const JP_PUNCT = /^[\u3000-\u303F\uFF01-\uFF60「」『』（）]+$/;

/** Backstop for "romaji shadow" parentheticals. */
export function stripRomajiShadows(parsed: KaiResponse): void {
  parsed.reply = parsed.reply.replace(
    /([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF][\u3000-\u303F\uFF01-\uFF60」』）]*)\s*[（(]\s*([A-Za-zāīūēōâîûêô'-]+)\s*[）)]/g,
    "$1"
  );

  const toks = parsed.tokens;
  if (!Array.isArray(toks) || toks.length === 0) return;

  const drop = new Set<number>();
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t?.surface !== "(" && t?.surface !== "（") continue;
    let close = -1;
    for (let j = i + 1; j < Math.min(toks.length, i + 6); j++) {
      if (toks[j]?.surface === ")" || toks[j]?.surface === "）") {
        close = j;
        break;
      }
    }
    if (close === -1) continue;
    const inner = toks
      .slice(i + 1, close)
      .map((x) => x.surface)
      .join("");
    let p = i - 1;
    while (p >= 0 && (toks[p]?.surface.trim() === "" || JP_PUNCT.test(toks[p]?.surface ?? "x"))) p--;
    const prev = toks[p];
    if (prev && KANA_KANJI.test(prev.surface) && ROMAJI_ONLY.test(inner)) {
      for (let k = i; k <= close; k++) drop.add(k);
    }
  }
  if (drop.size > 0) {
    parsed.tokens = toks.filter((_, idx) => !drop.has(idx));
  }
}

const STANDALONE_PARTICLES = new Set([
  "は", "が", "を", "に", "も", "で", "へ", "と", "か", "や", "よ", "ね", "の",
  "から", "まで", "より", "には", "では", "にも", "でも",
]);

/** Deterministic repair for kanji+okurigana splits that slip past the prompt. */
export function repairSplitTokens(parsed: KaiResponse): void {
  const toks = parsed.tokens;
  if (!Array.isArray(toks) || toks.length < 2) return;

  const LONE_KANJI = /^[\u4e00-\u9fff]{1,2}$/;
  const STARTS_HIRAGANA = /^[\u3040-\u309f]/;

  let i = 0;
  while (i < toks.length - 1) {
    const tokA = toks[i];
    const tokB = toks[i + 1];
    if (!tokA || !tokB) { i++; continue; }

    const isSplit =
      LONE_KANJI.test(tokA.surface) &&
      STARTS_HIRAGANA.test(tokB.surface) &&
      tokB.dictForm.includes(tokA.surface) &&
      !STANDALONE_PARTICLES.has(tokB.surface);

    if (isSplit) {
      const merged: (typeof toks)[0] = {
        ...tokB,
        surface: tokA.surface + tokB.surface,
      };
      toks.splice(i, 2, merged);
    } else {
      i++;
    }
  }

  parsed.tokens = repairSplitTokenSurfaces(parsed.tokens);
}

export function normalizeGeminiContents(
  rawContents: GeminiContent[]
): GeminiContent[] {
  const normalized: GeminiContent[] = [];
  for (const item of rawContents) {
    if (!item.parts || item.parts.length === 0) continue;
    const text = item.parts
      .map((p) => p.text)
      .filter(Boolean)
      .join("\n")
      .trim();
    if (!text) continue;

    const prev = normalized[normalized.length - 1];
    if (prev && prev.role === item.role) {
      prev.parts.push({ text });
    } else {
      normalized.push({ role: item.role, parts: [{ text }] });
    }
  }

  // Gemini requires the first turn to have role 'user'
  if (normalized.length > 0 && normalized[0].role !== "user") {
    normalized.unshift({ role: "user", parts: [{ text: "[Conversation starts]" }] });
  }

  return normalized;
}
