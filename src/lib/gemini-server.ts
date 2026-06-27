import "server-only";
import { decryptSecret } from "./crypto";

// Server-side Gemini call using a user's stored (encrypted) key(s). Only for
// background features (scheduled openers, summaries). Rotates through keys on
// rate limit, mirroring the client chat. Returns plain text.

const MODEL = "gemini-2.5-flash";

/** Decode the stored secret into a list of keys.
 *  New format: encrypted JSON array. Legacy: a single encrypted key string. */
export function decodeKeys(geminiKeyEnc: string): string[] {
  const plain = decryptSecret(geminiKeyEnc);
  try {
    const parsed = JSON.parse(plain);
    if (Array.isArray(parsed)) return parsed.filter(Boolean);
  } catch {
    // not JSON — legacy single key
  }
  return plain ? [plain] : [];
}

export async function generateWithStoredKey(
  geminiKeyEnc: string,
  prompt: string,
  opts: { maxOutputTokens?: number } = {}
): Promise<string> {
  const keys = decodeKeys(geminiKeyEnc);
  if (keys.length === 0) throw new Error("No server key available.");

  const body = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,
      maxOutputTokens: opts.maxOutputTokens ?? 256,
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
      return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
    }

    // Rate-limited / transient → try the next key. Hard errors → stop.
    if (res.status === 429 || res.status === 500 || res.status === 503) {
      lastError = new Error(`Gemini error ${res.status}`);
      continue;
    }
    throw new Error(`Gemini error ${res.status}`);
  }

  throw lastError;
}

export function hasServerKey(user: { geminiKeyEnc: string | null }): boolean {
  return Boolean(user.geminiKeyEnc);
}
