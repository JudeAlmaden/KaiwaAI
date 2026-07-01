import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  // Check what models are available on the prisma client
  const models = Object.keys(prisma).filter(key => !key.startsWith('_') && !key.startsWith('$'));
  
  return NextResponse.json({
    availableModels: models,
    hasKanji: 'kanji' in prisma,
    hasKanjiMnemonic: 'kanjiMnemonic' in prisma,
  });
}
