import { NextResponse } from "next/server";
import { runOutreach } from "@/lib/run-outreach";

// Vercel Cron entry (configured in vercel.json). Vercel sends
// `Authorization: Bearer <CRON_SECRET>` automatically when CRON_SECRET is set.
// Also accepts TRIGGER_SECRET so a non-Vercel scheduler can call it.
export const dynamic = "force-dynamic";
export const maxDuration = 60;

function authorized(req: Request): boolean {
  const auth = req.headers.get("authorization") ?? "";
  const cron = process.env.CRON_SECRET;
  const trigger = process.env.TRIGGER_SECRET;
  if (cron && auth === `Bearer ${cron}`) return true;
  if (trigger && auth === `Bearer ${trigger}`) return true;
  return false;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  const results = await runOutreach();
  const sent = results.filter((r) => r.sent).length;
  return NextResponse.json({ ok: true, evaluated: results.length, sent });
}
