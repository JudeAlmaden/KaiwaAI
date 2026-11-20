import "server-only";
import { prisma } from "./prisma";
import { KAI_SEED, STARTER_PERSONAS } from "./personas";

// Ensures the built-in personas exist. Idempotent: safe to call on every
// personas list request. Built-ins have a null userId.
//
// Kai is `kind: "kai"`; the starters (Hana/Riku/Sora) are `kind: "kai_mode"`
// rows pointing at Kai, because they are personalities of Kai rather than
// separate characters. Until the personalities migration is applied the new
// columns do not exist, so every path falls back to the legacy shape and the
// app keeps working (Kai by name, no attitudes).
let seeded = false;

const LEGACY_SELECT = {
  id: true,
  name: true,
  blurb: true,
  avatar: true,
  builtin: true,
  userId: true,
  createdAt: true,
} as const;

export type AvailablePersona = {
  id: string;
  name: string;
  blurb: string;
  avatar: string;
  builtin: boolean;
  userId: string | null;
  createdAt: Date;
  kind?: string;
  label?: string | null;
  modeOfId?: string | null;
};

export async function ensureBuiltinPersonas() {
  if (seeded) return;
  try {
    await seedWithKinds();
  } catch {
    await seedLegacy();
  }
  seeded = true;
}

async function seedWithKinds() {
  const kai = await prisma.persona.findFirst({
    where: { builtin: true, name: KAI_SEED.name },
    orderBy: { createdAt: "asc" },
    select: { id: true, kind: true },
  });
  let kaiId = kai?.id ?? null;
  if (!kai) {
    const created = await prisma.persona.create({
      data: { ...KAI_SEED, builtin: true, kind: "kai" },
      select: { id: true },
    });
    kaiId = created.id;
  } else if (kai.kind !== "kai") {
    await prisma.persona.update({ where: { id: kai.id }, data: { kind: "kai" } });
  }

  for (const seed of STARTER_PERSONAS) {
    const existing = await prisma.persona.findFirst({
      where: { builtin: true, name: seed.name },
      orderBy: { createdAt: "asc" },
      select: {
        id: true,
        kind: true,
        modeOfId: true,
        label: true,
        personality: true,
      },
    });
    if (!existing) {
      await prisma.persona.create({
        data: {
          ...seed,
          builtin: true,
          kind: "kai_mode",
          modeOfId: kaiId,
          label: seed.label ?? null,
        },
      });
    } else if (
      existing.kind !== "kai_mode" ||
      existing.modeOfId !== kaiId ||
      existing.label !== (seed.label ?? null) ||
      existing.personality !== seed.personality
    ) {
      await prisma.persona.update({
        where: { id: existing.id },
        data: {
          kind: "kai_mode",
          modeOfId: kaiId,
          label: seed.label ?? null,
          personality: seed.personality,
        },
      });
    }
  }
}

async function seedLegacy() {
  for (const seed of [KAI_SEED, ...STARTER_PERSONAS]) {
    const existing = await prisma.persona.findFirst({
      where: { builtin: true, name: seed.name },
      select: { id: true },
    });
    if (!existing) {
      await prisma.persona.create({
        data: {
          name: seed.name,
          blurb: seed.blurb,
          personality: seed.personality,
          avatar: seed.avatar,
          builtin: true,
        },
      });
    }
  }
}

/** All personas available to a user: built-ins + their own custom ones. */
export async function listAvailablePersonas(
  userId: string
): Promise<AvailablePersona[]> {
  await ensureBuiltinPersonas();
  const where = { OR: [{ builtin: true }, { userId }] };
  const orderBy = [{ builtin: "desc" as const }, { createdAt: "asc" as const }];
  try {
    return (await prisma.persona.findMany({
      where,
      orderBy,
      select: { ...LEGACY_SELECT, kind: true, label: true, modeOfId: true },
    })) as AvailablePersona[];
  } catch {
    return (await prisma.persona.findMany({
      where,
      orderBy,
      select: LEGACY_SELECT,
    })) as AvailablePersona[];
  }
}

/** The built-in Kai persona id — the anchor every personality hangs off. */
export async function resolveKaiId(): Promise<string | null> {
  await ensureBuiltinPersonas();
  try {
    const kai = await prisma.persona.findFirst({
      where: {
        OR: [{ kind: "kai" }, { builtin: true, name: KAI_SEED.name }],
      },
      orderBy: [{ kind: "asc" }, { createdAt: "asc" }],
      select: { id: true },
    });
    return kai?.id ?? null;
  } catch {
    const kai = await prisma.persona.findFirst({
      where: { builtin: true, name: KAI_SEED.name },
      orderBy: { createdAt: "asc" },
      select: { id: true },
    });
    return kai?.id ?? null;
  }
}

/** Resolve a personaId param to a real id. The legacy/sentinel values
 *  null/""/"kai"/"default" map to the built-in Kai persona, so memory is always
 *  scoped to a concrete persona (no more null bucket). An attitude id maps to
 *  its Kai parent, because attitudes share Kai's memory. */
export async function resolvePersonaId(
  raw: string | null | undefined
): Promise<string | null> {
  if (raw && raw !== "kai" && raw !== "default") {
    try {
      const persona = await prisma.persona.findUnique({
        where: { id: raw },
        select: { kind: true, modeOfId: true },
      });
      if (persona?.kind === "kai_mode" && persona.modeOfId)
        return persona.modeOfId;
    } catch {
      // Pre-migration: ids are already concrete.
    }
    return raw;
  }
  return resolveKaiId();
}

/** Find (or create) a user's 1:1 conversation with a persona. Returns the
 *  Group id. Used by background features (outreach) and anywhere we need the
 *  canonical persona conversation for a user. */
export async function ensurePersonaConversation(
  userId: string,
  personaId: string,
  personaName: string
): Promise<string> {
  const existing = await prisma.chat.findFirst({
    where: {
      kind: "persona",
      ownerId: userId,
      members: { some: { kind: "persona", personaId } },
    },
    select: { id: true },
  });
  if (existing) return existing.id;

  const chat = await prisma.chat.create({
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
  return chat.id;
}
