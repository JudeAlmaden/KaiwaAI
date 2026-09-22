import { prisma } from "@/lib/prisma";
import { memoryDedupeKey, memorySimilarity } from "@/lib/memory-normalize";

export const MEMORY_CATEGORIES = [
  "profile",
  "preference",
  "fact",
  "goal",
  "relationship",
] as const;

const NEAR_DUP_THRESHOLD = 0.75;

export async function upsertMemory(args: {
  userId: string;
  personaId: string | null;
  content: string;
  category: string;
  importance: number;
  supersedesId?: string | null;
}) {
  const { userId, personaId, content, category, importance, supersedesId } = args;

  const existing = await prisma.memory.findMany({
    where: { userId, personaId, supersededById: null },
    select: { id: true, content: true, importance: true },
    take: 200,
  });

  const key = memoryDedupeKey(content);
  const near = existing.find((m) => {
    if (memoryDedupeKey(m.content) === key) return true;
    return memorySimilarity(m.content, content) >= NEAR_DUP_THRESHOLD;
  });

  if (near) {
    const updated = await prisma.memory.update({
      data: {
        content,
        category,
        importance: Math.max(near.importance, importance),
        updatedAt: new Date(),
      },
      where: { id: near.id },
    });
    return { memory: updated, deduped: true };
  }

  const memory = await prisma.memory.create({
    data: { userId, personaId, content, category, importance },
  });

  if (supersedesId) {
    const old = await prisma.memory.findFirst({
      where: { id: supersedesId, userId },
      select: { id: true },
    });
    if (old) {
      await prisma.memory.update({
        where: { id: old.id },
        data: { supersededById: memory.id },
      });
    }
  }

  return { memory, deduped: false };
}
