import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test 1: Can we connect?
    const count = await prisma.kanji.count();
    
    // Test 2: Can we find a specific kanji?
    const today = await prisma.kanji.findUnique({
      where: { character: "今" }
    });
    
    // Test 3: List first 5 kanji
    const sample = await prisma.kanji.findMany({
      take: 5,
      select: { character: true, meanings: true }
    });

    return NextResponse.json({
      success: true,
      totalKanji: count,
      foundToday: today ? {
        character: today.character,
        meanings: JSON.parse(today.meanings)
      } : null,
      sample: sample.map(k => ({
        character: k.character,
        meanings: JSON.parse(k.meanings)
      }))
    });
  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}
