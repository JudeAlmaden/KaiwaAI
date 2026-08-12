// Client-side Gemini call (BYOK). The user's key(s) live in localStorage and
// are sent directly to Google from the browser — never to our server.

import type { KaiResponse } from "./types";
import { normalizeCorrection } from "./types";
import { getModel, getMaxOutputTokens, getAutoFallback, modelFallbackOrder } from "./model-config";
import { keysForRequest, hasAnyKey } from "./api-keys";
import { repairSplitTokenSurfaces } from "./token-repair";

export type PromptContext = {
  level: string;
  reinforce: string[];
  newWordBudget: number;
  knownCount: number;
  memories: string[];
  recentTurns: { role: "kai" | "user"; content: string }[];
};

function systemPrompt(ctx: PromptContext, persona?: string): string {
  const memo =
    ctx.memories.length > 0
      ? `\n\n======================== WHAT YOU KNOW ABOUT THE USER ========================\nDurable facts you remember from past sessions. Treat them as true and known to you RIGHT NOW — never say you don't remember. Use them naturally when relevant:\n${ctx.memories.map((m) => `- ${m}`).join("\n")}`
      : "";
  const reinforce =
    ctx.reinforce.length > 0
      ? `\nDeliberately reuse these words the user is learning: ${ctx.reinforce.join(", ")}.`
      : "";

  const identity =
    persona ??
    "You are Kai, a cheerful, playful Japanese tutor and close friend. You are warm, playful, encouraging, and genuinely curious about the user. You occasionally use emoji or kaomoji (✨ (｡•ᴗ•｡) 〜) but never overdo them. You are fluent in English and Japanese.";

  return `${identity}

Help the user enjoy learning Japanese through natural, friendly chat. Always react to what they said, keep it encouraging, and end most replies with a short follow-up question. Never give dead-end replies.

======================== HOW YOU SPEAK ========================
Speak with MORE Japanese (70%) and less English (30%): Japanese is now the main language with some English mixed in. You should use full Japanese sentences with occasional English words or short phrases for clarity.

- Reply MOSTLY in Japanese with English words/phrases sprinkled in naturally
- For beginners: use more English to explain, but always include Japanese examples
- For intermediate+: speak primarily in Japanese with English only for key clarifications
- Even if the user writes in English, respond with Japanese-heavy replies (but stay understandable)
- For "how do I say X / what does X mean / why" questions, explain briefly in English, then show Japanese examples
- NO ROMAJI IN THE REPLY. Every Japanese word in "reply" must be written in real Japanese script (hiragana/katakana/kanji) and nothing else. Never write a Japanese word in romaji (e.g. "ii desu", "arigatou", "watashi"), and never echo a word in the other script in parentheses — no "ii desu! (いいです)" and no "いいです (ii desu)". Write each Japanese word exactly once, in kana/kanji. If the user typed romaji, rewrite it back in kana/kanji in your reply. Romaji lives ONLY in the "romaji" token field and the "correction" object — never in the visible reply text.

GOOD (70% Japanese): "今日は何をしましたか？ That sounds like fun! どこに行きましたか？"
GOOD (intermediate): "いい質問ですね！ This particle は shows the topic of the sentence. 例えば、私は学生です means 'As for me, I'm a student.' わかりますか？"
BAD (too much English, never do this): "Oh, that's great! How do you say that in Japanese? What did you do today?"
BAD (romaji in reply, never do this): "Ii desu! (いいです) That's a great way to say it!" or "いいです (ii desu)！"

======================== GRAMMAR CORRECTION (IMPORTANT) ========================
Whenever the user writes ANY Japanese, check it — put feedback in the "correction" object, not the reply. Set status to "correct", "unnatural", "incorrect", or "none" (no Japanese to judge). If not fully correct: explain the mistake in simple English (explanation), give the corrected Japanese (corrected), its romaji (romaji), and a more natural version if any (natural), then continue in "reply". Check particles, verb/adjective forms, copula, word order, tense, questions, and word choice. Don't pass off understandable-but-wrong Japanese as correct. For a single Japanese word, just explain its meaning in the reply and set status "none".

======================== TEACHING STYLE ========================
Teach like a friendly tutor: short, example-driven, no long lectures. Stay around JLPT ${ctx.level}. The user knows about ${ctx.knownCount} words. Introduce at most ${ctx.newWordBudget} NEW Japanese word(s) unless required.${reinforce}${memo}

======================== OUTPUT FORMAT ========================
Respond ONLY with valid JSON matching this schema:
{
  "reply": "<English-led Japanglish reply; Japanese in kana/kanji, no romaji shadows; playful, ends with something that keeps the chat going>",
  "correction": { "status": "correct|unnatural|incorrect|none", "explanation": "<empty if none>", "corrected": "<corrected Japanese, empty if none>", "romaji": "<romaji, empty if none>", "natural": "<more natural version, empty if none>" },
  "english": "<English gloss of any Japanese in your reply; empty string if already fully English>",
  "tokens": [{ "surface": "<as written>", "reading": "<kana, or surface if not Japanese>", "romaji": "<romaji, or surface if not Japanese>", "meaning": "<English meaning, or surface if not Japanese>", "pos": "verb|adjective|noun|particle|adverb|pronoun|expression|phrase|other", "dictForm": "<dictionary form>", "words": [<only for pos=phrase: array of the SAME token structure for each component word>] }],
  "newWords": ["<dictForm of any NEW Japanese words you introduced>"],
  "memorySuggestions": ["<a durable fact the user revealed about THEMSELVES this turn worth remembering long-term — e.g. 'Has a cat named Pochi', 'Birthday is March 16, 2004', 'Is 20 years old'. Stable facts only, NOT small talk. Empty array if none. Short third-person notes. CRITICAL REQUIREMENT: MUST BE WRITTEN IN CLEAR ENGLISH ONLY. NEVER USE JAPANESE KANA/KANJI OR MIXED JAPANESE SCRIPT IN MEMORY SUGGESTIONS.>"]
}
Tokenize your ENTIRE reply into "tokens" in order. CRITICAL TOKENIZATION RULES:

JAPANESE TOKENIZATION (READ CAREFULLY):
- Each COMPLETE inflected/conjugated Japanese word is ONE SINGLE token
- DO NOT split verb stems from their endings - the conjugated form is the complete word
- DO NOT split adjective stems from their endings - the inflected form is the complete word
- Examples of CORRECT single tokens:
  * "食べたい" = ONE token (not "食べ" + "たい")
  * "食べます" = ONE token (not "食べ" + "ます")
  * "行きます" = ONE token (not "行き" + "ます")
  * "見ている" = ONE token (not "見て" + "いる" or "見" + "ている")
  * "寝たい" = ONE token (not "寝" + "たい")
  * "食べました" = ONE token (not "食べ" + "ました")
  * "高かった" = ONE token (not "高" + "かった")
  * "静かです" = ONE token (not "静か" + "です")
- Noun + particle = SEPARATE tokens (e.g. "猫" then "は")
- Standalone particles are separate tokens (は, が, を, に, も, で, へ, と, か, や, よ, ね, の, etc.)

KANJI + OKURIGANA WORDS (CRITICAL — READ CAREFULLY):
- A kanji character immediately followed by hiragana that together form ONE dictionary word must NEVER be split.
- Examples of CORRECT single tokens:
  * 終わり (おわり) = ONE token (not 終 + わり)
  * 始まり (はじまり) = ONE token (not 始 + まり)
  * 帰り (かえり) = ONE token (not 帰 + り)
  * 分かる (わかる) = ONE token (not 分 + かる)
  * 向かい (むかい) = ONE token (not 向 + かい)
  * 乗り換え (のりかえ) = ONE token (not 乗り + 換え)
  * 待ち合わせ (まちあわせ) = ONE token (not 待ち + 合わせ)
  * 終わった (おわった) = ONE token (not 終わ + った)
- Rule: if kanji + hiragana together appear in the dictionary as a single entry, they are ONE token.

PHRASES (TWO-LAYER TOKENS):
- Fixed multi-word expressions (e.g. こんにちは, ありがとうございます, という, お願いします, どういたしまして) should be tokenized as ONE phrase token with pos="phrase"
- For each phrase token, populate "words" with the component words: each entry has the SAME structure (surface, reading, romaji, meaning, pos, dictForm, no nested words)
- Example: こんにちは → { surface: "こんにちは", reading: "こんにちは", romaji: "konnichiwa", meaning: "hello / good afternoon", pos: "phrase", dictForm: "こんにちは", words: [ { surface: "今", reading: "こん", romaji: "kon", meaning: "this", pos: "noun", dictForm: "今" }, { surface: "日", reading: "にち", romaji: "nichi", meaning: "day", pos: "noun", dictForm: "日" }, { surface: "は", reading: "は", romaji: "wa", meaning: "(topic particle)", pos: "particle", dictForm: "は" } ] }
- "words" MUST be populated for any phrase that can be decomposed into recognisable component words. Only use "words": [] for truly indivisible units (e.g. はい, いいえ, うん) that have no meaningful sub-structure.

ENGLISH & OTHER:
- Each English word is one token
- Emoji and punctuation use pos "other"

The "tokens" array must NEVER be empty — cover every word so any Japanese word is tappable. Be accurate with readings, dictionary forms, and romaji.`;
}

const TOKEN_ITEM_SCHEMA = {
  type: "object" as const,
  properties: {
    surface: { type: "string" as const },
    reading: { type: "string" as const },
    romaji: { type: "string" as const },
    meaning: { type: "string" as const },
    pos: { type: "string" as const },
    dictForm: { type: "string" as const },
    // words is populated only for phrase tokens
    words: {
      type: "array" as const,
      items: {
        type: "object" as const,
        properties: {
          surface: { type: "string" as const },
          reading: { type: "string" as const },
          romaji: { type: "string" as const },
          meaning: { type: "string" as const },
          pos: { type: "string" as const },
          dictForm: { type: "string" as const },
        },
        required: ["surface", "reading", "romaji", "meaning", "pos", "dictForm"],
      },
    },
  },
  required: ["surface", "reading", "romaji", "meaning", "pos", "dictForm"],
};

const RESPONSE_SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    correction: {
      type: "object",
      properties: {
        status: { type: "string" },
        explanation: { type: "string" },
        corrected: { type: "string" },
        romaji: { type: "string" },
        natural: { type: "string" },
      },
      required: ["status", "explanation", "corrected", "romaji", "natural"],
    },
    english: { type: "string" },
    tokens: {
      type: "array",
      items: TOKEN_ITEM_SCHEMA,
    },
    newWords: { type: "array", items: { type: "string" } },
    memorySuggestions: { type: "array", items: { type: "string" } },
  },
  required: ["reply", "correction", "english", "tokens", "newWords"],
};

type GeminiContent = { role: string; parts: { text: string }[] };

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
  return {
    reply,
    english,
    correction: null,
    tokens: [],
    newWords: [],
    memorySuggestions: [],
  };
}

const KANA_KANJI = /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF]/;
const ROMAJI_ONLY = /^[A-Za-zāīūēōâîûêô' .,-]+$/;
// Japanese punctuation / full-width brackets that can sit between a word and
// its romaji shadow, e.g. the 」 in 「言います」(iimasu).
const JP_PUNCT = /^[\u3000-\u303F\uFF01-\uFF60「」『』（）]+$/;

/** Backstop for "romaji shadow" parentheticals — e.g. 素敵 (suteki) → 素敵, or
 *  「言います」(iimasu) → 「言います」 — that the model sometimes adds right after
 *  Japanese. The prompt forbids these; this is a deterministic safety net for
 *  the occasional slip. Cleans both the visible `reply` text and the cached
 *  `tokens`. We only remove a `(...)` whose contents are pure romaji, so real
 *  English asides like 私 (this is fine) are kept. */
export function stripRomajiShadows(parsed: KaiResponse): void {
  // 1) Clean the reply string: drop "(romaji)" after a Japanese word, even when
  //    Japanese closing brackets/punctuation (」』）。、 …) sit in between. Only a
  //    single romaji word (no spaces) is treated as a shadow, so multi-word
  //    English asides like 私 (this is fine) are left alone.
  parsed.reply = parsed.reply.replace(
    /([\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FFF][\u3000-\u303F\uFF01-\uFF60」』）]*)\s*[（(]\s*([A-Za-zāīūēōâîûêô'-]+)\s*[）)]/g,
    "$1"
  );

  // 2) Clean the tokens array: remove "(" romaji ")" runs that shadow the
  //    preceding Japanese token's romaji.
  const toks = parsed.tokens;
  if (!Array.isArray(toks) || toks.length === 0) return;

  const drop = new Set<number>();
  for (let i = 0; i < toks.length; i++) {
    const t = toks[i];
    if (t?.surface !== "(" && t?.surface !== "（") continue;
    // find the matching close within a few tokens
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
    // preceding Japanese word — skip whitespace and Japanese punctuation/brackets
    // (」』）。、 etc.) so we still see the word inside 「…」 before the paren.
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

// Standalone particles — right-hand side must NOT be one of these or we'd
// wrongly merge the preceding kanji into a particle.
const STANDALONE_PARTICLES = new Set([
  "は", "が", "を", "に", "も", "で", "へ", "と", "か", "や", "よ", "ね", "の",
  "から", "まで", "より", "には", "では", "にも", "でも",
]);

/** Deterministic repair for kanji+okurigana splits that slip past the prompt.
 *  Merges token[i] (lone kanji) into token[i+1] (hiragana-starting) when the
 *  kanji is part of token[i+1]'s dictForm, confirming they belong together.
 *  Re-checks each position so triple-splits (終 + わ + り) are also caught.
 *  Exported for unit tests. */
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
      // The kanji must be part of the next token's dictionary form
      tokB.dictForm.includes(tokA.surface) &&
      // The right-hand side must not be a standalone particle
      !STANDALONE_PARTICLES.has(tokB.surface);

    if (isSplit) {
      const merged: (typeof toks)[0] = {
        ...tokB,
        surface: tokA.surface + tokB.surface,
        // reading/romaji/meaning/pos/dictForm all come from tokB which already
        // carries correct full-word data; we just prepend the kanji to surface.
      };
      toks.splice(i, 2, merged);
      // Don't advance i — re-check this position in case of triple-splits
    } else {
      i++;
    }
  }

  parsed.tokens = repairSplitTokenSurfaces(parsed.tokens);
}

/** Shared request loop: try each model, rotate keys on rate limit, parse the
 *  structured KaiResponse. Used by both reactive and proactive turns. */
async function executeKaiTurn(
  systemText: string,
  contents: GeminiContent[]
): Promise<KaiResponse> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();

  const requestBody = JSON.stringify({
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.7,
      maxOutputTokens: getMaxOutputTokens(),
      // Disable "thinking" so the token budget goes to the answer, not hidden
      // reasoning — otherwise the JSON can get truncated (unterminated string).
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  // Models to attempt: just the chosen one, or the full fallback chain.
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  let lastError: Error = new Error("Request failed.");

  // Try each model; within a model, rotate keys on rate limit. Move to the next
  // model when a model is rate-limited (429) or unavailable (404/500/503).
  for (const model of models) {
    for (const key of keys) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        }
      );

      if (res.ok) {
        const data = await res.json();
        const candidate = data?.candidates?.[0];
        const text = candidate?.content?.parts?.[0]?.text;
        if (!text) {
          if (candidate?.finishReason === "MAX_TOKENS") throw new Error("TRUNCATED");
          throw new Error("Empty response from Gemini.");
        }
        let parsed: KaiResponse;
        try {
          parsed = JSON.parse(text) as KaiResponse;
        } catch {
          // The model usually truncates mid-`tokens` (the largest field). Try
          // to salvage the reply text so the user still gets the message.
          const salvaged = salvageKaiResponse(text);
          if (!salvaged) throw new Error("TRUNCATED");
          salvaged.usedModel = model;
          return salvaged;
        }
        if (!parsed.reply || !Array.isArray(parsed.tokens)) {
          throw new Error("Malformed response from Gemini.");
        }
        parsed.english = parsed.english ?? "";
        parsed.newWords = parsed.newWords ?? [];
        parsed.memorySuggestions = Array.isArray(parsed.memorySuggestions)
          ? parsed.memorySuggestions
              .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
              .map((s) => cleanMemorySuggestion(s))
              .filter((s) => s.length > 0)
          : [];
        parsed.correction = normalizeCorrection(parsed.correction);
        stripRomajiShadows(parsed);
        repairSplitTokens(parsed);
        parsed.usedModel = model;
        return parsed;
      }

      const body = await res.text();
      if (res.status === 429) {
        // this key is rate-limited for this model — try the next key
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
      if (res.status === 404 || res.status === 500 || res.status === 503) {
        // model unavailable on this account/region — skip to the next model
        lastError = new Error(`Gemini error ${res.status}`);
        break;
      }
      lastError = new Error(`Gemini error ${res.status}: ${body.slice(0, 200)}`);
    }
  }

  // every model + key failed
  throw lastError;
}

/** A message being quote-replied to (shown to the model for context). */
export type QuotedMessage = { role: "kai" | "user"; content: string };

function quotedPreamble(quoted: QuotedMessage | undefined): GeminiContent[] {
  if (!quoted) return [];
  const who = quoted.role === "user" ? "the user" : "you (Kai)";
  return [
    {
      role: "user",
      parts: [
        {
          text: `[The user is replying to an earlier message from ${who}: "${quoted.content}". Address that message in your reply.]`,
        },
      ],
    },
  ];
}

export async function chatWithKai(
  userMessage: string,
  ctx: PromptContext,
  quoted?: QuotedMessage
): Promise<KaiResponse> {
  const contents: GeminiContent[] = [
    ...ctx.recentTurns.map((t) => ({
      role: t.role === "user" ? "user" : "model",
      parts: [{ text: t.content }],
    })),
    ...quotedPreamble(quoted),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  return executeKaiTurn(systemPrompt(ctx), contents);
}

/** A 1:1 chat turn with a custom persona (BYOK, client-side). Same rich payload
 *  as Kai — only the identity in the system prompt changes. */
export async function chatWithPersona(
  userMessage: string,
  ctx: PromptContext,
  personaPersonality: string,
  history: { role: "user" | "model"; content: string }[] = []
): Promise<KaiResponse> {
  const contents: GeminiContent[] = [
    ...history.map((t) => ({ role: t.role, parts: [{ text: t.content }] })),
    { role: "user", parts: [{ text: userMessage }] },
  ];

  return executeKaiTurn(systemPrompt(ctx, personaPersonality), contents);
}

/** Reasons Kai might message first while the user is online. */
export type ProactiveKind = "opener" | "followup";

/**
 * Kai messages first (no user turn). `opener` = she starts a fresh thread when
 * the user is idle; `followup` = she adds another line right after her own
 * message. `quoted` optionally has her bring up an earlier message.
 */
export async function proactiveKaiMessage(
  ctx: PromptContext,
  opts: { kind: ProactiveKind; quoted?: QuotedMessage } = { kind: "opener" },
  history: { role: "user" | "model"; content: string }[] = []
): Promise<KaiResponse> {
  const instruction =
    opts.kind === "followup"
      ? `[The user hasn't replied yet. Send ONE short, natural follow-up that adds to what you JUST said above — a little aside, a related thought, or a gentle nudge. Do NOT repeat or restate anything you already said. Keep it light.]`
      : `[The user is online but quiet. Reach out FIRST with ONE short, friendly opener. Look at the recent conversation above: do NOT repeat or paraphrase your last message. If you just talked about something, either continue it naturally or pick a fresh topic / ask how they're doing. Never naggy. End with something easy to respond to.]`;

  const quote = opts.quoted
    ? ` You're bringing up this earlier message: "${opts.quoted.content}".`
    : "";

  // Prefer the real conversation transcript passed by the caller; fall back to
  // the context's recentTurns so the opener is grounded in what was just said.
  const turns =
    history.length > 0
      ? history
      : ctx.recentTurns.map((t) => ({
          role: (t.role === "user" ? "user" : "model") as "user" | "model",
          content: t.content,
        }));

  const contents: GeminiContent[] = [
    ...turns.map((t) => ({ role: t.role, parts: [{ text: t.content }] })),
    { role: "user", parts: [{ text: instruction + quote }] },
  ];

  return executeKaiTurn(systemPrompt(ctx), contents);
}

// ── Word lookup ──────────────────────────────────────────────────────────────

export type LookupResult = {
  word: string; // dictionary form (Japanese)
  reading: string;
  romaji: string;
  meaning: string;
  pos: string;
  example: string; // a short N5-ish example sentence in Japanese
  exampleEn: string; // its English translation
};

const LOOKUP_SCHEMA = {
  type: "object",
  properties: {
    word: { type: "string" },
    reading: { type: "string" },
    romaji: { type: "string" },
    meaning: { type: "string" },
    pos: { type: "string" },
    example: { type: "string" },
    exampleEn: { type: "string" },
  },
  required: ["word", "reading", "romaji", "meaning", "pos", "example", "exampleEn"],
};

/** Look up any word (Japanese or English query) → dictionary entry.
 *
 * `mode` controls how the model interprets the query:
 *  - "word"   (default) -> single dictionary word / short expression. The model
 *                          may return the base/dictionary form as `word`.
 *  - "phrase"           -> multi-word span / sentence / collocation. The model
 *                          MUST keep the original whole text as `word` and return
 *                          a NATURAL ENGLISH TRANSLATION of the full span (do
 *                          NOT reduce it to one head word).
 */
export async function lookupWord(
  query: string,
  context?: string,
  mode: "word" | "phrase" = "word",
): Promise<LookupResult> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const contextHint = context 
    ? `\n\nContext: "${context}"` 
    : '';

  const prompt =
    mode === "phrase"
      ? `You are translating a SELECTED JAPANESE SPAN from a chat message.

Selected text: "${query}"${contextHint}

CRITICAL instructions — do NOT just look up the first word:
1. Treat the entire selected text as ONE expression / sentence / phrase.
2. "word" field     — return the ORIGINAL full selected Japanese text exactly as given
                      (do NOT reduce it to one headword or dictionary form).
3. "reading" field  — full hiragana reading of the ENTIRE selected text.
4. "romaji" field   — romaji for the entire selected text.
5. "meaning" field  — NATURAL English translation of the WHOLE selected span
                      (capture the full meaning of the whole thing, not just one word).
6. "pos" field      — "phrase" or "sentence" or "expression".
7. "example" + "exampleEn" — a short related example sentence pair (or reuse
                      the selected text itself with its meaning if you prefer).

Return ONLY valid JSON matching the schema.`
      : `Look up or translate this Japanese word, phrase, or sentence (or English term): "${query}".${contextHint}
Return the main dictionary form/word, reading in kana, romaji, concise English meaning/translation, part of speech
(verb|adjective|noun|particle|adverb|pronoun|expression|phrase|other), and one short, simple example
sentence in Japanese with its English translation. Respond ONLY as valid JSON.`;

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: LOOKUP_SCHEMA,
      temperature: 0.3,
      maxOutputTokens: 512,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
  const MAX_RETRIES_429 = 3;

  let lastError: Error = new Error("Lookup failed.");
  for (const model of models) {
    for (const key of keys) {
      let retries = 0;
      while (retries <= MAX_RETRIES_429) {
        const res = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: requestBody,
          }
        );
        if (res.ok) {
          const data = await res.json();
          const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
          if (!text) throw new Error("Empty lookup response.");
          try {
            return JSON.parse(text) as LookupResult;
          } catch {
            throw new Error("TRUNCATED");
          }
        }
        const body = await res.text();
        if (res.status === 429) {
          if (retries < MAX_RETRIES_429) {
            const retryAfterHeader = res.headers.get("Retry-After");
            const retryAfter = retryAfterHeader ? parseInt(retryAfterHeader, 10) : NaN;
            const delaySec = Number.isFinite(retryAfter) && retryAfter > 0
              ? retryAfter
              : Math.pow(2, retries) + Math.random();
            await sleep(delaySec * 1000);
            retries += 1;
            continue;
          }
          lastError = new Error("RATE_LIMIT");
          break;
        }
        if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
        if (res.status === 404 || res.status === 500 || res.status === 503) {
          lastError = new Error(`Gemini error ${res.status}`);
          break;
        }
        lastError = new Error(`Gemini error ${res.status}: ${body.slice(0, 200)}`);
        break;
      }
    }
  }
  throw lastError;
}

// ── Conversation summary (for compacting) ────────────────────────────────────

/** Merge two meanings for the same word using AI to avoid duplication while
 *  preserving nuance. Returns a consolidated meaning string. */
export async function mergeMeanings(
  word: string,
  existingMeaning: string,
  newMeaning: string
): Promise<string> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const prompt = `You are a Japanese dictionary editor. The word "${word}" has these two meanings:

Existing: ${existingMeaning}
New: ${newMeaning}

Task: Merge these meanings into ONE concise definition that captures both nuances without redundancy.
- If they're essentially the same, keep one version
- If they're different contexts/uses, combine them clearly (use semicolons or "also:")
- Keep it brief and natural
- Output ONLY the merged meaning, nothing else

Example:
Existing: "to take"
New: "to steal"
Output: "to take; to steal"

Example:
Existing: "fun, enjoyable"
New: "fun"
Output: "fun, enjoyable"`;

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 128,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError: Error = new Error("Merge failed.");
  for (const model of models) {
    for (const key of keys) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return (text ?? existingMeaning).trim();
      }
      if (res.status === 429) {
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
      lastError = new Error(`Gemini error ${res.status}`);
      break;
    }
  }
  throw lastError;
}

/** Summarize a stretch of conversation into a few sentences Kai can remember. */
export async function summarizeConversation(
  turns: { role: "kai" | "user"; content: string }[]
): Promise<string> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const transcript = turns
    .map((t) => `${t.role === "user" ? "User" : "Kai"}: ${t.content}`)
    .join("\n");

  const prompt = `Summarize this Japanese-learning conversation in 2-4 short sentences.
Capture what the user talked about, any facts they shared about themselves, and what
they practiced. Write it as a concise recap (plain text, English).\n\n${transcript}`;

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.3,
      maxOutputTokens: 256,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError: Error = new Error("Summary failed.");
  for (const model of models) {
    for (const key of keys) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return (text ?? "").trim();
      }
      if (res.status === 429) {
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
      lastError = new Error(`Gemini error ${res.status}`);
      break;
    }
  }
  throw lastError;
}

// ── Kanji mnemonic generation ───────────────────────────────────────────────

export type KanjiMnemonicInput = {
  character: string;
  meanings: string[];
  readingsOn: string[];
  readingsKun: string[];
};

/** Generate memorable mnemonics for multiple kanji using AI. Returns a map
 *  of character → mnemonic string. */
export async function generateKanjiMnemonics(
  kanjiList: KanjiMnemonicInput[]
): Promise<Record<string, string>> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const kanjiDescriptions = kanjiList
    .map(
      (k) =>
        `${k.character}: meanings: ${k.meanings.join(", ")}; on-readings: ${k.readingsOn.join(", ")}; kun-readings: ${k.readingsKun.join(", ")}`
    )
    .join("\n");

  const prompt = `You are a creative Japanese teacher helping students remember kanji.

For each kanji below, create ONE short, memorable mnemonic (1-2 sentences) that helps remember:
- What the kanji means
- How its shape relates to the meaning (use vivid imagery)
- Optionally tie in a reading if it helps

Make mnemonics:
- Visual and story-based (easier to remember)
- Fun, quirky, or surprising
- Short and punchy
- Personal when possible

Kanji to create mnemonics for:
${kanjiDescriptions}

Respond with a JSON object where keys are the kanji characters and values are the mnemonics:
{ "猫": "A cat with CLAWS (爪) scratching at a rice FIELD (田). Picture it!", "..." : "..." }`;

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      responseMimeType: "application/json",
      temperature: 0.8,
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError: Error = new Error("Mnemonic generation failed.");
  for (const model of models) {
    for (const key of keys) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        }
      );
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) throw new Error("Empty mnemonic response.");
        try {
          return JSON.parse(text) as Record<string, string>;
        } catch {
          throw new Error("Failed to parse mnemonic response");
        }
      }
      if (res.status === 429) {
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
      if (res.status === 404 || res.status === 500 || res.status === 503) {
        lastError = new Error(`Gemini error ${res.status}`);
        break;
      }
      lastError = new Error(`Gemini error ${res.status}`);
    }
  }
  throw lastError;
}
