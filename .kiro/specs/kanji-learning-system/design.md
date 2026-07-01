# Design: Kanji Learning System

## Overview

This document outlines the technical design for integrating a comprehensive kanji learning system into KaiwaAI. The system will leverage a local PostgreSQL database seeded with ~13,000 kanji from the davidluzgouveia/kanji-data repository, providing offline-capable, fast kanji learning features.

## Architecture

### High-Level Component Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     Client (Browser)                         │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐   │
│  │ /vocab Page  │  │ /kanji Page  │  │ /kanji/[char]   │   │
│  │  (existing)  │  │   (new)      │  │     (new)       │   │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘   │
│         │                  │                   │             │
└─────────┼──────────────────┼───────────────────┼─────────────┘
          │                  │                   │
          ▼                  ▼                   ▼
┌─────────────────────────────────────────────────────────────┐
│                      API Routes                              │
├─────────────────────────────────────────────────────────────┤
│  /api/flashcards    /api/kanji        /api/kanji/[char]     │
│  (enhanced)         (new)             (new)                 │
│                                       /api/kanji/mnemonic    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Business Logic Layer                        │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌──────────────────┐                 │
│  │ Kanji Extractor │  │ Mnemonic Generator│                 │
│  │   (utility)     │  │   (Gemini AI)     │                 │
│  └─────────────────┘  └──────────────────┘                 │
└─────────────────────┬──────────────────┬────────────────────┘
                      │                  │
                      ▼                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Data Access Layer                          │
├─────────────────────────────────────────────────────────────┤
│                    Prisma ORM                                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                PostgreSQL Database                           │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────┐  ┌────────────────┐  ┌──────────────┐        │
│  │  Kanji   │  │ KanjiMnemonic  │  │  Flashcard   │        │
│  │  (new)   │  │    (new)       │  │  (existing)  │        │
│  └──────────┘  └────────────────┘  └──────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Database Schema

### New Tables

#### Kanji Table
Stores comprehensive information about each kanji character.

```prisma
model Kanji {
  id            String   @id @default(cuid())
  character     String   @unique  // The kanji itself, e.g., "勝"
  strokes       Int                // Stroke count
  grade         Int?               // School grade level (1-6 for kyouiku)
  frequency     Int?               // Usage frequency rank (lower = more common)
  jlptLevel     Int?               // JLPT level: 5=N5, 4=N4, 3=N3, 2=N2, 1=N1
  meanings      String             // JSON array: ["Victory", "Win"]
  readingsOn    String             // JSON array: ["しょう"]
  readingsKun   String             // JSON array: ["か.つ", "まさ.る"]
  radicals      String             // JSON array: ["Moon", "Gladiator", "Power"]
  wkLevel       Int?               // WaniKani level (1-60)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  mnemonics     KanjiMnemonic[]
  
  @@index([jlptLevel])
  @@index([grade])
  @@index([frequency])
  @@index([character])
}
```

#### KanjiMnemonic Table
Stores user-specific AI-generated mnemonics for kanji.

```prisma
model KanjiMnemonic {
  id         String   @id @default(cuid())
  userId     String
  user       User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  kanjiId    String
  kanji      Kanji    @relation(fields: [kanjiId], references: [id], onDelete: Cascade)
  mnemonic   String   // AI-generated story
  createdAt  DateTime @default(now())
  
  @@unique([userId, kanjiId])
  @@index([userId])
  @@index([kanjiId])
}
```

### Schema Updates

#### User Model
Add relation to KanjiMnemonic:

```prisma
model User {
  // ... existing fields
  kanjiMnemonics KanjiMnemonic[]
}
```

## Data Flow

### 1. Kanji Data Seeding Flow

```
┌─────────────────────┐
│ kanji-data.json     │
│ (~13,000 entries)   │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ Seed Script         │
│ (scripts/seed-      │
│  kanji.ts)          │
└──────────┬──────────┘
           │
           ├─ Parse JSON
           ├─ Validate data
           ├─ Transform to Prisma format
           │
           ▼
┌─────────────────────┐
│ Prisma Client       │
│ createMany()        │
└──────────┬──────────┘
           │
           ▼
┌─────────────────────┐
│ PostgreSQL Database │
│ Kanji table         │
│ (13,000 rows)       │
└─────────────────────┘
```

### 2. User Views Vocabulary → Kanji Flow

```
User clicks vocab word
    │
    ▼
VocabClient modal opens
    │
    ├─ User clicks "Learn Kanji"
    │
    ▼
Extract kanji from word
    │
    ├─ Filter Unicode range U+4E00–U+9FFF
    │
    ▼
Navigate to /kanji?word={word}
    │
    ▼
KanjiDetailPage loads
    │
    ├─ Query Kanji table for each character
    ├─ Query Flashcard for vocab examples
    ├─ Query KanjiMnemonic for user mnemonic
    │
    ▼
Display kanji details + mnemonic
```

### 3. Mnemonic Generation Flow

```
User views kanji detail
    │
    ▼
Check KanjiMnemonic table
    │
    ├─ Exists? → Display cached mnemonic
    │
    └─ Not exists? → Generate new
          │
          ▼
    Build prompt with kanji data
    (character, meanings, radicals)
          │
          ▼
    Call Gemini API (generateMnemonic)
          │
          ├─ Success → Save to KanjiMnemonic
          ├─ Error → Show fallback text
          │
          ▼
    Display mnemonic
```

## API Endpoints

### GET /api/kanji

**Purpose**: List kanji from user's vocabulary with optional filtering

**Query Parameters**:
- `search?: string` - Search by character, meaning, or reading
- `jlptLevel?: 1|2|3|4|5` - Filter by JLPT level
- `grade?: 1-6` - Filter by school grade
- `sortBy?: 'frequency'|'mastery'|'strokes'` - Sort order
- `limit?: number` - Results per page (default: 50)
- `offset?: number` - Pagination offset

**Response**:
```typescript
{
  kanji: Array<{
    id: string
    character: string
    meanings: string[]
    readingsOn: string[]
    readingsKun: string[]
    jlptLevel: number | null
    strokes: number
    vocabCount: number      // Total vocab words containing this
    knownVocabCount: number // Known vocab words containing this
    masteryPercent: number  // knownVocabCount / vocabCount * 100
  }>
  total: number
  hasMore: boolean
}
```

### GET /api/kanji/[character]

**Purpose**: Get detailed information for a specific kanji

**Path Parameters**:
- `character: string` - The kanji character (URL encoded)

**Response**:
```typescript
{
  kanji: {
    id: string
    character: string
    strokes: number
    grade: number | null
    frequency: number | null
    jlptLevel: number | null
    meanings: string[]
    readingsOn: string[]
    readingsKun: string[]
    radicals: string[]
    wkLevel: number | null
  }
  mnemonic: string | null  // User's cached mnemonic if exists
  vocabularyExamples: Array<{
    id: string
    word: string
    reading: string
    romaji: string
    meaning: string
    status: 'new' | 'learning' | 'known'
  }>
}
```

### POST /api/kanji/[character]/mnemonic

**Purpose**: Generate or regenerate a mnemonic for a kanji

**Path Parameters**:
- `character: string` - The kanji character

**Request Body**:
```typescript
{
  regenerate?: boolean  // If true, generate even if one exists
}
```

**Response**:
```typescript
{
  mnemonic: string
  cached: boolean  // True if retrieved from cache, false if newly generated
}
```

## Core Utilities

### 1. Kanji Extractor (`src/lib/kanji-utils.ts`)

```typescript
/**
 * Extract unique kanji characters from a string
 * @param text - Text containing Japanese characters
 * @returns Array of unique kanji characters
 */
export function extractKanji(text: string): string[] {
  const kanjiRegex = /[\u4E00-\u9FFF]/g
  const matches = text.match(kanjiRegex)
  if (!matches) return []
  return [...new Set(matches)]
}

/**
 * Get all unique kanji from user's vocabulary
 * @param userId - User ID
 * @returns Array of kanji characters
 */
export async function getUserKanji(userId: string): Promise<string[]> {
  const flashcards = await prisma.flashcard.findMany({
    where: { userId },
    select: { word: true }
  })
  
  const allKanji = flashcards.flatMap(card => extractKanji(card.word))
  return [...new Set(allKanji)]
}

/**
 * Find vocabulary words containing a specific kanji
 * @param userId - User ID
 * @param kanji - Kanji character
 * @returns Array of flashcards
 */
export async function getVocabWithKanji(
  userId: string, 
  kanji: string
): Promise<Flashcard[]> {
  const flashcards = await prisma.flashcard.findMany({
    where: { userId },
  })
  
  return flashcards.filter(card => card.word.includes(kanji))
}
```

### 2. Mnemonic Generator (`src/lib/kanji-mnemonic.ts`)

```typescript
import { generateMnemonic as geminiGenerate } from './gemini'

export type KanjiData = {
  character: string
  meanings: string[]
  radicals: string[]
}

/**
 * Generate a mnemonic story for a kanji using AI
 * @param kanji - Kanji data
 * @returns Generated mnemonic story
 */
export async function generateKanjiMnemonic(
  kanji: KanjiData
): Promise<string> {
  const prompt = `Create a memorable story to help remember the Japanese kanji "${kanji.character}".

The kanji means: ${kanji.meanings.join(', ')}
It is composed of these radicals: ${kanji.radicals.join(', ')}

Create a SHORT (2-3 sentences) vivid story that:
1. Uses the radical meanings to build the story
2. Connects to the kanji's meaning
3. Is memorable and a bit silly/unusual
4. Helps visualize the character

Example format: "Imagine a [radical 1] next to a [radical 2]. When they come together, they create [meaning]..."

Output ONLY the story, no preamble.`

  try {
    return await geminiGenerate(prompt)
  } catch (error) {
    // Fallback for API failures
    return `The kanji ${kanji.character} means "${kanji.meanings[0]}". It contains the radicals: ${kanji.radicals.join(', ')}.`
  }
}

/**
 * Get or generate a mnemonic for a user and kanji
 * @param userId - User ID
 * @param kanjiId - Kanji ID
 * @param regenerate - Force regeneration
 * @returns Mnemonic text
 */
export async function getOrCreateMnemonic(
  userId: string,
  kanjiId: string,
  regenerate = false
): Promise<{ mnemonic: string; cached: boolean }> {
  // Check cache first
  if (!regenerate) {
    const existing = await prisma.kanjiMnemonic.findUnique({
      where: { userId_kanjiId: { userId, kanjiId } }
    })
    
    if (existing) {
      return { mnemonic: existing.mnemonic, cached: true }
    }
  }
  
  // Get kanji data
  const kanji = await prisma.kanji.findUnique({
    where: { id: kanjiId }
  })
  
  if (!kanji) throw new Error('Kanji not found')
  
  // Generate new mnemonic
  const mnemonic = await generateKanjiMnemonic({
    character: kanji.character,
    meanings: JSON.parse(kanji.meanings),
    radicals: JSON.parse(kanji.radicals)
  })
  
  // Save to database
  await prisma.kanjiMnemonic.upsert({
    where: { userId_kanjiId: { userId, kanjiId } },
    update: { mnemonic },
    create: { userId, kanjiId, mnemonic }
  })
  
  return { mnemonic, cached: false }
}
```

### 3. Gemini Integration Update (`src/lib/gemini.ts`)

Add new function:

```typescript
/**
 * Generate a mnemonic using Gemini
 * @param prompt - The prompt for mnemonic generation
 * @returns Generated mnemonic text
 */
export async function generateMnemonic(prompt: string): Promise<string> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");
  const keys = keysForRequest();
  const models = getAutoFallback() ? modelFallbackOrder() : [getModel()];

  const requestBody = JSON.stringify({
    contents: [{ role: "user", parts: [{ text: prompt }] }],
    generationConfig: {
      temperature: 0.8,  // More creative for mnemonics
      maxOutputTokens: 200,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });

  let lastError: Error = new Error("Mnemonic generation failed.");
  
  for (const model of models) {
    for (const key of keys) {
      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        }
      );
      
      if (res.ok) {
        const data = await res.json();
        const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        return (text ?? "").trim();
      }
      
      if (res.status === 429) {
        lastError = new Error("RATE_LIMIT");
        continue;
      }
      if (res.status === 400 || res.status === 403) {
        throw new Error("BAD_API_KEY");
      }
      lastError = new Error(`Gemini error ${res.status}`);
      break;
    }
  }
  
  throw lastError;
}
```

## UI Components

### 1. Kanji List Page (`/kanji`)

**File**: `src/app/(app)/kanji/page.tsx`

```typescript
export default function KanjiPage() {
  return <KanjiClient />
}
```

**File**: `src/app/(app)/kanji/KanjiClient.tsx`

Component structure:
- Search bar (character, meaning, reading)
- Filter chips (JLPT levels, grade)
- Sort dropdown (frequency, mastery, strokes)
- Grid of kanji cards showing:
  - Character (large)
  - Primary meaning
  - Mastery percentage (ring indicator)
  - JLPT level badge
- Empty state when no vocabulary exists

### 2. Kanji Detail Page (`/kanji/[character]`)

**File**: `src/app/(app)/kanji/[character]/page.tsx`

Component structure:
- Header:
  - Large kanji character display
  - Stroke count
  - JLPT level badge
- Meanings section (primary + alternates)
- Readings section:
  - On'yomi (音読み) with examples
  - Kun'yomi (訓読み) with examples
- Radicals section:
  - Visual breakdown
  - Clickable radical components
- Mnemonic section:
  - AI-generated story
  - "Regenerate" button
  - Loading state during generation
- Vocabulary examples:
  - Grid of words from user's deck
  - Highlight the kanji in each word
  - Click to navigate back to /vocab

### 3. Vocabulary Enhancement

**File**: `src/app/(app)/vocab/VocabClient.tsx`

Add to detail modal:
```tsx
{hasKanji(selected.word) && (
  <button
    onClick={() => router.push(`/kanji?word=${selected.word}`)}
    className="mt-3 rounded-full border-2 border-indigo-ai px-4 py-2 text-sm font-bold text-indigo-ai transition-colors hover:bg-indigo-ai hover:text-white"
  >
    📚 Learn Kanji
  </button>
)}
```

## Data Seeding

### Seed Script (`scripts/seed-kanji.ts`)

```typescript
import { PrismaClient } from '@/generated/prisma'
import kanjiData from './kanji-data.json'

const prisma = new PrismaClient()

type KanjiEntry = {
  strokes: number
  grade: number | null
  freq: number | null
  jlpt_new: number | null
  meanings: string[]
  readings_on: string[]
  readings_kun: string[]
  wk_radicals: string[] | null
  wk_level: number | null
}

async function seedKanji() {
  console.log('Starting kanji seed...')
  
  const entries = Object.entries(kanjiData) as [string, KanjiEntry][]
  
  const kanjiRecords = entries.map(([character, data]) => ({
    character,
    strokes: data.strokes,
    grade: data.grade,
    frequency: data.freq,
    jlptLevel: data.jlpt_new,
    meanings: JSON.stringify(data.meanings),
    readingsOn: JSON.stringify(data.readings_on || []),
    readingsKun: JSON.stringify(data.readings_kun || []),
    radicals: JSON.stringify(data.wk_radicals || []),
    wkLevel: data.wk_level,
  }))
  
  // Insert in batches to avoid memory issues
  const batchSize = 500
  for (let i = 0; i < kanjiRecords.length; i += batchSize) {
    const batch = kanjiRecords.slice(i, i + batchSize)
    await prisma.kanji.createMany({
      data: batch,
      skipDuplicates: true
    })
    console.log(`Seeded ${Math.min(i + batchSize, kanjiRecords.length)} / ${kanjiRecords.length}`)
  }
  
  console.log('✅ Kanji seed complete!')
}

seedKanji()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
```

## Testing Strategy

### Unit Tests

1. **Kanji Extractor Tests** (`src/lib/kanji-utils.test.ts`):
   - Extract kanji from mixed text
   - Handle hiragana-only text
   - Handle katakana-only text
   - Handle text with no kanji

2. **Mnemonic Generator Tests** (`src/lib/kanji-mnemonic.test.ts`):
   - Mock AI responses
   - Test fallback behavior
   - Test caching logic

### Integration Tests

1. **API Tests**:
   - GET /api/kanji returns user's kanji
   - GET /api/kanji/[char] returns kanji details
   - POST /api/kanji/[char]/mnemonic generates/caches correctly

### E2E Tests (Manual)

1. Navigate from vocab → kanji detail
2. Generate mnemonic for new kanji
3. Regenerate existing mnemonic
4. Search and filter kanji list
5. Click vocabulary examples to return to vocab

## Performance Optimizations

1. **Database Indexes**: JLPT level, grade, frequency, character
2. **Mnemonic Caching**: User-specific, never regenerate unless requested
3. **Pagination**: Kanji list limited to 50 per page
4. **Lazy Loading**: Load mnemonics only when kanji detail is viewed
5. **JSON Fields**: Store arrays as JSON to avoid separate tables for readings/radicals

## Security Considerations

1. **Input Validation**: Verify kanji character is in valid Unicode range
2. **Authorization**: Users can only access their own mnemonics
3. **Rate Limiting**: Limit mnemonic generation to prevent API abuse
4. **XSS Protection**: Sanitize kanji character in URLs

## Migration Plan

1. Create Kanji and KanjiMnemonic tables
2. Download kanji-data.json from GitHub
3. Run seed script to populate Kanji table
4. Add relation to User model
5. Test queries on sample data
6. Deploy migration to production

## Rollout Plan

**Phase 1**: Foundation (Days 1-2)
- Database migration
- Seed kanji data
- Utility functions
- API endpoints

**Phase 2**: UI (Days 3-4)
- Kanji list page
- Kanji detail page
- Vocabulary integration

**Phase 3**: AI Features (Day 5)
- Mnemonic generation
- Caching system
- Regeneration

**Phase 4**: Polish (Day 6)
- Search & filtering
- Mobile optimization
- Loading states
- Error handling

## Monitoring & Metrics

- Track mnemonic generation success rate
- Monitor API response times
- Count unique kanji viewed per user
- Measure vocab → kanji navigation rate
