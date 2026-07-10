import "dotenv/config";
import { prisma } from "../src/lib/prisma";

async function checkFlashcards() {
  const count = await prisma.userFlashcard.count();
  const sample = await prisma.userFlashcard.findMany({ 
    take: 5,
    include: { word: true, phrase: true, user: { select: { email: true } } }
  });

  console.log(`Total UserFlashcards: ${count}`);
  console.log('\nSample cards:');
  sample.forEach((card, i) => {
    console.log(`\n${i + 1}. User: ${card.user.email}`);
    if (card.word) {
      console.log(`   Word: ${card.word.dictionary} (${card.word.reading})`);
    }
    if (card.phrase) {
      console.log(`   Phrase: ${card.phrase.text} (${card.phrase.reading})`);
    }
    console.log(`   Status: ${card.status}`);
  });

  await prisma.$disconnect();
}

checkFlashcards();
