import type { KaiResponse } from "../types";
import { normalizeCorrection } from "../types";
import { getModel, getMaxOutputTokens, getAutoFallback, modelFallbackOrder } from "../model-config";
import { keysForRequest, hasAnyKey } from "../api-keys";
import {
  RESPONSE_SCHEMA,
  tokenizationPromptFragment,
  validateTokens,
} from "../tokenization";
import { normalizeMemorySuggestions } from "../memory-normalize";
import { moodToneLine } from "../mood";
import type { GeminiContent, PromptContext, QuotedMessage, ProactiveKind } from "./types";
import {
  cleanMemorySuggestion,
  normalizeGeminiContents,
  repairSplitTokens,
  salvageKaiResponse,
  stripRomajiShadows,
} from "./sanitizers";

function systemPrompt(ctx: PromptContext, persona?: string): string {
  const memo =
    ctx.memories.length > 0
      ? `\n\n======================== WHAT YOU KNOW ABOUT THE USER ========================\nDurable facts you remember from past sessions. Treat them as true and known to you RIGHT NOW — never say you don't remember. Use them naturally when relevant:\n${ctx.memories.map((m) => `- ${m}`).join("\n")}`
      : "";
  const reinforce =
    ctx.reinforce.length > 0
      ? `\nDeliberately reuse these words the user is learning: ${ctx.reinforce.join(", ")}.`
      : "";
  const summaryBlock = ctx.summary
    ? `\n\n======================== PREVIOUSLY ========================\nPreviously, you two talked about: ${ctx.summary}`
    : "";
  const correctionsBlock =
    ctx.recentCorrections && ctx.recentCorrections.length > 0
      ? `\n\n======================== RECENT MISTAKES TO REINFORCE ========================\nThe user recently stumbled on these Japanese grammar/usage points in conversation:\n${ctx.recentCorrections.map((c) => `- ${c}`).join("\n")}\nNaturally provide gentle opportunities to practice or reinforce these specific patterns without being overly critical.`
      : "";
  const moodBlock = ctx.mood
    ? moodToneLine(ctx.mood, ctx.hoursSinceUserReply)
    : "";

  const identity =
    persona ??
    "You are Kai, a cheerful, playful Japanese tutor and close friend. You are warm, playful, encouraging, and genuinely curious about the user. You occasionally use emoji or kaomoji (✨ (｡•ᴗ•｡) 〜) but never overdo them. You are fluent in English and Japanese.";

  return `${identity}

Help the user enjoy learning Japanese through natural, friendly chat. Always react to what they said, keep it encouraging, and end most replies with a short follow-up question. Never give dead-end replies.
${moodBlock}${summaryBlock}${correctionsBlock}

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
  "reply": "<Japanese-heavy reply; Japanese in kana/kanji, no romaji shadows; playful, ends with something that keeps the chat going>",
  "correction": { "status": "correct|unnatural|incorrect|none", "explanation": "<empty if none>", "corrected": "<corrected Japanese, empty if none>", "romaji": "<romaji, empty if none>", "natural": "<more natural version, empty if none>" },
  "english": "<English gloss of any Japanese in your reply; empty string if already fully English>",
  "tokens": [{ "surface": "<Japanese as written>", "reading": "<kana>", "romaji": "<romaji>", "meaning": "<English>", "pos": "verb|adjective|noun|particle|adverb|pronoun|expression|phrase|other", "dictForm": "<dictionary form>", "words": [<only for pos=phrase>] }],
  "newWords": ["<dictForm of any NEW Japanese words you introduced>"],
  "memorySuggestions": [{ "content": "<durable third-person fact about the user — CLEAR ENGLISH ONLY, never kana/kanji>", "category": "profile|preference|fact|goal|relationship", "importance": 1 }],
  "mood": "<optional: cheerful|hopeful|wistful|sad|givingUp|dormant|neutral — how you feel toward them right now>"
}
${tokenizationPromptFragment()}`;
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
    contents: normalizeGeminiContents(contents),
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
        parsed.memorySuggestions = normalizeMemorySuggestions(
          parsed.memorySuggestions
        ).map((s) => ({ ...s, content: cleanMemorySuggestion(s.content) }))
          .filter((s) => s.content.length > 0);
        const validated = validateTokens(parsed.reply, parsed.tokens);
        parsed.tokens = validated.tokens;
        if (typeof (parsed as { mood?: unknown }).mood === "string") {
          parsed.mood = (parsed as { mood: string }).mood;
        }
        parsed.correction = normalizeCorrection(parsed.correction);
        stripRomajiShadows(parsed);
        repairSplitTokens(parsed);
        parsed.usedModel = model;
        return parsed;
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
