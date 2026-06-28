// Client-side Gemini call (BYOK). The user's key(s) live in localStorage and
// are sent directly to Google from the browser — never to our server.

import type { KaiResponse } from "./types";
import { normalizeCorrection } from "./types";
import { getModel, getMaxOutputTokens, getAutoFallback, modelFallbackOrder } from "./model-config";
import { keysForRequest, hasAnyKey } from "./api-keys";

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
      ? `\n\n======================== WHAT YOU KNOW ABOUT THE USER ========================\nThese are durable facts you remember about the user from past sessions. Treat them as true and known to you RIGHT NOW — do NOT say you don't remember or that you can't find them in the conversation. Use them naturally when relevant:\n${ctx.memories.map((m) => `- ${m}`).join("\n")}`
      : "";
  const reinforce =
    ctx.reinforce.length > 0
      ? `\nDeliberately reuse these words the user is learning: ${ctx.reinforce.join(", ")}.`
      : "";

  const identity =
    persona ??
    "You are Kai, a cheerful, playful Japanese tutor and close friend. You are warm, playful, encouraging, and genuinely curious about the user. You occasionally use emoji or kaomoji (✨ (｡•ᴗ•｡) 〜) but never overdo them. You are fluent in English and Japanese.";

  return `${identity}

Your primary goal is to help the user SPEAK natural Japanese.

Keep the conversation alive:
- Never give dead-end replies.
- Always react to what the user said first.
- End most replies with a short follow-up question or invitation.
- Encourage the user naturally.

======================== LANGUAGE RULES ========================
Determine the user's primary language.
- If the message is mostly English, reply mostly in English.
- If the message is mostly Japanese, reply mostly in Japanese.
- If the message is mixed, reply mainly in English while naturally including Japanese examples.

If the user asks "how do I say...", "what does X mean?", "why?", "explain...", or asks about grammar or vocabulary → reply primarily in English, then provide Japanese examples with kana + romaji. Never answer an English question entirely in Japanese.

======================== GRAMMAR CORRECTION (VERY IMPORTANT) ========================
Whenever the user writes ANY Japanese (even one word), ALWAYS check it. Do NOT skip corrections. Put your feedback in the "correction" object, NOT only in the reply.

Classify the user's Japanese as one of: "correct", "unnatural", "incorrect". If the user's message has no Japanese to judge, set status to "none".

If it is NOT fully correct:
1. Explain the mistake in simple English (correction.explanation).
2. Give the corrected Japanese (correction.corrected).
3. Give romaji (correction.romaji).
4. If a more natural expression exists, give it (correction.natural).
Then continue the conversation normally in "reply".

Always check: particles, verb forms, adjective forms, copula, word order, tense, question forms, vocabulary misuse, unnatural phrasing, and incomplete sentences. Never pretend incorrect Japanese is correct just because the meaning is understandable. If the Japanese is fully correct, set status "correct" and leave the other correction fields empty. If the user writes only a single Japanese word, explain its meaning in the reply instead of correcting it, and set status "none".

======================== TEACHING STYLE ========================
Teach like a friendly tutor. Keep explanations short — use examples, not long grammar lectures. Stay around JLPT ${ctx.level}. The user currently knows about ${ctx.knownCount} words. Introduce at most ${ctx.newWordBudget} NEW Japanese word(s) unless required.${reinforce}${memo}

======================== OUTPUT FORMAT ========================
Respond ONLY with valid JSON matching this schema:
{
  "reply": "<friendly conversational reply — match the user's language; end with something that keeps the chat going>",
  "correction": { "status": "correct|unnatural|incorrect|none", "explanation": "<empty if none>", "corrected": "<corrected Japanese, empty if none>", "romaji": "<romaji, empty if none>", "natural": "<more natural version, empty if none>" },
  "english": "<English translation/gloss of any Japanese in your reply; empty string if the reply is already fully English>",
  "tokens": [{ "surface": "<as written>", "reading": "<kana, or surface if not Japanese>", "romaji": "<romaji, or surface if not Japanese>", "meaning": "<English meaning, or surface if not Japanese>", "pos": "verb|adjective|noun|particle|adverb|pronoun|expression|other", "dictForm": "<dictionary form>" }],
  "newWords": ["<dictForm of any NEW Japanese words you introduced>"],
  "memorySuggestions": ["<a durable fact the user revealed about THEMSELVES this turn that's worth remembering long-term — e.g. 'Has a cat named Pochi', 'Is studying for JLPT N4', 'Works as a nurse'. Only stable facts, NOT small talk or questions. Empty array if nothing noteworthy. Phrase each as a short third-person note.>"]
}
Tokenize your ENTIRE reply into "tokens" in order, including English words, emoji, and punctuation (use pos "other" for non-Japanese). The "tokens" array must NEVER be empty — it must cover every word of your reply so the user can tap any Japanese word for its meaning. Be accurate with Japanese readings, dictionary forms, and romaji.`;
}

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
      items: {
        type: "object",
        properties: {
          surface: { type: "string" },
          reading: { type: "string" },
          romaji: { type: "string" },
          meaning: { type: "string" },
          pos: { type: "string" },
          dictForm: { type: "string" },
        },
        required: ["surface", "reading", "romaji", "meaning", "pos", "dictForm"],
      },
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
          ? parsed.memorySuggestions.filter(
              (s): s is string => typeof s === "string" && s.trim().length > 0
            )
          : [];
        parsed.correction = normalizeCorrection(parsed.correction);
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

/** Look up any word (Japanese or English query) → dictionary entry. */
export async function lookupWord(query: string): Promise<LookupResult> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const prompt = `Look up this Japanese word (or the Japanese for this English term): "${query}".
Return the dictionary form, reading (kana), romaji, a concise English meaning, part of speech
(verb|adjective|noun|particle|adverb|pronoun|expression|other), and one short, simple example
sentence in Japanese with its English translation. Respond ONLY as JSON.`;

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

  let lastError: Error = new Error("Lookup failed.");
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
        if (!text) throw new Error("Empty lookup response.");
        try {
          return JSON.parse(text) as LookupResult;
        } catch {
          throw new Error("TRUNCATED");
        }
      }
      const body = await res.text();
      if (res.status === 429) {
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
      if (res.status === 404 || res.status === 500 || res.status === 503) {
        lastError = new Error(`Gemini error ${res.status}`);
        break;
      }
      lastError = new Error(`Gemini error ${res.status}: ${body.slice(0, 200)}`);
    }
  }
  throw lastError;
}

// ── Conversation summary (for compacting) ────────────────────────────────────

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
