/**
 * Import dictionary data from CSV files into the database.
 * Optimized for large datasets (363k+ rows) with batch processing.
 * Run with: npx tsx scripts/import-dictionary.ts
 */

import { PrismaClient } from "../src/generated/prisma/client";
import { PartOfSpeech, VerbType, AdjectiveType } from "../src/generated/prisma/enums";
import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const prisma = new PrismaClient({} as any);

const BATCH_SIZE = 1000; // Process 1000 rows at a time

interface WordRow {
  id: number;
  dictionary: string;
  reading: string;
  meanings: string;
  partOfSpeech: string;
  verbType: string;
  adjectiveType: string;
  jlptLevel: string;
  frequency: number;
}

interface WordFormRow {
  wordId: number;
  form: string;
  reading: string;
  formType: string;
}

function parseCSVLine(line: string, headers: string[]): Record<string, unknown> {
  const values: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      inQuotes = !inQuotes;
    } else if (char === "," && !inQuotes) {
      values.push(current.trim());
      current = "";
    } else {
      current += char;
    }
  }
  values.push(current.trim());

  const obj: Record<string, unknown> = {};
  headers.forEach((header, i) => {
    let value: unknown = values[i] || "";
    if (typeof value === "string" && value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    if (header === "id" || header === "wordId" || header === "frequency") {
      value = parseInt(value as string, 10) || 0;
    }
    obj[header] = value;
  });
  return obj;
}

async function importWords() {
  console.log("🔄 Importing words...");
  const wordsPath = path.join(process.cwd(), "public", "database", "words.csv");

  const fileStream = fs.createReadStream(wordsPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  let batch: WordRow[] = [];
  let imported = 0;
  let lineNum = 0;

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) {
      headers = line.split(",").map((h) => h.trim());
      continue;
    }

    if (!line.trim()) continue;

    const row = parseCSVLine(line, headers) as unknown as WordRow;
    batch.push(row);

    if (batch.length >= BATCH_SIZE) {
      await processBatchWords(batch);
      imported += batch.length;
      console.log(`  Imported ${imported} words...`);
      batch = [];
    }
  }

  // Process remaining
  if (batch.length > 0) {
    await processBatchWords(batch);
    imported += batch.length;
  }

  console.log(`✅ Imported ${imported} words`);
}

async function processBatchWords(batch: WordRow[]) {
  // Use createMany for much faster bulk inserts
  try {
    await prisma.word.createMany({
      data: batch.map((word) => ({
        id: word.id,
        dictionary: word.dictionary,
        reading: word.reading,
        meanings: word.meanings,
        partOfSpeech: word.partOfSpeech as PartOfSpeech,
        verbType: (word.verbType as VerbType) || null,
        adjectiveType: (word.adjectiveType as AdjectiveType) || null,
        jlptLevel: word.jlptLevel || null,
        frequency: word.frequency || null,
      })),
      skipDuplicates: true, // Skip if already exists
    });
  } catch {
    console.error("  Batch failed, trying individually...");
    for (const word of batch) {
      try {
        await prisma.word.create({
          data: {
            id: word.id,
            dictionary: word.dictionary,
            reading: word.reading,
            meanings: word.meanings,
            partOfSpeech: word.partOfSpeech as PartOfSpeech,
            verbType: (word.verbType as VerbType) || null,
            adjectiveType: (word.adjectiveType as AdjectiveType) || null,
            jlptLevel: word.jlptLevel || null,
            frequency: word.frequency || null,
          },
        });
      } catch {
        // Skip duplicates
      }
    }
  }
}

async function importWordForms() {
  console.log("🔄 Importing word forms (this may take a few minutes for 363k rows)...");
  const formsPath = path.join(process.cwd(), "public", "database", "word_forms.csv");

  const fileStream = fs.createReadStream(formsPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity,
  });

  let headers: string[] = [];
  let batch: WordFormRow[] = [];
  let imported = 0;
  let lineNum = 0;
  const startTime = Date.now();

  for await (const line of rl) {
    lineNum++;
    if (lineNum === 1) {
      headers = line.split(",").map((h) => h.trim());
      continue;
    }

    if (!line.trim()) continue;

    const row = parseCSVLine(line, headers) as unknown as WordFormRow;
    batch.push(row);

    if (batch.length >= BATCH_SIZE) {
      await processBatchWordForms(batch);
      imported += batch.length;
      
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const rate = (imported / (Date.now() - startTime) * 1000).toFixed(0);
      console.log(`  Imported ${imported} forms (${rate}/sec, ${elapsed}s elapsed)...`);
      batch = [];
    }
  }

  // Process remaining
  if (batch.length > 0) {
    await processBatchWordForms(batch);
    imported += batch.length;
  }

  const totalTime = ((Date.now() - startTime) / 1000).toFixed(1);
  console.log(`✅ Imported ${imported} word forms in ${totalTime}s`);
}

async function processBatchWordForms(batch: WordFormRow[]) {
  try {
    await prisma.wordForm.createMany({
      data: batch.map((form) => ({
        wordId: form.wordId,
        form: form.form,
        reading: form.reading,
        formType: form.formType,
        generated: true,
      })),
      skipDuplicates: true,
    });
  } catch (err) {
    console.error("  Batch failed:", err);
    // Don't retry individually for word forms - too many rows
  }
}

async function main() {
  console.log("📚 Starting dictionary import...\n");
  console.log("⚠️  This will take several minutes for large datasets.\n");

  try {
    await importWords();
    await importWordForms();
    console.log("\n🎉 Dictionary import complete!");
  } catch (err) {
    console.error("❌ Import failed:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
