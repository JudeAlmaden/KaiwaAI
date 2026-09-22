import { NextResponse } from "next/server";
import { getCurrentUser } from "@/lib/auth-helpers";
import { lookupLimiter } from "@/lib/rate-limiter";
import { enrichTokensFromDb } from "@/lib/dictionary-enrich-db";

/**
 * Batch enrich Japanese tokens from local Word/WordForm/Phrase tables.
 * Body: { tokens: [{ surface, dictForm?, reading?, meaning?, pos? }] }
 * Returns enrichment keyed by index; missing entries stay as provided.
 */
export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  if (lookupLimiter.isRateLimited(user.id)) {
    return NextResponse.json(
      { error: "Too many lookups. Please slow down." },
      { status: 429 }
    );
  }

  let body: {
    tokens?: Array<{
      surface?: string;
      dictForm?: string;
      reading?: string;
      meaning?: string;
      pos?: string;
    }>;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  }

  const tokens = Array.isArray(body.tokens) ? body.tokens.slice(0, 80) : [];
  if (tokens.length === 0) return NextResponse.json({ enrichments: [] });

  const enrichments = await enrichTokensFromDb(user.id, tokens);
  return NextResponse.json({ enrichments });
}