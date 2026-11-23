import { prisma } from "@/lib/prisma";
import { buildComponentContexts } from "./context";
import type { ComponentContext } from "./types";

/**
 * Resolve every primitive of a render in ONE batched query per table.
 * Returns a glyph → context map so a review session resolves all cards
 * without a query per card or per component.
 */
export async function loadComponentMap(
  userId: string,
  primitives: string[]
): Promise<Map<string, ComponentContext>> {
  const glyphs = [...new Set(primitives.map((glyph) => glyph.trim()).filter(Boolean))];
  if (glyphs.length === 0) return new Map();

  const [rows, overrides] = await Promise.all([
    prisma.kanji.findMany({
      where: { character: { in: glyphs } },
      select: {
        character: true,
        heisigKeyword: true,
        heisigNumber: true,
        meanings: true,
      },
    }),
    prisma.userKanji.findMany({
      where: { userId, kanji: { character: { in: glyphs } } },
      select: {
        customMeaning: true,
        mnemonic: true,
        kanji: { select: { character: true } },
      },
    }),
  ]);

  const contexts = buildComponentContexts(glyphs, rows, overrides);
  return new Map(contexts.map((context) => [context.glyph, context]));
}
