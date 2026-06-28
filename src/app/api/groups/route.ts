import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export const MAX_HUMAN_MEMBERS = 5;

// GET: conversations the user belongs to (persona chats, DMs, groups).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.groupMember.findMany({
    where: { userId: user.id, kind: "user", status: "accepted" },
    include: {
      group: {
        include: {
          members: {
            include: {
              user: { select: { id: true, name: true, email: true } },
              persona: { select: { id: true, name: true, avatar: true } },
            },
          },
          messages: {
            orderBy: { createdAt: "desc" },
            take: 1,
            select: {
              content: true,
              senderName: true,
              senderKind: true,
              senderUserId: true,
              createdAt: true,
            },
          },
        },
      },
    },
  });

  const groups = memberships
    .map((m) => {
      const last = m.group.messages[0];
      return {
        id: m.group.id,
        name: m.group.name,
        kind: m.group.kind,
        isOwner: m.group.ownerId === user.id,
        hasKey: Boolean(m.group.apiKeyEnc),
        lastMessage: last
          ? {
              content: last.content,
              senderName: last.senderName,
              fromMe: last.senderUserId === user.id,
            }
          : null,
        lastAt: last?.createdAt ?? m.group.createdAt,
        members: m.group.members.map((mem) => ({
          kind: mem.kind,
          name:
            mem.kind === "user"
              ? mem.user?.name || mem.user?.email
              : mem.persona?.name,
          avatar: mem.kind === "persona" ? mem.persona?.avatar : null,
        })),
      };
    })
    .sort((a, b) => new Date(b.lastAt).getTime() - new Date(a.lastAt).getTime());

  return NextResponse.json({ groups });
}

// POST: create a conversation. Body: { name?, friendIds?, personaId? }
// kind is derived: 1 persona + no friends → "persona"; no persona + 1 friend →
// "dm"; otherwise "group". At most ONE persona per conversation.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { name?: string; friendIds?: string[]; personaId?: string | null };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const friendIds = Array.isArray(body.friendIds) ? [...new Set(body.friendIds)] : [];
  const personaId =
    typeof body.personaId === "string" && body.personaId ? body.personaId : null;

  if (!personaId && friendIds.length === 0) {
    return NextResponse.json(
      { error: "Pick a persona or at least one friend." },
      { status: 400 }
    );
  }

  // Validate invited users are accepted friends of the creator.
  let validFriendIds: string[] = [];
  if (friendIds.length > 0) {
    const friendships = await prisma.friendship.findMany({
      where: {
        status: "accepted",
        OR: [
          { requesterId: user.id, addresseeId: { in: friendIds } },
          { addresseeId: user.id, requesterId: { in: friendIds } },
        ],
      },
    });
    const set = new Set<string>();
    for (const f of friendships) {
      set.add(f.requesterId === user.id ? f.addresseeId : f.requesterId);
    }
    validFriendIds = friendIds.filter((id) => set.has(id));
  }

  if (1 + validFriendIds.length > MAX_HUMAN_MEMBERS) {
    return NextResponse.json(
      { error: `Conversations are limited to ${MAX_HUMAN_MEMBERS} people.` },
      { status: 400 }
    );
  }

  // Validate the single persona is available to the user.
  let validPersonaId: string | null = null;
  let personaName: string | null = null;
  if (personaId) {
    const persona = await prisma.persona.findFirst({
      where: { id: personaId, OR: [{ builtin: true }, { userId: user.id }] },
      select: { id: true, name: true },
    });
    if (persona) {
      validPersonaId = persona.id;
      personaName = persona.name;
    }
  }

  // Derive kind + a sensible default name.
  const kind =
    validPersonaId && validFriendIds.length === 0
      ? "persona"
      : !validPersonaId && validFriendIds.length === 1
        ? "dm"
        : "group";

  try {
    // Reuse an existing solo persona/DM conversation instead of duplicating.
    if (kind === "persona" && validPersonaId) {
      const existing = await prisma.group.findFirst({
        where: {
          kind: "persona",
          ownerId: user.id,
          members: { some: { kind: "persona", personaId: validPersonaId } },
        },
        select: { id: true, name: true, kind: true },
      });
      if (existing) return NextResponse.json({ group: existing, reused: true });
    }

    let name = (body.name ?? "").trim();
    if (!name) {
      if (kind === "persona") name = personaName ?? "Chat";
      else if (kind === "dm") {
        const friend = await prisma.user.findUnique({
          where: { id: validFriendIds[0] },
          select: { name: true, email: true },
        });
        name = friend?.name || friend?.email || "Chat";
      } else name = "Group chat";
    }

    const group = await prisma.group.create({
      data: {
        name: name.slice(0, 60),
        kind,
        ownerId: user.id,
        // A persona conversation can run on the owner's personal stored key, if
        // they have one, so they don't have to set it twice.
        apiKeyEnc: kind === "persona" ? user.geminiKeyEnc : null,
        members: {
          create: [
            // Owner joins immediately; invited friends must accept.
            { kind: "user", userId: user.id, status: "accepted" },
            ...validFriendIds.map((fid) => ({
              kind: "user",
              userId: fid,
              status: "pending",
            })),
            ...(validPersonaId
              ? [{ kind: "persona", personaId: validPersonaId, status: "accepted" }]
              : []),
          ],
        },
      },
    });

    return NextResponse.json({ group: { id: group.id, name: group.name, kind } });
  } catch (e) {
    console.error("Failed to create conversation:", e);
    return NextResponse.json(
      { error: "Couldn't create the conversation." },
      { status: 500 }
    );
  }
}
