import "server-only";
import { decodeKeys } from "./gemini-server";
import { personaSystemPrompt } from "./personas";
import { normalizeCorrection } from "./types";
import type { CachedToken, Correction } from "./types";
import {
  GROUP_REPLY_SCHEMA,
  tokenizationPromptFragment,
  validateTokens,
} from "./tokenization";

// Group / conversation AI. A conversation has AT MOST ONE persona. The persona
// replies using the conversation OWNER's key, and — like Kai's 1:1 chat —
// returns the rich learning payload (tokens for tap-to-translate, an English
// gloss, and an optional grammar correction).

const MODEL = "gemini-2.5-flash";

export type ConvPersona = {
  memberId: string;
  personaId: string;
  name: string;
  personality: string;
  avatar: string;
};

export type ConvTurn = { senderName: string; senderKind: string; content: string };

export type PersonaReply = {
  reply: string;
  english: string;
  correction: Correction | null;
  tokens: CachedToken[];
  mood?: string;
};

function outputContract(): string {
  return `\n\nThis is a group conversation, but reply ONLY as yourself with ONE short message.

Respond ONLY with valid JSON matching this schema:
{
  "reply": "<your message — match the speakers' language; keep it short and natural>",
  "correction": { "status": "correct|unnatural|incorrect|none", "explanation": "<empty if none>", "corrected": "<corrected Japanese, empty if none>", "romaji": "<romaji, empty if none>", "natural": "<more natural version, empty if none>" },
  "english": "<English gloss of any Japanese in your reply; empty if already English>",
  "tokens": [{ "surface": "<Japanese as written>", "reading": "<kana>", "romaji": "<romaji>", "meaning": "<English>", "pos": "verb|adjective|noun|particle|adverb|pronoun|expression|phrase|other", "dictForm": "<dictionary form>", "words": [] }],
  "mood": "<optional: cheerful|hopeful|wistful|sad|givingUp|dormant|neutral>"
}
If the most recent human turn contains Japanese, check it and fill "correction" (status none/correct/unnatural/incorrect).
${tokenizationPromptFragment()}`;
}

/** Render the recent transcript as labeled lines for the model. */
export function renderTranscript(turns: ConvTurn[]): string {
  return turns.map((t) => `${t.senderName}: ${t.content}`).join("\n");
}

/** Whether a message summons the persona via @mention (case-insensitive).
 *  Matches "@Name" allowing the name with or without spaces removed. */
export function mentionsPersona(message: string, personaName: string): boolean {
  if (!personaName) return false;
  const name = personaName.toLowerCase();
  const compact = name.replace(/\s+/g, "");
  // Find @-tokens in the message and compare against the persona name.
  const tokens = message.toLowerCase().match(/@([\p{L}\p{N}_]+)/gu);
  if (!tokens) return false;
  return tokens.some((t) => {
    const handle = t.slice(1);
    return handle === name || handle === compact || name.startsWith(handle) && handle.length >= 2;
  });
}

/** Generate the single persona's rich reply, using an owner key. */
export async function generatePersonaReply(args: {
  keys: string[];
  persona: ConvPersona;
  otherSpeakers: string[];
  transcript: string;
  level?: string;
}): Promise<PersonaReply | null> {
  const { keys, persona, otherSpeakers, transcript, level } = args;
  if (keys.length === 0) throw new Error("No conversation key.");

  const system =
    personaSystemPrompt(persona.personality, { level, otherSpeakers }) +
    outputContract();

  const body = JSON.stringify({
    systemInstruction: { parts: [{ text: system }] },
    contents: [
      {
        role: "user",
        parts: [
          {
            text: `Recent conversation:\n\n${transcript}\n\nReply as ${persona.name}.`,
          },
        ],
      },
    ],
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: GROUP_REPLY_SCHEMA,
      temperature: 0.85,
      maxOutputTokens: 1024,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError: Error = new Error("Generation failed.");
  for (const key of keys) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      }
    );
    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) return null;
      try {
        const parsed = JSON.parse(text);
        if (!parsed.reply) return null;
        const reply = String(parsed.reply);
        const { tokens } = validateTokens(reply, parsed.tokens);
        return {
          reply,
          english: typeof parsed.english === "string" ? parsed.english : "",
          correction: normalizeCorrection(parsed.correction),
          tokens,
          mood: typeof parsed.mood === "string" ? parsed.mood : undefined,
        };
      } catch {
        return null;
      }
    }
    if (res.status === 429 || res.status === 500 || res.status === 503) {
      lastError = new Error(`Gemini error ${res.status}`);
      continue;
    }
    throw new Error(`Gemini error ${res.status}`);
  }
  throw lastError;
}

export { MODEL as GROUP_MODEL, decodeKeys };
