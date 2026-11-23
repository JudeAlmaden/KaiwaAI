import { prisma } from "@/lib/prisma";

export type SavedMnemonic = { mnemonic: string | null };

/**
 * The one write path for a mnemonic note.
 * Always stores the note; only syncs UserKanji when the card already exists,
 * so generating a story never silently enrols a kanji in the review list.
 * Blank text deletes the note.
 */
export async function saveKanjiMnemonic(
  userId: string,
  kanjiId: string,
  rawMnemonic: string
): Promise<SavedMnemonic> {
  const mnemonic = rawMnemonic.trim();
  const existing = await prisma.userKanji.findUnique({
    where: { userId_kanjiId: { userId, kanjiId } },
    select: { id: true },
  });

  if (!mnemonic) {
    await prisma.kanjiMnemonic.deleteMany({ where: { userId, kanjiId } });
    if (existing) {
      await prisma.userKanji.update({
        where: { id: existing.id },
        data: { mnemonic: null },
      });
    }
    return { mnemonic: null };
  }

  await prisma.kanjiMnemonic.upsert({
    where: { userId_kanjiId: { userId, kanjiId } },
    create: { userId, kanjiId, mnemonic },
    update: { mnemonic },
  });

  if (existing) {
    await prisma.userKanji.update({
      where: { id: existing.id },
      data: { mnemonic },
    });
  }

  return { mnemonic };
}
