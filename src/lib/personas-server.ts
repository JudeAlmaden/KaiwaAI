import "server-only";
import { prisma } from "./prisma";
import { KAI_SEED, STARTER_PERSONAS } from "./personas";

// Ensures the built-in personas (Kai + starters) exist. Idempotent: safe to
// call on every personas list request. Built-ins have a null userId.
let seeded = false;

export async function ensureBuiltinPersonas() {
  if (seeded) return;
  const seeds = [KAI_SEED, ...STARTER_PERSONAS];
  for (const s of seeds) {
    const existing = await prisma.persona.findFirst({
      where: { builtin: true, name: s.name },
      select: { id: true },
    });
    if (!existing) {
      await prisma.persona.create({
        data: {
          name: s.name,
          blurb: s.blurb,
          personality: s.personality,
          avatar: s.avatar,
          builtin: true,
        },
      });
    }
  }
  seeded = true;
}

/** All personas available to a user: built-ins + their own custom ones. */
export async function listAvailablePersonas(userId: string) {
  await ensureBuiltinPersonas();
  return prisma.persona.findMany({
    where: { OR: [{ builtin: true }, { userId }] },
    orderBy: [{ builtin: "desc" }, { createdAt: "asc" }],
  });
}

/** Resolve a personaId param to a real id. The legacy/sentinel values
 *  null/""/"kai"/"default" map to the built-in Kai persona, so memory is always
 *  scoped to a concrete persona (no more null bucket). */
export async function resolvePersonaId(
  raw: string | null | undefined
): Promise<string | null> {
  if (raw && raw !== "kai" && raw !== "default") return raw;
  await ensureBuiltinPersonas();
  const kai = await prisma.persona.findFirst({
    where: { builtin: true, name: "Kai" },
    select: { id: true },
  });
  return kai?.id ?? null;
}

/** Find (or create) a user's 1:1 conversation with a persona. Returns the
 *  Group id. Used by background features (outreach) and anywhere we need the
 *  canonical persona conversation for a user. */
export async function ensurePersonaConversation(
  userId: string,
  personaId: string,
  personaName: string
): Promise<string> {
  const existing = await prisma.group.findFirst({
    where: {
      kind: "persona",
      ownerId: userId,
      members: { some: { kind: "persona", personaId } },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const group = await prisma.group.create({
    data: {
      name: personaName,
      kind: "persona",
      ownerId: userId,
      members: {
        create: [
          { kind: "user", userId, status: "accepted" },
          { kind: "persona", personaId, status: "accepted" },
        ],
      },
    },
    select: { id: true },
  });
  return group.id;
}
