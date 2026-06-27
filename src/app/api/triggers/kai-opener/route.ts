import { NextResponse } from "next/server";
import { runOutreach } from "@/lib/run-outreach";

// Manual / external trigger for Kai's "messages first" outreach.
//   POST /api/triggers/kai-opener
//   Authorization: Bearer <TRIGGER_SECRET>
function authorized(req: Request): boolean {
  const secret = process.env.TRIGGER_SECRET;
  if (!secret) return false;
  return req.headers.get("authorization") === `Bearer ${secret}`;
}

export async function POST(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const results = await runOutreach();
  return NextResponse.json({ evaluated: results.length, results });
}
