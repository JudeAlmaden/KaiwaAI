import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

export const MAX_HUMAN_MEMBERS = 5;
/** New message requests a single account may send per hour. */
export const MAX_MESSAGE_REQUESTS_PER_HOUR = 5;
const MESSAGE_REQUEST_WINDOW_MS = 60 * 60 * 1000;

/** The one DM between two users, if it already exists. */
function dmBetween(aId: string, bId: string) {
  return prisma.chat.findFirst({
    where: {
      kind: "dm",
      AND: [
        { members: { some: { kind: "user", userId: aId } } },
        { members: { some: { kind: "user", userId: bId } } },
      ],
    },
    select: { id: true, name: true, kind: true },
  });
}

// GET: conversations the user belongs to (persona chats, DMs, groups).
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const memberships = await prisma.chatMember.findMany({
    where: { 
      userId: user.id, 
      kind: "user", 
      status: "accepted",
      hidden: false, // Don't show hidden conversations
    },
    include: {
      chat: {
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
      const last = m.chat.messages[0];
      return {
        id: m.chat.id,
        name: m.chat.name,
        kind: m.chat.kind,
        isOwner: m.chat.ownerId === user.id,
        hasKey: Boolean(m.chat.apiKeyEnc),
        mood: m.chat.mood,
        lastMessage: last
          ? {
              content: last.content,
              senderName: last.senderName,
              fromMe: last.senderUserId === user.id,
            }
          : null,
        lastAt: last?.createdAt ?? m.chat.createdAt,
        members: m.chat.members.map((mem) => ({
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

  let body: {
    name?: string;
    friendIds?: string[];
    personaId?: string | null;
    email?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  // A message request: start a DM by email. Friends are accepted instantly;
  // anyone else is added as a pending member, so the chat shows up in their
  // requests until they accept it.
  const requestEmail = typeof body.email === "string" ? body.email.trim() : "";
  if (requestEmail) {
    const target = await prisma.user.findFirst({
      where: { email: { equals: requestEmail, mode: "insensitive" } },
    });
    if (!target) {
      return NextResponse.json(
        { error: "No account uses that email." },
        { status: 404 }
      );
    }
    if (target.id === user.id) {
      return NextResponse.json({ error: "That's your own email." }, { status: 400 });
    }

    const friendship = await prisma.friendship.findFirst({
      where: {
        status: "accepted",
        OR: [
          { requesterId: user.id, addresseeId: target.id },
          { requesterId: target.id, addresseeId: user.id },
        ],
      },
    });
    const isFriend = Boolean(friendship);

    const existing = await dmBetween(user.id, target.id);
    if (existing) {
      const mine = await prisma.chatMember.findFirst({
        where: { chatId: existing.id, userId: user.id },
        select: { status: true },
      });
      if (!mine || mine.status !== "accepted") {
        return NextResponse.json(
          {
            error:
              "They already sent you a message request — accept it in People → Requests.",
          },
          { status: 409 }
        );
      }
      return NextResponse.json({ group: existing, reused: true, request: !isFriend });
    }

    const chatName = (target.name || target.email).slice(0, 60);

    if (isFriend) {
      const chat = await prisma.chat.create({
        data: {
          name: chatName,
          kind: "dm",
          ownerId: user.id,
          members: {
            create: [
              { kind: "user", userId: user.id, status: "accepted" },
              { kind: "user", userId: target.id, status: "accepted" },
            ],
          },
        },
      });
      return NextResponse.json({
        group: { id: chat.id, name: chat.name, kind: "dm" },
        request: false,
      });
    }

    // The budget check and the insert must commit together, or two simultaneous
    // requests both read four and both create a sixth. The advisory lock is
    // transaction-scoped and keyed on the sender, so concurrent requests from
    // one account queue up behind it (and it can't leak through the pooler).
    const result = await prisma.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${user.id})::bigint)`;

      // Counted from the DM rows themselves so the limit holds across
      // serverless instances and a decline cannot reset it. Chats with someone
      // who is already a friend are not requests, so they don't spend budget.
      const recentDms = await tx.chat.findMany({
        where: {
          ownerId: user.id,
          kind: "dm",
          createdAt: { gte: new Date(Date.now() - MESSAGE_REQUEST_WINDOW_MS) },
        },
        select: { members: { select: { userId: true } } },
      });
      const others = [
        ...new Set(
          recentDms.flatMap((chat) =>
            chat.members
              .map((member) => member.userId)
              .filter((id): id is string => Boolean(id) && id !== user.id)
          )
        ),
      ];
      const friendRows = others.length
        ? await tx.friendship.findMany({
            where: {
              status: "accepted",
              OR: [
                { requesterId: user.id, addresseeId: { in: others } },
                { addresseeId: user.id, requesterId: { in: others } },
              ],
            },
            select: { requesterId: true, addresseeId: true },
          })
        : [];
      const friendIds = new Set(
        friendRows.map((row) =>
          row.requesterId === user.id ? row.addresseeId : row.requesterId
        )
      );
      const sent = recentDms.filter((chat) => {
        const otherIds = chat.members
          .map((member) => member.userId)
          .filter((id): id is string => Boolean(id) && id !== user.id);
        // No other member means the request was declined (the membership row
        // is deleted), which still counts, so declining can't reset the budget.
        return otherIds.length === 0 || otherIds.some((id) => !friendIds.has(id));
      }).length;

      if (sent >= MAX_MESSAGE_REQUESTS_PER_HOUR) return { limited: true } as const;

      const chat = await tx.chat.create({
        data: {
          name: chatName,
          kind: "dm",
          ownerId: user.id,
          members: {
            create: [
              { kind: "user", userId: user.id, status: "accepted" },
              { kind: "user", userId: target.id, status: "pending" },
            ],
          },
        },
      });
      return { limited: false as const, chat };
    });

    if (result.limited) {
      return NextResponse.json(
        {
          error: `You can send ${MAX_MESSAGE_REQUESTS_PER_HOUR} message requests an hour. Try again later.`,
        },
        { status: 429 }
      );
    }

    return NextResponse.json({
      group: { id: result.chat.id, name: result.chat.name, kind: "dm" },
      request: true,
    });
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
      const existing = await prisma.chat.findFirst({
        where: {
          kind: "persona",
          ownerId: user.id,
          members: { some: { kind: "persona", personaId: validPersonaId } },
        },
        select: { id: true, name: true, kind: true },
      });
      if (existing) return NextResponse.json({ group: existing, reused: true });
    }

    // A DM is one conversation per friend pair, however often it is opened.
    if (kind === "dm" && validFriendIds.length === 1) {
      const existing = await dmBetween(user.id, validFriendIds[0]);
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

    const group = await prisma.chat.create({
      data: {
        name: name.slice(0, 60),
        kind,
        ownerId: user.id,
        // A persona conversation can run on the owner's personal stored key, if
        // they have one, so they don't have to set it twice.
        apiKeyEnc: kind === "persona" ? user.geminiKeyEnc : null,
        members: {
          create: [
            // Owner joins immediately. A DM's friend is already spoken for;
            // group invitees still have to accept.
            { kind: "user", userId: user.id, status: "accepted" },
            ...validFriendIds.map((fid) => ({
              kind: "user",
              userId: fid,
              status: kind === "dm" ? "accepted" : "pending",
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
