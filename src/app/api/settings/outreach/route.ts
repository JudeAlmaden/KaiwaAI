import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth-helpers";

const MODES = ["off", "scheduled", "random"];

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({
    mode: user.outreachMode,
    times: JSON.parse(user.outreachTimes || "[]"),
    quietStart: user.quietStart,
    quietEnd: user.quietEnd,
    consecutiveIgnored: user.consecutiveIgnored,
  });
}

export async function PATCH(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let body: {
    mode?: string;
    times?: string[];
    quietStart?: number;
    quietEnd?: number;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const data: {
    outreachMode?: string;
    outreachTimes?: string;
    quietStart?: number;
    quietEnd?: number;
    consecutiveIgnored?: number;
  } = {};

  if (body.mode && MODES.includes(body.mode)) {
    data.outreachMode = body.mode;
    // Re-enabling outreach resets the "ignored" mood so Kai starts fresh.
    if (body.mode !== "off") data.consecutiveIgnored = 0;
  }
  if (Array.isArray(body.times)) {
    const valid = body.times.filter((t) => /^\d{1,2}:\d{2}$/.test(t)).slice(0, 8);
    data.outreachTimes = JSON.stringify(valid);
  }
  if (typeof body.quietStart === "number")
    data.quietStart = Math.min(Math.max(body.quietStart, 0), 23);
  if (typeof body.quietEnd === "number")
    data.quietEnd = Math.min(Math.max(body.quietEnd, 0), 23);

  const updated = await prisma.user.update({ where: { id: user.id }, data });
  return NextResponse.json({
    mode: updated.outreachMode,
    times: JSON.parse(updated.outreachTimes || "[]"),
    quietStart: updated.quietStart,
    quietEnd: updated.quietEnd,
    consecutiveIgnored: updated.consecutiveIgnored,
  });
}
