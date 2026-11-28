# KaiwaAI

KaiwaAI is a Japanese-learning web app built around conversation. Learners chat with Kai or other AI personas, tap Japanese in responses for explanations, save words and phrases, review with spaced repetition, learn associated kanji, practise sentence construction and conjugation, and manage the facts each persona remembers.

This README is the project's single source of truth. It describes the current application, its code structure, API, data model, and operational workflow.

## What the app does

### Conversation-led learning

- Chat with the built-in Kai persona or user-created personas.
- Use personal, direct messages and group conversations containing people and AI personas.
- Receive Japanese-forward replies with an English gloss, contextual word tokens, and optional grammar feedback.
- Tap a token to view its reading, meaning, conjugations, pronunciation control, and save state.
- Save whole multi-word expressions as phrases; phrase popups can expose their component words.
- Start a conversation with a selected persona, invite people, hide chats, and remove messages when permitted.
- Optionally meet another learner in an ephemeral stranger room (`/chat/strangers`), behind `STRANGER_CHAT_ENABLED`.

### Vocabulary, phrases, and review

- Look up Japanese through the dictionary UI or token popups.
- Save dictionary words, individual inflected forms, and custom/AI-generated phrases as flashcards.
- Browse saved items on `/vocab` using separate **Words** and **Phrases** tabs, text search, part-of-speech groups, status filters, progress indicators, and a detail sheet.
- Review vocabulary, kanji, or a mixed queue. Sessions are driven by **FSRS v4** scheduling and by named session plans (**Reviews Only**, **Casual Drip**, **Active Intake**, **All New**, **Trouble Spots**) rather than raw pool/ratio controls.
- Grade a card Again, Hard, Good, or Easy. The scheduler updates stability, difficulty, interval and next review date.
- Practice beyond flashcards: `/review/construction` (sentence assembly over a 27-topic grammar curriculum) and `/review/conjugation` (recognition → understanding → transformation → application over the form table). Both keep per-topic and per-pattern mastery in their own tables and adapt the next exercise to it.
- Daily quests surface these modes with live counts on `/review`.

### Kanji learning

- Derive a learner's kanji list from saved vocabulary.
- Show readings, meanings, radicals, stroke information, frequency, JLPT/school metadata, mastery, and words that contain a character.
- Add/remove kanji from study, organise them in folders (including Heisig lessons), review kanji with the same scheduling concepts, and generate or save per-user mnemonics.
- Paste many kanji at once from `/kanji/import`.

### Focus Guard (app interception)

- Block chosen apps on Android through the Capacitor `app-blocker` plugin (`src/plugins/app-blocker`).
- Choose a session plan, a card goal, and an unlock duration in **Interception Rules**.
- Review in `/app-lock` to earn the unlock; skipped cards, retried cards and offline grades are queued rather than silently lost.
- Use the once-a-day **Emergency pass**, validated server-side so clearing local storage cannot bypass the cooldown.

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
| Scheduling | FSRS v4 (`src/lib/fsrs/*`); `src/lib/srs.ts` remains as the legacy SM-2 fallback and shared `ReviewGrade` type |
| AI | Google Gemini, from browser-held Bring-Your-Own-Keys (BYOK) keys or an encrypted server key |
| Dictionary | Imported JMdict-derived word data plus generated word forms |
| Realtime | Pusher private channels for group chat; polling for stranger rooms |
| Mobile | Capacitor Android shell with the app-blocker plugin |
| Push/offline | Web manifest, service worker, and Web Push (`web-push`) |
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
| `CRON_SECRET` | Bearer token expected by scheduled background work |
| `TRIGGER_SECRET` | Bearer token for protected trigger endpoints |
| `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` | Server credentials for realtime group chat |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | Browser-side Pusher channel subscription |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY` | Optional Web Push notification keys |
| `CAPACITOR_SERVER_URL` | Android shell target for `cap:sync` / live reload |
| `NEXT_PUBLIC_APP_BLOCKER_DEBUG` | Verbose logging for the app-blocker plugin |
| `STRANGER_CHAT_ENABLED` | Optional. `true` (or `1`) exposes random stranger chat — the **Meet** tab in `/chat` and `/chat/strangers`; unset or any other value hides the tab and returns 404 from `/api/stranger/*`. Requires the `Stranger*` tables from `npx prisma migrate deploy` |

Useful commands:

```bash
npm run dev                 # development server
npm run build               # production build
npm run lint                # ESLint
npm run typecheck           # TypeScript check
npm run test                # Vitest suite
npm run ci                  # lint + typecheck + tests
npm run migrate:fsrs        # SM-2 → FSRS state converter (idempotent)
```

Maintenance scripts (read-only unless a flag says otherwise):

```bash
npx tsx scripts/audit-card-timing.ts     # scheduling sanity report
npx tsx scripts/backfill-card-status.ts  # recompute status; --apply to write
npx tsx scripts/fix-runaway-intervals.ts # repair over-long intervals
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
| `/chat` | One inbox for AI personas, friends and groups: actionable friend requests, a collapsible **People** group (friends, add by email, personas, stranger matching) and the matching state as a row, with a compose sheet for starting new chats |
| `/chat/personas` | Redirects to `/chat?panel=personas` — persona editing lives in the People sheet |
| `/friends` | Redirects to `/chat?panel=people` — friends, requests and invites live in the inbox |
| `/chat/c/[id]` | A selected personal, direct-message, or group conversation |
| `/chat/strangers` | Stranger-chat lobby (matchmaking, waiting state) |
| `/chat/strangers/[sessionId]` | One ephemeral stranger room |
| `/review` | Quest gallery: vocabulary, kanji, mixed, construction and conjugation practice |
| `/review/construction` | Sentence Construction — endless stream over the grammar curriculum |
| `/review/conjugation` | Fill the blank — conjugation practice by pattern |
| `/vocab` | Saved word and phrase decks, lookup, search, filters, and card management |
| `/kanji` | Kanji derived from the learner's saved vocabulary, with folders |
| `/kanji/[character]` | Detail, mnemonic, and related-vocabulary view for one character |
| `/kanji/import` | Bulk paste import of many kanji |
| `/app-lock` | Focus Guard interception session |
| `/flashcard-complete` | Post-session summary |
| `/study` | Standalone study entry point |
| `/memory` | Persona-scoped editable memories |
| `/onboarding` | First-run setup flow |
| `/settings` | User profile, AI key, model, and learning configuration |
| `/settings/app-blocker` | Interception Rules, session plans and app-blocker setup |

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

`src/lib/gemini.ts` is a barrel over `src/lib/gemini/*` (`chat`, `lookup`, `summary`, `mnemonics`, `sanitizers`, `types`): client-side prompting, response repair/parsing, word lookup assistance, memory summarisation, proactive-message generation, and kanji mnemonic generation. `src/lib/gemini-server.ts` performs server-side generation when an encrypted key is available.

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

`Word` represents reusable dictionary lemmas. `Phrase` represents user-scoped custom or AI-generated expressions. `UserFlashcard` can reference either one, and per-user corrections (`readingOverride`, `meaningOverride`) stay on the card so the shared `Word` row is never mutated.

### Review flow

```text
Review setup (quest, Focus Guard plan, or custom session)
  -> flashcard, kanji, or mixed review endpoint builds a queue
  -> learner reveals a card and chooses a grade
  -> POST review endpoint calls the FSRS scheduler
  -> strength/difficulty, nextReview, interval, repetitions and status are persisted
```

Scheduling lives in `src/lib/fsrs/`: `scheduler.ts` (the algorithm), `apply-review.ts` (shared grade application), `converter.ts` (SM-2 → FSRS state), `fallback.ts`, `config.ts` and `state.ts`. Review lifecycle and leech rules live in `src/lib/review/` (`lifecycle.ts`, `leech.ts`, `intake.ts`, `composition.ts`, `session-plan.ts`, `session-ready.ts`).

### Practice flows

```text
/review/construction
  -> lib/grammar/stream.ts picks the next exercise from mastery
  -> assembly / particle / completion / transformation / production exercise
  -> POST /api/grammar/mastery records the attempt

/review/conjugation
  -> lib/review/conjugation.ts builds the form question and distractors
  -> recognition -> understanding -> transformation -> application
  -> POST /api/conjugation/mastery records the attempt per dimension
```

### Focus Guard flow

```text
Android blocks an app
  -> native plugin opens /app-lock with the chosen session plan
  -> GET /api/review/mixed?fill=1 cascades: due -> new (within quota) -> any studied card
  -> grades post to the review endpoints; unreadable cards can be skipped
  -> goal met -> unlock, or POST /api/app-lock/emergency-pass (1/day, server-checked)
```

### Proactive Kai messages

```text
POST /api/groups/[id]/proactive
  -> eligibility from mood, quiet hours and consecutive ignored messages
  -> generate/persist an opener where eligible
```

## Data model

The source schema is [prisma/schema.prisma](C:\Projects\NextJs\KaiwaAI\prisma\schema.prisma). Prisma generates the client in `src/generated/prisma/`; application code should use `@/lib/prisma` or `@/generated/prisma/client`.

### Accounts, social graph, and conversations

| Model | Responsibility |
| --- | --- |
| `User` | Account identity, password hash, learner settings, streak/outreach state, emergency-pass timestamp, and optional encrypted Gemini keys |
| `Persona` | Built-in or user-created AI character, including prompt personality, Kai modes and avatar |
| `Friendship` | Directed pending/accepted relationship between two users |
| `Chat` | A conversation owned by a user; `kind` distinguishes persona, DM, and group chats, plus mood, summary and active Kai mode |
| `ChatMember` | Membership for a human or persona, with invite, hidden and nickname state |
| `Message` | Persisted chat content; AI messages can hold English, tokens, correction JSON, and reply-to previews |
| `Memory` | User facts scoped to a persona or conversation, with supersede links |
| `PushSubscription` | Per-device Web Push subscription |

### Dictionary, vocabulary, and phrases

| Model | Responsibility |
| --- | --- |
| `Word` | Dictionary lemma, reading, meanings JSON, part of speech, JLPT/frequency, and grammar metadata |
| `WordForm` | Cached inflected/conjugated form of a dictionary word |
| `Phrase` | User-owned custom or AI-generated phrase with source, context, verification, and review flags |
| `UserFlashcard` | Per-user SRS card linked to a word/form or phrase, plus `kind`, notes, overrides and source context |

Dictionary word IDs come from the imported source. AI-seeded words use negative IDs to avoid collisions. Phrase text is unique per user, so two learners can save the same expression independently.

### Kanji and spaced repetition

| Model | Responsibility |
| --- | --- |
| `Kanji` | Seeded reference data: character, readings, meanings, strokes, grade, frequency, radicals, Heisig data and level |
| `KanjiGroup` / `KanjiGroupEntry` | User-created folders (including Heisig lessons) and their ordered members |
| `UserKanji` | A user's per-character SRS state, custom meaning and optional mnemonic |
| `KanjiMnemonic` | Cached AI-generated mnemonic per user/kanji pair |
| `ConjugationMastery` | Per-user, per-pattern conjugation practice counts and per-dimension evidence |
| `GrammarMastery` | Per-user, per-topic sentence-construction counts |

### Stranger chat

| Model | Responsibility |
| --- | --- |
| `StrangerQueueEntry` | One waiting user per row (unique `userId`), with expiry |
| `StrangerSession` | A matched room: status, end reason, idle and hard expiry |
| `StrangerParticipant` | One side of a room, with alias, read/leave state; a partial unique index keeps one live room per user |
| `StrangerMessage` | Text messages inside a room |
| `StrangerBlock` / `StrangerReport` | Safety foundation honoured by matchmaking |

`FlashcardStatus` has `new`, `learning`, and `known` states. `CardKind` distinguishes Words from Phrases. `PartOfSpeech`, `VerbType`, and `AdjectiveType` are Prisma enums declared in the schema.

## API reference

All application APIs are implemented under `src/app/api`. Authenticated endpoints obtain the current user through `src/lib/auth-helpers.ts`; only `auth/login`, `auth/logout` and `auth/register` are unauthenticated.

### Account, activity, and settings

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/auth/register` | `POST` | Create an account and session |
| `/api/auth/login` | `POST` | Authenticate and create a session |
| `/api/auth/logout` | `POST` | Remove the session cookie |
| `/api/activity` | `POST` | Register user activity and advance the streak |
| `/api/stats` | `GET` | Return dashboard totals and progress |
| `/api/settings/name` | `PATCH` | Update display name |
| `/api/settings/password` | `PATCH` | Change password (revokes other sessions) |
| `/api/settings/server-key` | `GET`, `POST`, `DELETE` | Manage encrypted server Gemini keys |
| `/api/onboarding/welcome` | `POST` | Seed the first-run welcome state |
| `/api/learning/reset` | `POST`, `DELETE` | Reset learning progress |

### Chat, people, personas, and memories

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/groups` | `GET`, `POST` | List/create conversations |
| `/api/groups/[id]` | `GET`, `PATCH`, `DELETE` | Fetch, update, or delete one conversation |
| `/api/groups/[id]/messages` | `POST`, `DELETE` | Send or delete messages and persist AI replies |
| `/api/groups/[id]/hide` | `POST`, `DELETE` | Hide/unhide a conversation for the current member |
| `/api/groups/[id]/leave` | `DELETE` | Leave or delete for the current member (owner hands the group over) |
| `/api/groups/[id]/members` | `GET`, `POST` | List or invite members |
| `/api/groups/[id]/members/[memberId]` | `PATCH`, `DELETE` | Update or remove one member |
| `/api/groups/[id]/mode` | `PATCH` | Switch the active Kai mode |
| `/api/groups/[id]/proactive` | `POST` | Request an AI proactive response in a conversation |
| `/api/groups/[id]/kai` | `POST` | Summon Kai into a 1:1 human DM |
| `/api/groups/[id]/summary` | `POST` | Refresh the rolling conversation summary |
| `/api/chat/context` | `GET` | Load contextual chat information |
| `/api/friends` | `GET`, `POST` | List friends/invites or send a request |
| `/api/friends/[id]` | `PATCH`, `DELETE` | Accept/update or remove a friendship |
| `/api/invites` | `GET` | List pending invitations |
| `/api/invites/[id]` | `PATCH`, `DELETE` | Respond to or remove an invite |
| `/api/personas` | `GET`, `POST` | List/create personas |
| `/api/personas/[id]` | `PATCH`, `DELETE` | Update/delete a persona |
| `/api/memory` | `GET`, `POST` | List/create persona-scoped memories |
| `/api/memory/[id]` | `PATCH`, `DELETE` | Edit/delete a memory |
| `/api/memory/bulk` | `POST` | Save several extracted memories at once |
| `/api/pusher/auth` | `POST` | Authorise a private group channel for an accepted member |

### Dictionary, flashcards, and review

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/dictionary/lookup` | `GET` | Find/create phrase or dictionary lookup result and saved state |
| `/api/dictionary/enrich` | `GET`, `POST` | Dictionary enrichment helpers |
| `/api/flashcards` | `GET`, `POST` | List cards or save a word/form card |
| `/api/flashcards/[id]` | `PATCH`, `DELETE` | Change card state, overrides or delete it |
| `/api/flashcards/review` | `GET`, `POST` | Build/review a vocabulary queue |
| `/api/review/mixed` | `GET` | Build a combined vocabulary and kanji queue (`fill=1` for Focus Guard) |
| `/api/review/composition` | `GET` | Projected session mix (new vs review, kanji due) |
| `/api/review/forge-summary` | `GET` | Practice-mode counts and progress for the quest gallery |
| `/api/kanji` | `GET` | List kanji represented in saved vocabulary |
| `/api/kanji/[character]` | `GET` | Fetch kanji detail and related vocabulary |
| `/api/kanji/[character]/learn` | `POST`, `DELETE` | Add/remove a character from study |
| `/api/kanji/review` | `GET`, `POST` | Build/review a kanji queue |
| `/api/kanji/coverage` | `GET` | Kanji coverage of the learner's deck |
| `/api/kanji/[character]/mnemonic` | `PATCH` | Update a mnemonic |
| `/api/kanji/[character]/mnemonic/save` | `POST` | Save a generated mnemonic |
| `/api/kanji/mnemonics/bulk` | `POST` | Generate mnemonics in bulk |
| `/api/kanji/groups` | `GET`, `POST` | List/create kanji folders |
| `/api/kanji/groups/[groupId]` | `PATCH`, `DELETE` | Update/delete a folder |
| `/api/kanji/groups/[groupId]/entries` | `GET`, `POST`, `DELETE` | Add/remove characters in a folder |
| `/api/grammar/mastery` | `GET`, `POST` | Sentence-construction mastery |
| `/api/conjugation/mastery` | `GET`, `POST` | Conjugation-pattern mastery |
| `/api/quests/generate` | `POST` | Build daily quests |
| `/api/app-lock/emergency-pass` | `POST` | Server-validated 1/day Focus Guard unlock |

### Stranger chat

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/stranger/queue` | `POST` | Join/dequeue matchmaking |
| `/api/stranger/online` | `GET` | Lobby counts |
| `/api/stranger/sessions/[id]` | `GET` | Read one room |
| `/api/stranger/sessions/[id]/messages` | `POST` | Send a message |
| `/api/stranger/sessions/[id]/leave` | `POST` | Skip or leave |

### Diagnostics

| Endpoint | Methods | Purpose |
| --- | --- | --- |
| `/api/debug/fsrs-state` | `GET` | Runtime FSRS parameters and per-card state inspection (own cards only) |

## Source map

```text
src/
  app/
    (auth)/             registration and login
    (app)/              authenticated pages, navigation, and feature UI
    api/                route handlers grouped by feature
    app-lock/           Focus Guard session page
    components/         cross-page guards and banners
    layout.tsx          root fonts, metadata, viewport, service worker
    globals.css         design tokens and global styles
  lib/
    prisma.ts           Prisma/PostgreSQL client
    session.ts          cookie JWT lifecycle
    auth-helpers.ts     current-user resolution for route handlers
    crypto.ts           AES-GCM secret encryption
    gemini.ts, gemini/  client-side Gemini integration (barrel + modules)
    gemini-server.ts    server-side Gemini with the encrypted key
    group-chat.ts       group transcript and persona-reply helpers
    fsrs/               FSRS v4 scheduler, review application, converter
    review/             lifecycle, leech, intake, composition, session plans,
                        practice helpers and breakdowns
    grammar/            sentence-construction curriculum, exercises, stream
    stranger/           matchmaking, aliases, lazy cleanup
    kanji-mnemonic/     mnemonic prompt, context, storage
    srs.ts              legacy SM-2 scheduler and shared ReviewGrade type
    session-composer.ts learning-pool composition
    types.ts            shared response/token/correction types
  plugins/app-blocker/  Capacitor plugin for Focus Guard
  generated/prisma/     generated Prisma client; do not hand-edit
prisma/
  schema.prisma         declarative data model
  migrations/           squashed baseline plus dated migrations
scripts/                word-form regeneration, FSRS conversion and card audits
public/                 icons, PWA assets, and database import assets
```

Key UI files:

| Path | Responsibility |
| --- | --- |
| `src/app/(app)/chat/InboxList.tsx` | Conversation rows, search row, Kai hero and empty state (shared by phone hub and rail) |
| `src/app/(app)/chat/ChatRail.tsx` | Desktop rail: pinned search, requests, matching row, inbox and People |
| `src/app/(app)/chat/PeopleSheet.tsx` | People sheet: requests, friends, add-by-email and persona editing (management only) |
| `src/app/(app)/chat/NewChatSheet.tsx` | New chat: message a friend or persona, message request by email, group creation, roleplay quest |
| `src/app/(app)/chat/RequestsRow.tsx` | One summary row for pending friend requests and group invites |
| `src/app/(app)/chat/MeetRow.tsx` | Meet-someone-new row at the end of the conversation list |
| `src/app/(app)/chat/InboxProvider.tsx` | One inbox/people/queue instance for the whole `/chat` subtree |
| `src/app/(app)/chat/ChatHub.tsx` | Phone hub shell and the desktop empty pane |
| `src/app/(app)/chat/WordToken.tsx` | Tappable word/phrase popup and save controls |
| `src/app/(app)/chat/RichText.tsx` | Token-aware message rendering |
| `src/app/(app)/chat/strangers/` | Lobby, room and gallery UI for stranger chat |
| `src/app/(app)/groups/[id]/GroupChatClient.tsx` | Group/DM conversation experience |
| `src/app/(app)/review/QuestGallery.tsx` | Review-mode cards with live counts |
| `src/app/(app)/review/ReviewClient.tsx` | Session setup, card display, grades, and keyboard controls |
| `src/app/(app)/review/construction/` | Sentence Construction page and drill components |
| `src/app/(app)/review/conjugation/` | Fill the blank page and drill components |
| `src/app/(app)/vocab/VocabClient.tsx` | Word/phrase deck browser and card actions |
| `src/app/(app)/kanji/KanjiClient.tsx` | Kanji collection, filters, folders and mastery view |
| `src/app/(app)/kanji/[character]/KanjiDetailClient.tsx` | Kanji detail, mnemonics, and vocabulary examples |
| `src/app/(app)/settings/app-blocker/` | Interception Rules, session plans and Focus Guard status |
| `src/app/(app)/memory/MemoryClient.tsx` | Persona memory notebook |
| `src/app/(app)/settings/SettingsClient.tsx` | User, AI-key, and learning settings tabs |
| `src/app/(app)/home/KaiRoomClient.tsx` | Kai's Room dashboard and activity entry point |
| `src/app/app-lock/page.tsx` | Focus Guard session, grade retry queue and emergency pass |

## Security and data handling

- Passwords are hashed with bcrypt; plaintext passwords are never persisted.
- Session data is signed and stored in an HTTP cookie through `src/lib/session.ts`; `User.tokenVersion` revokes other sessions when a password changes.
- Login and registration are rate limited (`src/lib/rate-limiter.ts`).
- The optional server Gemini key is encrypted before storage using AES-256-GCM in `src/lib/crypto.ts`.
- Personal browser Gemini keys are managed client-side by `src/lib/api-keys.ts`.
- Route handlers verify the signed-in user before accessing user-scoped data; foreign `userId` query parameters are rejected.
- Phrase, flashcard, memory, conversation, friendship, kanji progress and mastery queries are scoped to the authenticated user.
- Shared `Word` and `Kanji` rows are treated as immutable reference data: per-user corrections live on `UserFlashcard` / `UserKanji`.
- Pusher private channels are authorised per accepted member in `/api/pusher/auth`.
- Keep `.env`, database exports, and production connection strings out of source control.

## Database migrations and production

`prisma/migrations/000000000000_squashed_migrations` is the baseline that represents the production schema; every later change adds its own dated migration folder (currently 21 of them, latest `20261126220300_add_emergency_pass_tracking`). `npx prisma migrate status` reports the database as up to date when everything is applied.

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
- `scripts/regenerate-word-csvs.mjs` rebuilds the generated word form CSVs; `scripts/gen-icons.mjs` regenerates the PWA icons.
- `scripts/migrate-to-fsrs.ts` converts SM-2 state to FSRS (idempotent).
- `scripts/audit-card-timing.ts`, `scripts/backfill-card-status.ts` and `scripts/fix-runaway-intervals.ts` are diagnostic/repair tools.

## Contribution conventions

1. Keep TypeScript strict and add tests for behavior changes where practical.
2. Reuse the shared UI primitives in `src/app/(app)/ui.tsx` for consistent visual language.
3. Keep database changes additive when possible, especially for deployed data.
4. Run the relevant test, lint, and typecheck commands before merging.
5. Do not edit generated Prisma files by hand; update the schema and regenerate instead.
