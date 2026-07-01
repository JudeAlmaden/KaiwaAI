import { prisma } from "./prisma";
import { hasAnyKey, keysForRequest } from "./api-keys";
import { getModel, getAutoFallback, modelFallbackOrder } from "./model-config";

export type KanjiData = {
  character: string;
  meanings: string[];
  radicals: string[];
};

/**
 * Generate a mnemonic story for a kanji using Gemini AI
 * @param kanji - Kanji data
 * @returns Generated mnemonic story
 */
export async function generateKanjiMnemonic(
  kanji: KanjiData
): Promise<string> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  
  const prompt = `Create a memorable story to help remember the Japanese kanji "${kanji.character}".

The kanji means: ${kanji.meanings.join(", ")}
${kanji.radicals.length > 0 ? `It is composed of these radicals: ${kanji.radicals.join(", ")}` : ""}

Create a SHORT (2-3 sentences) vivid story that:
1. ${kanji.radicals.length > 0 ? "Uses the radical meanings to build the story" : "Creates a visual image of the kanji"}
2. Connects to the kanji's meaning
3. Is memorable and a bit silly/unusual
4. Helps visualize the character

Example format: "Imagine a ${kanji.radicals[0] || "shape"} next to a ${kanji.radicals[1] || "symbol"}. When they come together, they create ${kanji.meanings[0]}..."

Output ONLY the story, no preamble or explanation.`;

  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8, // More creative for mnemonics
      maxOutputTokens: 200,
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
        return (text ?? "").trim();
      }

      if (res.status === 429) {
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) {
        throw new Error("BAD_API_KEY");
      }
      lastError = new Error(`Gemini error ${res.status}`);
      break;
    }
  }

  // Fallback for API failures
  const fallback = kanji.radicals.length > 0
    ? `The kanji ${kanji.character} means "${kanji.meanings[0]}". It contains the radicals: ${kanji.radicals.join(", ")}.`
    : `The kanji ${kanji.character} means "${kanji.meanings[0]}".`;
  
  console.warn("Mnemonic generation failed, using fallback:", lastError);
  return fallback;
}

/**
 * Get or generate a mnemonic for a user and kanji
 * @param userId - User ID
 * @param kanjiId - Kanji ID
 * @param regenerate - Force regeneration even if one exists
 * @returns Mnemonic text and whether it was cached
 */
export async function getOrCreateMnemonic(
  userId: string,
  kanjiId: string,
  regenerate = false
): Promise<{ mnemonic: string; cached: boolean }> {
  // Check cache first
  if (!regenerate) {
    const existing = await prisma.kanjiMnemonic.findUnique({
      where: { userId_kanjiId: { userId, kanjiId } },
    });

    if (existing) {
      return { mnemonic: existing.mnemonic, cached: true };
    }
  }

  // Get kanji data
  const kanji = await prisma.kanji.findUnique({
    where: { id: kanjiId },
  });

  if (!kanji) throw new Error("Kanji not found");

  // Generate new mnemonic
  const mnemonic = await generateKanjiMnemonic({
    character: kanji.character,
    meanings: JSON.parse(kanji.meanings) as string[],
    radicals: JSON.parse(kanji.radicals) as string[],
  });

  // Save to database
  await prisma.kanjiMnemonic.upsert({
    where: { userId_kanjiId: { userId, kanjiId } },
    update: { mnemonic },
    create: { userId, kanjiId, mnemonic },
  });

  return { mnemonic, cached: false };
}
