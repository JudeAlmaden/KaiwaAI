import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

// GET: list the user's friends + incoming/outgoing pending requests.
export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [accepted, incoming, outgoing] = await Promise.all([
    prisma.friendship.findMany({
      where: {
        status: "accepted",
        OR: [{ requesterId: user.id }, { addresseeId: user.id }],
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        addressee: { select: { id: true, name: true, email: true } },
      },
    }),
    prisma.friendship.findMany({
      where: { addresseeId: user.id, status: "pending" },
      include: { requester: { select: { id: true, name: true, email: true } } },
    }),
    prisma.friendship.findMany({
      where: { requesterId: user.id, status: "pending" },
      include: { addressee: { select: { id: true, name: true, email: true } } },
    }),
  ]);

  const friends = accepted.map((f) => {
    const other = f.requesterId === user.id ? f.addressee : f.requester;
    return { friendshipId: f.id, user: other };
  });

  return NextResponse.json({
    friends,
    incoming: incoming.map((f) => ({ friendshipId: f.id, user: f.requester })),
    outgoing: outgoing.map((f) => ({ friendshipId: f.id, user: f.addressee })),
  });
}

// POST: send a friend request by email.
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: { email?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!email) return NextResponse.json({ error: "Email required." }, { status: 400 });

  const target = await prisma.user.findUnique({ where: { email } });
  if (!target) return NextResponse.json({ error: "No user with that email." }, { status: 404 });
  if (target.id === user.id)
    return NextResponse.json({ error: "You can't friend yourself." }, { status: 400 });

  // Already connected (either direction)?
  const existing = await prisma.friendship.findFirst({
    where: {
      OR: [
        { requesterId: user.id, addresseeId: target.id },
        { requesterId: target.id, addresseeId: user.id },
      ],
    },
  });
  if (existing) {
    // If they already requested us, accept it instead of duplicating.
    if (existing.status === "pending" && existing.addresseeId === user.id) {
      const updated = await prisma.friendship.update({
        where: { id: existing.id },
        data: { status: "accepted" },
      });
      return NextResponse.json({ friendship: updated, accepted: true });
    }
    return NextResponse.json({ error: "Already connected or pending." }, { status: 409 });
  }

  const friendship = await prisma.friendship.create({
    data: { requesterId: user.id, addresseeId: target.id, status: "pending" },
  });
  return NextResponse.json({ friendship });
}
