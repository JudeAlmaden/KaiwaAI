import { PrismaClient } from '@/generated/prisma/client';
import { PrismaPg } from '@prisma/adapter-pg';
import fs from 'fs';

const connectionString = process.env.DATABASE_URL || "postgresql://postgres.atmflzallyrfukntlvgm:BnGIYsZ6HnzdsBeF@aws-1-ap-northeast-1.pooler.supabase.com:6543/postgres";
const adapter = new PrismaPg({ connectionString });
const prisma = new PrismaClient({ adapter });

async function exportFlashcards() {
  try {
    const user = await prisma.user.findFirst({
      where: { email: 'judealmaden2045@gmail.com' }
    });

    if (!user) {
      console.log('User not found');
      process.exit(1);
    }

    const flashcards = await prisma.flashcard.findMany({
      where: { userId: user.id },
      include: {
        sourceMessage: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const userKanji = await prisma.userKanji.findMany({
      where: { userId: user.id },
      include: {
        kanji: true
      },
      orderBy: { createdAt: 'asc' }
    });

    const exportData = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        level: user.level,
        timezone: user.timezone,
        maxNewWords: user.maxNewWords,
        streakCount: user.streakCount,
        streakBestCount: user.streakBestCount,
        lastStreakDay: user.lastStreakDay,
        createdAt: user.createdAt
      },
      flashcards: flashcards.map(fc => ({
        id: fc.id,
        word: fc.word,
        reading: fc.reading,
        romaji: fc.romaji,
        meaning: fc.meaning,
        partOfSpeech: fc.partOfSpeech,
        jlptTier: fc.jlptTier,
        meaningContexts: fc.meaningContexts,
        status: fc.status,
        easeFactor: fc.easeFactor,
        interval: fc.interval,
        repetitions: fc.repetitions,
        timesReviewed: fc.timesReviewed,
        exposures: fc.exposures,
        nextReview: fc.nextReview,
        lastReviewedAt: fc.lastReviewedAt,
        sourceMessageContent: fc.sourceMessage?.content,
        createdAt: fc.createdAt,
        updatedAt: fc.updatedAt
      })),
      userKanji: userKanji.map(uk => ({
        id: uk.id,
        character: uk.kanji.character,
        meanings: uk.kanji.meanings,
        readingsOn: uk.kanji.readingsOn,
        readingsKun: uk.kanji.readingsKun,
        strokes: uk.kanji.strokes,
        grade: uk.kanji.grade,
        frequency: uk.kanji.frequency,
        jlptLevel: uk.kanji.jlptLevel,
        mnemonic: uk.mnemonic,
        status: uk.status,
        easeFactor: uk.easeFactor,
        interval: uk.interval,
        repetitions: uk.repetitions,
        timesReviewed: uk.timesReviewed,
        nextReview: uk.nextReview,
        lastReviewedAt: uk.lastReviewedAt,
        createdAt: uk.createdAt,
        updatedAt: uk.updatedAt
      })),
      stats: {
        totalFlashcards: flashcards.length,
        totalKanji: userKanji.length,
        flashcardsByStatus: {
          new: flashcards.filter(f => f.status === 'new').length,
          learning: flashcards.filter(f => f.status === 'learning').length,
          known: flashcards.filter(f => f.status === 'known').length
        },
        kanjiByStatus: {
          new: userKanji.filter(k => k.status === 'new').length,
          learning: userKanji.filter(k => k.status === 'learning').length,
          known: userKanji.filter(k => k.status === 'known').length
        }
      },
      exportedAt: new Date().toISOString(),
      exportVersion: '0.4.2'
    };

    const filename = `flashcard-backup-${user.email.replace('@', '-at-')}-${new Date().toISOString().split('T')[0]}.json`;
    fs.writeFileSync(filename, JSON.stringify(exportData, null, 2));
    
    console.log(`✅ Export complete: ${filename}`);
    console.log(`📊 Stats:`);
    console.log(`   - Flashcards: ${exportData.stats.totalFlashcards} (${exportData.stats.flashcardsByStatus.new} new, ${exportData.stats.flashcardsByStatus.learning} learning, ${exportData.stats.flashcardsByStatus.known} known)`);
    console.log(`   - Kanji: ${exportData.stats.totalKanji} (${exportData.stats.kanjiByStatus.new} new, ${exportData.stats.kanjiByStatus.learning} learning, ${exportData.stats.kanjiByStatus.known} known)`);
    
    await prisma.$disconnect();
  } catch (error) {
    console.error('Export failed:', error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

exportFlashcards();
