# KaiwaAI

KaiwaAI is a Japanese-learning web app built around conversation. Learners chat with Kai or other AI personas, tap Japanese in responses for explanations, save words and phrases, review with spaced repetition, learn associated kanji, and manage the facts each persona remembers.

This README is the project's single source of truth. It describes the current application, its code structure, API, data model, and operational workflow.

## What the app does

### Conversation-led learning

- Chat with the built-in Kai persona or user-created personas.
- Use personal, direct messages and group conversations containing people and AI personas.
- Receive Japanese-forward replies with an English gloss, contextual word tokens, and optional grammar feedback.
- Tap a token to view its reading, meaning, conjugations, pronunciation control, and save state.
- Save whole multi-word expressions as phrases; phrase popups can expose their component words.
- Start a conversation with a selected persona, invite people, hide chats, and remove messages when permitted.

### Vocabulary, phrases, and review

- Look up Japanese through the dictionary UI or token popups.
- Save dictionary words, individual inflected forms, and custom/AI-generated phrases as flashcards.
- Browse saved items on `/vocab` using separate **Words** and **Phrases** tabs, text search, part-of-speech groups, status filters, progress indicators, and a detail sheet.
- Review vocabulary, kanji, or a mixed queue. Sessions can be due-only, all cards, recent cards, struggling cards, or leeches; they support Japanese-to-English, English-to-Japanese, and mixed direction.
- Grade a card Again, Hard, Good, or Easy. The SM-2-style scheduler updates interval, repetitions, ease factor, status, and next review date.

### Kanji learning

- Derive a learner's kanji list from saved vocabulary.
- Show readings, meanings, radicals, stroke information, frequency, JLPT/school metadata, mastery, and words that contain a character.
- Add/remove kanji from study, review kanji with the same scheduling concepts, and generate or save per-user mnemonics.

### Personalisation and habits

- Keep a separate editable memory notebook for each persona.
- Extract or add durable facts, preferences, goals, and relationship details for future prompts.
- Track daily activity, current streak, best streak, messages sent, deck states, and learning level on the home page.
- Optionally let Kai reach out on a schedule or at random, subject to quiet hours and a dormant-user safeguard.

### Accounts and AI keys

- Register, sign in, and sign out through the app's own bcrypt and signed-cookie authentication.
- Store personal Gemini keys only in browser storage for client-side use.
- Optionally store an encrypted server-side Gemini key for group AI, scheduled outreach, and other background work.
- Configure model choice, automatic fallback, maximum response length, auto-save words, and auto-memory behavior.

## Technology

| Area | Implementation |
| --- | --- |
| Web framework | Next.js 16 App Router with React 19 and TypeScript |
| Styling | Tailwind CSS 4 and shared component primitives |
| Database | Supabase PostgreSQL via Prisma 7 and the `@prisma/adapter-pg` adapter |
| Authentication | bcrypt password hashes plus signed JWT session cookies (`jose`) |
| AI | Google Gemini, from browser-held Bring-Your-Own-Keys(BYOK) keys or an encrypted server key |
| Dictionary | Imported JMdict-derived word data plus generated word forms |
| Push/offline | Web manifest, service worker, and Web Push dependency support |
| Tests | Vitest unit/route tests; ESLint and TypeScript checks |

## Running locally

### Requirements

- Node.js 20 or later
- A PostgreSQL/Supabase database
- A Gemini API key for AI-assisted features

### Setup

```bash
npm install
copy .env.example .env
npx prisma generate
npm run dev
```

Open `http://localhost:3000`.

Set the following values in `.env`; do not commit that file.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | Pooled PostgreSQL connection for the running application |
| `DIRECT_URL` | Direct PostgreSQL connection used by Prisma migration commands |
| `SESSION_SECRET` | Long random secret used to sign the session cookie |
| `ENCRYPTION_KEY` | Base64-encoded 32-byte AES-GCM key for stored server Gemini keys |
| `TRIGGER_SECRET` | Bearer token for protected trigger endpoints |
| `CRON_SECRET` | Bearer token expected from the Vercel cron job |

Useful commands:

```bash
npm run dev                 # development server
npm run build               # production build
npm run lint                # ESLint
npm run typecheck           # TypeScript check
npm run test                # Vitest suite
npm run ci                  # lint + typecheck + tests
npm run import:dictionary   # import dictionary data
npm run restore:flashcards  # restore a flashcard export
```

## Application routes

Public routes:

| Route | Purpose |
| --- | --- |
| `/` | Landing page and product introduction |
| `/login` | Sign-in form |
| `/register` | Account registration form |
| `/offline` | Offline fallback |

Authenticated routes:

| Route | Purpose |
| --- | --- |
| `/home` | Dashboard: level, streak, vocabulary, kanji, due cards, and activity |
| `/chat` | Personal Kai/persona conversation hub and chat creation |
| `/chat/c/[id]` | A selected personal, direct-message, or group conversation |
| `/review` | Vocabulary, kanji, and mixed SRS sessions |
| `/vocab` | Saved word and phrase decks, lookup, search, filters, and card management |
| `/kanji` | Kanji derived from the learner's saved vocabulary |
| `/kanji/[character]` | Detail, mnemonic, and related-vocabulary view for one character |
| `/memory` | Persona-scoped editable memories |
| `/onboarding` | First-run setup flow |
| `/settings` | User profile, AI key, model, and learning configuration |

`src/app/(app)/layout.tsx` supplies the authenticated shell, desktop sidebar, bottom tabs, and mobile header. Navigation definitions live in `src/app/(app)/nav.ts`.

## Core learning flows

### AI response flow

```text
Learner sends a message
  -> UI chooses an available Gemini key and model
  -> Gemini prompt includes persona, recent conversation, relevant memories,
     learning level, and response-format instructions
  -> structured response is parsed and persisted
  -> RichText renders the reply using CachedToken metadata
  -> WordToken/LookupToken exposes lookup, audio, save, and phrase controls
```

AI responses use `CachedToken` metadata from `src/lib/types.ts`:

```ts
type CachedToken = {
  surface: string;
  reading: string;
  romaji: string;
  meaning: string;
  pos: PartOfSpeech;
  dictForm: string;
  words?: CachedToken[]; // component words when this token is a phrase
};
```

`src/lib/gemini.ts` contains client-side prompting, response repair/parsing, word lookup assistance, memory summarisation, proactive-message generation, and kanji mnemonic generation. `src/lib/gemini-server.ts` performs server-side generation when an encrypted key is available.

### Dictionary and phrase flow

```text
Token or manual query
  -> GET /api/dictionary/lookup
  -> find matching Word or the user's Phrase
  -> create a user-scoped Phrase when lookup metadata represents unknown custom text
  -> generate/cache word conjugations when needed
  -> return meanings, forms, and saved-card state
  -> POST /api/flashcards saves a word/form; phrase saving uses the phrase-aware lookup flow
```

`Word` represents reusable dictionary lemmas. `Phrase` represents user-scoped custom or AI-generated expressions. `UserFlashcard` can reference either one.

### Review flow

```text
Review setup
  -> flashcard, kanji, or mixed review endpoint builds a queue
  -> learner reveals a card and chooses a grade
  -> POST review endpoint calls the SRS scheduler
  -> nextReview, interval, repetitions, easeFactor, and status are persisted
```

The scheduling algorithm is implemented in `src/lib/srs.ts`. It is shared conceptually by word/phrase and kanji review routes.

### Outreach flow

```text
Vercel cron or protected trigger
  -> /api/cron/outreach or /api/triggers/kai-opener
  -> runOutreach()
  -> evaluate user mode, inactivity, quiet hours, and ignored streak
  -> generate/persist an appropriate Kai opener where eligible
```

## Data model

The source schema is [prisma/schema.prisma](C:\Projects\NextJs\KaiwaAI\prisma\schema.prisma). Prisma generates the client in `src/generated/prisma/`; application code should use `@/lib/prisma` or `@/generated/prisma/client`.

### Accounts, social graph, and conversations

| Model | Responsibility |
| --- | --- |
| `User` | Account identity, password hash, learner settings, streak/outreach state, and optional encrypted Gemini keys |
| `Persona` | Built-in or user-created AI character, including prompt personality and avatar |
| `Friendship` | Directed pending/accepted relationship between two users |
| `Chat` | A conversation owned by a user; `kind` distinguishes persona, DM, and group chats |
| `ChatMember` | Membership for a human or persona, with invite and hidden state |
| `Message` | Persisted chat content; AI messages can hold English, tokens, and correction JSON |
| `Memory` | User facts scoped to a particular persona or Kai |

### Dictionary, vocabulary, and phrases

| Model | Responsibility |
| --- | --- |
| `Word` | Dictionary lemma, reading, meanings JSON, part of speech, JLPT/frequency, and grammar metadata |
| `WordForm` | Cached inflected/conjugated form of a dictionary word |
| `Phrase` | User-owned custom or AI-generated phrase with source, context, verification, and review flags |
| `UserFlashcard` | Per-user SRS card linked to a word/form or phrase |

Dictionary word IDs come from the imported source. AI-seeded words use negative IDs to avoid collisions. Phrase text is unique per user, so two learners can save the same expression independently.

### Kanji and spaced repetition

| Model | Responsibility |
| --- | --- |
| `Kanji` | Seeded reference data: character, readings, meanings, strokes, grade, frequency, radicals, and level |
| `UserKanji` | A user's per-character SRS state and optional mnemonic |
| `KanjiMnemonic` | Cached AI-generated mnemonic per user/kanji pair |

`FlashcardStatus` has `new`, `learning`, and `known` states. `PartOfSpeech`, `VerbType`, and `AdjectiveType` are Prisma enums declared in the schema.

## API reference

All application APIs are implemented under `src/app/api`. Authenticated endpoints obtain the current user through `src/lib/auth-helpers.ts`.

### Account, activity, and settings

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/auth/register` | `POST` | Create an account and session |
| `/api/auth/login` | `POST` | Authenticate and create a session |
| `/api/auth/logout` | `POST` | Remove the session cookie |
| `/api/activity` | `POST` | Register user activity and advance the streak |
| `/api/stats` | `GET` | Return dashboard totals and progress |
| `/api/settings/name` | `PATCH` | Update display name |
| `/api/settings/password` | `PATCH` | Change password |
| `/api/settings/outreach` | `GET`, `PATCH` | Read/update outreach preferences |
| `/api/settings/server-key` | `GET`, `POST`, `DELETE` | Manage encrypted server Gemini keys |

### Chat, people, personas, and memories

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/groups` | `GET`, `POST` | List/create conversations |
| `/api/groups/[id]` | `GET`, `PATCH`, `DELETE` | Fetch, update, or delete one conversation |
| `/api/groups/[id]/messages` | `POST`, `DELETE` | Send or delete messages and persist AI replies |
| `/api/groups/[id]/hide` | `POST`, `DELETE` | Hide/unhide a conversation for the current member |
| `/api/groups/[id]/proactive` | `POST` | Request an AI proactive response in a conversation |
| `/api/friends` | `GET`, `POST` | List friends/invites or send an invite |
| `/api/friends/[id]` | `PATCH`, `DELETE` | Accept/update or remove a friendship |
| `/api/invites` | `GET` | List pending invitations |
| `/api/invites/[id]` | `PATCH`, `DELETE` | Respond to or remove an invite |
| `/api/personas` | `GET`, `POST` | List/create personas |
| `/api/personas/[id]` | `PATCH`, `DELETE` | Update/delete a persona |
| `/api/memory` | `GET`, `POST` | List/create persona-scoped memories |
| `/api/memory/[id]` | `PATCH`, `DELETE` | Edit/delete a memory |
| `/api/chat/context` | `GET` | Load contextual chat information |

### Dictionary, flashcards, and review

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/dictionary/lookup` | `GET` | Find/create phrase or dictionary lookup result and saved state |
| `/api/flashcards` | `GET`, `POST` | List cards or save a word/form card |
| `/api/flashcards/[id]` | `PATCH`, `DELETE` | Change card state or delete it |
| `/api/flashcards/review` | `GET`, `POST` | Build/review a vocabulary queue |
| `/api/review/mixed` | `GET` | Build a combined vocabulary and kanji queue |
| `/api/kanji` | `GET` | List kanji represented in saved vocabulary |
| `/api/kanji/[character]` | `GET` | Fetch kanji detail and related vocabulary |
| `/api/kanji/[character]/learn` | `POST`, `DELETE` | Add/remove a character from study |
| `/api/kanji/review` | `GET`, `POST` | Build/review a kanji queue |
| `/api/kanji/[character]/mnemonic` | `PATCH` | Update a mnemonic |
| `/api/kanji/[character]/mnemonic/save` | `POST` | Save a generated mnemonic |
| `/api/kanji/mnemonics/bulk` | `POST` | Generate mnemonics in bulk |
| `/api/kanji/debug`, `/api/kanji/test` | `GET` | Development/debug helpers |

### Background and protected triggers

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/cron/outreach` | `GET` | Vercel Cron entry point for outreach processing |
| `/api/triggers/kai-opener` | `POST` | Protected manual/scheduler Kai opener trigger |

## Source map

```text
src/
  app/
    (auth)/             registration and login
    (app)/              authenticated pages, navigation, and feature UI
    api/                route handlers grouped by feature
    components/         cross-page guards and banners
    layout.tsx          root fonts, metadata, viewport, service worker
    globals.css         design tokens and global styles
  lib/
    prisma.ts           Prisma/PostgreSQL client
    session.ts          cookie JWT lifecycle
    crypto.ts           AES-GCM secret encryption
    gemini*.ts          client/server Gemini integration
    group-chat.ts       group transcript and persona-reply helpers
    srs.ts              review scheduling
    kanji-*.ts          kanji lookup, extraction, and mnemonics
    conjugation-generator.ts  word form generation and lookup
    personas*.ts        persona seeds, prompts, and persistence helpers
    outreach*.ts        eligibility and scheduled outreach execution
    types.ts            shared response/token/correction types
  generated/prisma/     generated Prisma client; do not hand-edit
prisma/
  schema.prisma         declarative data model
  migrations/           production migration baseline and future migrations
scripts/                dictionary import, flashcard restore, and maintenance tools
public/                 icons, PWA assets, and database import assets
```

Key UI files:

| Path | Responsibility |
| --- | --- |
| `src/app/(app)/chat/ChatHub.tsx` | Chat list and personal-conversation hub |
| `src/app/(app)/chat/WordToken.tsx` | Tappable word/phrase popup and save controls |
| `src/app/(app)/chat/RichText.tsx` | Token-aware message rendering |
| `src/app/(app)/groups/[id]/GroupChatClient.tsx` | Group/DM conversation experience |
| `src/app/(app)/review/ReviewClient.tsx` | Session setup, card display, grades, and keyboard controls |
| `src/app/(app)/vocab/VocabClient.tsx` | Word/phrase deck browser and card actions |
| `src/app/(app)/kanji/KanjiClient.tsx` | Kanji collection, filters, and mastery view |
| `src/app/(app)/kanji/[character]/KanjiDetailClient.tsx` | Kanji detail, mnemonics, and vocabulary examples |
| `src/app/(app)/memory/MemoryClient.tsx` | Persona memory notebook |
| `src/app/(app)/settings/SettingsClient.tsx` | User, AI-key, and learning settings tabs |
| `src/app/(app)/home/HomeClient.tsx` | Dashboard and activity entry point |

## Security and data handling

- Passwords are hashed with bcrypt; plaintext passwords are never persisted.
- Session data is signed and stored in an HTTP cookie through `src/lib/session.ts`.
- The optional server Gemini key is encrypted before storage using AES-256-GCM in `src/lib/crypto.ts`.
- Personal browser Gemini keys are managed client-side by `src/lib/api-keys.ts`.
- Route handlers verify the signed-in user before accessing user-scoped data.
- Phrase, flashcard, memory, conversation, friendship, and kanji progress queries are scoped to the authenticated user.
- Keep `.env`, database exports, and production connection strings out of source control.

## Database migrations and production

The project now has one squashed baseline migration in [prisma/migrations/000000000000_squashed_migrations/migration.sql](C:\Projects\NextJs\KaiwaAI\prisma\migrations\000000000000_squashed_migrations\migration.sql). It represents the current production schema.

For future schema changes:

```bash
# Development database only
npx prisma migrate dev --name describe_the_change

# CI/CD or production deployment
npx prisma migrate deploy
```

Do not run `prisma migrate dev`, `prisma migrate reset`, or `prisma db push` against production. Back up production before destructive or data-transforming changes. Commit every new migration together with its `schema.prisma` change.

## Testing and maintenance

- Unit tests live next to the corresponding libraries and API routes as `*.test.ts` files.
- `vitest.config.ts` configures the test runner and project stubs.
- `scripts/import-dictionary.ts` imports dictionary source data.
- `scripts/restore-flashcards.ts` restores exported flashcards.
- `scripts/migrate-to-phrases.ts` is a legacy data migration helper; the active schema already supports phrases directly.
- `scripts/check-flashcards.ts` is a maintenance/diagnostic helper.

## Contribution conventions

1. Keep TypeScript strict and add tests for behavior changes where practical.
2. Reuse the shared UI primitives in `src/app/(app)/ui.tsx` for consistent visual language.
3. Keep database changes additive when possible, especially for deployed data.
4. Run the relevant test, lint, and typecheck commands before merging.
5. Do not edit generated Prisma files by hand; update the schema and regenerate instead.
