# KaiwaAI — Data Model

This document is the source of truth for how the app stores chat, the vocabulary
deck, and persistent memory described in `GOALS.md`. For the memory *architecture*
(how summaries, recall, and reconciliation work), see `MEMORY.md`.

Stack: **Prisma 7 + PostgreSQL** (Supabase, via `@prisma/adapter-pg`). Earlier
iterations used SQLite; the app moved to Postgres for Vercel deployment. The
schema is provider-agnostic except where noted.

## Personal-use MVP — build this, defer the rest

This is a personal-use app. The full design below is the **roadmap**, not a build
requirement. Don't gate the app on the heavy infrastructure. Build the small
version; keep the big version documented for later.

**Core now (build):**
- `User`, `Message` (continuous `dayKey` stream), `Flashcard` (status + SM-2).
- A **plain `Memory` table** — content/category/importance, manually editable in
  Settings. **Skip** the supersede chain, `confidence`, `decayScore`, eviction,
  and `conflicted` status until contradictions actually become a problem.
- `DaySummary` for cheap context compaction (earns its place even solo — keeps
  the prompt small on your own BYOK key).
- **Tap-to-add** flashcard flow + per-word tokens from the model (see below).

**Defer (post-MVP, documented but not built):**
- `MonthSummary` / year tiers, reflection compaction, TTL, decay eviction,
  full LLM reconciliation + confidence scoring, function-calling recall,
  embedding-search fallback.

Fields/models below are tagged where relevant. The reconciliation machinery
defends against years of accumulated contradictions across many users — as the
single known user, you can replace most of it with "edit the row by hand."

## Token source: Gemini structured output (not a local NLP stack)

Originally GOALS.md planned kuromoji + kuroshiro + JMdict to segment Japanese and
produce readings/romaji/meanings client-side. For personal use we go
**model-first instead**: Kai returns her reply *and* the per-word token breakdown
in one structured-output call. This removes the entire client-side NLP layer (the
gnarliest dependency), and the model already knows exactly which words it used, so
segmentation matches the sentence and `dictForm` is correct (kills the
lemma-mismatch class of bugs).

`Message.tokens` keeps the same `CachedToken[]` shape — only the *source* changes
(model, not local pipeline). A deterministic kana reading-check dictionary is an
**optional post-MVP accuracy backstop** if hallucinated readings become annoying.

## Design decisions

1. **One continuous chat stream, not many conversations.** Kai is a single
   ongoing friendship, not a list of threads. `Message` rows hang directly off
   `User` as an append-only timeline. There is no `Conversation` table. The
   frontend *presents* the stream grouped by day (sticky "June 27" dividers,
   infinite scroll), but storage stays flat. This resolves the old "one thread
   vs many" question and removes a whole class of boundary/contradiction bugs.
2. **`dayKey` is stamped at write time.** Each message gets a `dayKey` string
   (e.g. `"2026-06-27"`) computed in the user's timezone when it's inserted.
   This freezes the day boundary at insert, sidestepping midnight/DST/timezone
   ambiguity, and makes both day-grouping and summary rollups exact indexed
   lookups instead of fuzzy range math.
3. **Enum-like fields are stored as `String`.** Fields like `role`, `status`,
   and `partOfSpeech` are plain strings (this kept the original SQLite happy and
   carries over fine to Postgres). Allowed values are documented here and
   enforced via TypeScript unions.
4. **A word is unique per user, not globally.** Flashcards use
   `@@unique([userId, word])` so re-encountering a word upserts instead of
   duplicating.
5. **Messages cache their tokenization.** The tap-to-translate UI needs the
   kuromoji breakdown; re-tokenizing every render is wasteful, so tokens are
   cached as a JSON string. Raw `content` is kept for AI context and fallback.
6. **SRS fields live directly on `Flashcard`.** No separate review table for
   MVP. SM-2 needs `easeFactor`, `interval`, and `repetitions`.
7. **Memory is layered: episodic vs semantic.**
   - *Episodic* (the timeline + `DaySummary`/`MonthSummary`) — what happened, when.
   - *Semantic* (`Memory`) — reconciled durable facts about the user (global truth).
   Summaries feed memory extraction; the `Memory` table is the single
   reconciled truth injected globally. See `MEMORY.md`.

## Entity overview

```
User ──< Message (one continuous dayKey-stamped stream)
  │         │
  │         └──< (captures) Flashcard
  ├──< Flashcard      (the vocabulary deck / known-words truth)
  ├──< DaySummary ──> MonthSummary   (episodic compaction over dayKey ranges)
  └──< Memory         (semantic, reconciled durable facts)
```

## Prisma models

```prisma
model User {
  id          String        @id @default(cuid())
  email       String        @unique
  name        String?
  password    String
  timezone    String        @default("UTC")  // for computing dayKey
  // learning prefs
  maxNewWords Int           @default(1)        // AI new-word budget per reply
  level       String        @default("N5")     // N5 | N4 | ...
  createdAt   DateTime      @default(now())
  updatedAt   DateTime      @updatedAt

  messages    Message[]
  flashcards  Flashcard[]
  daySummaries   DaySummary[]
  monthSummaries MonthSummary[]
  memories    Memory[]
}

model Message {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  role      String   // "kai" | "user"
  content   String   // raw text as sent/received

  // Cached kuromoji tokenization for tap-to-translate (JSON string).
  // Shape: [{ surface, reading, romaji, pos, dictForm }]
  tokens    String?

  // Day bucket, computed in the user's tz at insert time (e.g. "2026-06-27").
  dayKey    String

  // Compaction watermark: true once folded into a DaySummary.
  summarized Boolean @default(false)

  createdAt DateTime @default(now())

  capturedWords Flashcard[] @relation("WordSource")

  @@index([userId, createdAt])      // stream order
  @@index([userId, dayKey])         // day grouping + rollup + drill-down
}

model Flashcard {
  id             String    @id @default(cuid())
  userId         String
  user           User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  word           String    // dictionary/lemma form, e.g. たべる — ALWAYS the
                           // dictForm from the token, never the conjugated
                           // surface. Dedupe/match keys on this.
  reading        String    // hiragana/katakana
  romaji         String
  meaning        String    // English (context-appropriate, from the model)
  partOfSpeech   String    // "verb" | "adjective" | "noun" | "particle" | ...
  jlptTier       String    @default("unknown") // n5 | n4 | ... | unknown

  // SRS (SM-2). `status` is the usage-policy driver (see GOALS.md):
  //   new       → only via newWordBudget
  //   learning  → reinforce list (Kai actively reuses)
  //   known     → free use
  //   (rusty)   → known + nextReview overdue → added to reinforce
  status         String    @default("new")  // new | learning | known
  easeFactor     Float     @default(2.5)      // SM-2 ease factor (EF)
  interval       Int       @default(0)        // days until next review
  repetitions    Int       @default(0)        // consecutive correct (SM-2 n)
  timesReviewed  Int       @default(0)        // formal SRS reviews
  exposures      Int       @default(0)        // times Kai used it in chat (soft signal)
  nextReview     DateTime  @default(now())
  lastReviewedAt DateTime?

  sourceMessageId String?
  sourceMessage   Message? @relation("WordSource", fields: [sourceMessageId], references: [id], onDelete: SetNull)

  createdAt      DateTime  @default(now())
  updatedAt      DateTime  @updatedAt

  @@unique([userId, word])
  @@index([userId, status])
  @@index([userId, nextReview])     // "cards due" query
  @@index([userId, partOfSpeech])   // known-words-by-POS payload for the AI
}

// ── Episodic memory: compaction over the message stream ──────────────────────
// PERSONAL-USE MVP: build DaySummary. MonthSummary is POST-MVP (you won't have
// enough history for it to matter for a long time).

model DaySummary {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  dayKey    String   // the day this summarizes, e.g. "2026-06-27"
  summary   String   // recap of that day's conversation
  wordCount Int      @default(0)     // new words learned that day (progress)
  partial   Boolean  @default(false) // true while today is still being appended

  // Days this day's conversation refers back to (e.g. "yesterday I cooked…").
  // JSON string array of dayKeys, for navigation/drill-down only — NOT truth
  // resolution (that's the Memory supersede chain). e.g. ["2026-06-26"].
  relatedDayKeys String @default("[]")

  monthKey       String?            // "2026-06", links up to MonthSummary
  monthSummaryId String?
  monthSummary   MonthSummary? @relation(fields: [monthSummaryId], references: [id], onDelete: SetNull)

  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  @@unique([userId, dayKey])
  @@index([userId, dayKey])
  @@index([userId, monthKey])
}

model MonthSummary {
  id        String       @id @default(cuid())
  userId    String
  user      User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  monthKey  String       // "2026-06"
  summary   String
  // Human-readable index: which day keys this month covers, for drill-down.
  // JSON string array, e.g. ["2026-06-14","2026-06-27"].
  dayKeys   String       @default("[]")

  createdAt DateTime     @default(now())
  updatedAt DateTime     @updatedAt

  days      DaySummary[]

  @@unique([userId, monthKey])
  @@index([userId, monthKey])
}

// ── Semantic memory: durable facts about the user ───────────────────────────
// PERSONAL-USE MVP: build the plain fields (content/category/importance,
// manually editable). The supersede chain, confidence, decayScore, expiresAt,
// and the conflicted status are POST-MVP reconciliation machinery — include the
// columns if convenient, but you can ship without the logic that drives them.

model Memory {
  id           String    @id @default(cuid())
  userId       String
  user         User      @relation(fields: [userId], references: [id], onDelete: Cascade)

  content      String    // "Has a cat named Pochi (ポチ)"
  category     String    // profile | preference | fact | goal | relationship
  importance   Int       @default(1)    // 1..5 — drives which memories make the cut
  confidence   Float     @default(0.5)  // how strongly asserted; corrections write high
  decayScore   Float     @default(0)    // cached importance × recency, for eviction
  status       String    @default("active") // active | superseded | conflicted | archived
  expiresAt    DateTime?                // TTL for ephemeral facts ("exam next week")

  // Contradiction handling: supersede chain (audit trail, never hard-lose).
  supersedesId String?
  supersedes   Memory?   @relation("MemorySupersede", fields: [supersedesId], references: [id], onDelete: SetNull)
  supersededBy Memory[]  @relation("MemorySupersede")

  // Provenance: which day this fact came from (drill-down).
  sourceDayKey String?

  lastUsedAt   DateTime  @default(now())
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  @@index([userId, status, decayScore]) // top active memories + eviction candidates
  @@index([userId, category])
}
```

## Allowed values (enforced in TypeScript)

```ts
export type MessageRole = "kai" | "user";

export type CardStatus = "new" | "learning" | "known";

export type PartOfSpeech =
  | "verb" | "adjective" | "noun" | "particle"
  | "adverb" | "pronoun" | "expression" | "other";

export type MemoryCategory =
  | "profile" | "preference" | "fact" | "goal" | "relationship";

export type MemoryStatus =
  | "active" | "superseded" | "conflicted" | "archived";
```

## Cached token shape (`Message.tokens`)

Produced by Gemini's structured output alongside the reply, stored as a JSON
string, parsed on the client for tap-to-translate.

```ts
type CachedToken = {
  surface: string;   // text as it appears in the sentence (may be conjugated)
  reading: string;   // hiragana/katakana
  romaji: string;
  meaning: string;   // context-appropriate English
  pos: PartOfSpeech;
  dictForm: string;  // dictionary/lemma form — the Flashcard `word`
};
```

The model also returns `newWords: string[]` (dictForms it deliberately
introduced this turn) so those can be auto-saved as `status: new`.

## Message length policy

The user's input is capped per message (see `MEMORY.md` for rationale).

- **Limit:** `MAX_MESSAGE_CHARS` (≈ 200). Stored as a constant; can be promoted
  to a per-`User` field later for tiers.
- **Count code points, not bytes:** use `[...str].length` so kanji/emoji count
  as 1. (SQLite/JS string length already counts UTF-16 units — prefer the
  spread for correctness with surrogate pairs.)
- **Enforce on both ends:** client shows a live counter (sakura-pink near the
  limit, send disabled past it); the chat API route rejects oversized payloads.
  Never trust the client.

## Key queries

| Flow | Query | Index |
|---|---|---|
| Reinforce words (push this turn) | `WHERE userId=? AND (status='learning' OR (status='known' AND nextReview<=now())) ORDER BY nextReview LIMIT ~5` | `@@index([userId, status])`, `@@index([userId, nextReview])` |
| Level signal (knownCount) | `COUNT WHERE userId=? AND status='known'` (+ optional by `jlptTier`) | `@@index([userId, status])` |
| Cards due today | `WHERE userId=? AND nextReview<=now()` | `@@index([userId, nextReview])` |
| Tap-to-add / dedupe | `upsert` on `@@unique([userId, word])` (key on `dictForm`) | unique constraint |
| Deck by status (Vocab) | `WHERE userId=? AND status=?` | `@@index([userId, status])` |
| Chat stream (paged) | `WHERE userId=? ORDER BY createdAt DESC` | `@@index([userId, createdAt])` |
| One day's messages (drill-down) | `WHERE userId=? AND dayKey=?` | `@@index([userId, dayKey])` |
| Day rollup candidates | `WHERE userId=? AND summarized=false AND dayKey<today` | `@@index([userId, dayKey])` |
| Top memories for prompt | `WHERE userId=? AND status='active' ORDER BY decayScore DESC` (MVP: drop decay, just recent) | `@@index([userId, status, decayScore])` |

> The AI prompt sends **level + reinforce words + newWordBudget + knownCount**,
> never the full known-words list — it stays flat-sized regardless of deck size.
> See GOALS.md "Vocabulary & Reinforcement".

## API reference

All routes require an authenticated session (else 401). The Gemini call itself
happens **client-side** (BYOK); these routes handle persistence.

### Chat
```
GET  /api/chat/context   → { level, newWordBudget, knownCount, reinforce[], memories[], recentTurns[] }
                           (the prompt payload — NOT the full known-words list)
GET  /api/chat/messages  → { messages[] }   (full stream, asc)
POST /api/chat/messages  body: { userText, reply, english?, tokens[], newWords[], autoSave? }
                           saves the turn; auto-saves newWords only if autoSave=true
```

### Flashcards
```
GET    /api/flashcards?status=     → { cards[] }   (optional status filter)
POST   /api/flashcards             body: { token: CachedToken } | { word: {...} }, sourceMessageId?
                                     tap-to-add OR looked-up word; upsert on (userId, dictForm)
PATCH  /api/flashcards/:id          body: { action: "reset" | "markKnown" }
DELETE /api/flashcards/:id          remove a card
GET    /api/flashcards/review       ?mode=due|all & status= & pos= & limit=  → due or custom session
POST   /api/flashcards/review       body: { cardId, grade: 0-3 }  → applies SM-2, reschedules
```

### Memory
```
GET    /api/memory       → { memories[] }
POST   /api/memory       body: { content, category?, importance? }
PATCH  /api/memory/:id   body: { content?, category?, importance? }
DELETE /api/memory/:id
```

### Capture rules
- Dedupe on `dictForm`, not `surface` (食べます → 食べる).
- The popup hides "Add to review" for non-lexical POS (particles/grammar) via
  `pos`, and shows review status for words already in the deck.
- Tap-to-add and looked-up words enter as `status: learning`; Kai's auto-saved
  `newWords` enter as `status: new`.

## Mastery & word usage (summary)

- **Per-word mastery** = `status` (new/learning/known) + SM-2 fields. No stored
  `mastery` float — derive a 0–1 progress value on read.
- **SRS reviews graduate words; chat `exposures` only nudge** (cap +1/word/day,
  weighted well below a review; a word can't reach `known` without ≥1 real
  review).
- **Usage policy:** `learning`/overdue-`known` → `reinforce` (Kai reuses on
  purpose); `known` → free use; `unknown` → only via `newWordBudget`.

## Open decisions

1. **Embedding search over summaries** (relevance fallback when a query doesn't
   match recent context) — deferred post-MVP. See `MEMORY.md`.
2. **`User.level`**: derived from known-word coverage (recomputed at day-close)
   with a manual override, vs. purely user-set. Lean: derived-with-override.

## Migration notes

- Apply with `npx prisma migrate deploy` (prod) or `migrate dev` (local).
- Prisma 7: the connection URL lives in `prisma.config.ts` (reads `DIRECT_URL`
  / `DATABASE_URL`), not in `schema.prisma`. Runtime uses the `pg` adapter
  (`src/lib/prisma.ts`) with the pooled `DATABASE_URL`.
- After migrating, regenerate the client (`npx prisma generate`).
- **Personal-use MVP first:** `User` + `Message` (`dayKey` stream) + `Flashcard`
  + plain `Memory` + `DaySummary`. `MonthSummary`/year tiers and the
  reconciliation machinery are post-MVP.
