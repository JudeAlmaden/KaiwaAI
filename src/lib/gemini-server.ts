import "server-only";
import { decryptSecret } from "./crypto";

// Server-side Gemini call using a user's stored (encrypted) key. Only for
// background features (scheduled openers, summaries). Returns plain text.

const MODEL = "gemini-2.5-flash";

export async function generateWithStoredKey(
  geminiKeyEnc: string,
  prompt: string,
  opts: { maxOutputTokens?: number } = {}
): Promise<string> {
  const key = decryptSecret(geminiKeyEnc);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ role: "user", parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.8,
          maxOutputTokens: opts.maxOutputTokens ?? 256,
          thinkingConfig: { thinkingBudget: 0 },
        },
      }),
    }
  );

  if (!res.ok) throw new Error(`Gemini error ${res.status}`);
  const data = await res.json();
  return (data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "").trim();
}

export function hasServerKey(user: { geminiKeyEnc: string | null }): boolean {
  return Boolean(user.geminiKeyEnc);
}
