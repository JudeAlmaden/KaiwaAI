import { hasAnyKey, keysForRequest } from "../api-keys";
import { getAutoFallback, getModel, modelFallbackOrder } from "../model-config";

/** Summarize a stretch of conversation into a few sentences Kai can remember. */
export async function summarizeConversation(
  turns: { role: "kai" | "user" | "model"; content: string }[],
  existingSummary?: string | null
): Promise<string> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const transcript = turns
    .map((t) => `${t.role === "user" ? "User" : "Kai"}: ${t.content}`)
    .join("\n");

  const prevHint = existingSummary
    ? `Existing summary of earlier conversation:\n"${existingSummary}"\n\nNew conversation turns to integrate into the updated summary:\n`
    : "";

  const prompt = `Summarize this Japanese-learning conversation in 2-4 short sentences.
${existingSummary ? "Integrate the new turns into an updated, concise summary of the entire ongoing conversation." : "Capture what the user talked about, any facts they shared about themselves, and what they practiced."}
Write it as a concise recap (plain text, English).\n\n${prevHint}${transcript}`;

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
