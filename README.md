# KaiwaAI 会話

**Make a friend who only speaks Japanese.**

KaiwaAI is an AI companion for learning Japanese through real conversation.
You chat with **Kai**, a warm, playful tutor who speaks to you at your level,
gently introduces new words, and remembers you between sessions. Every word she
says is tappable for an instant reading, romaji, and meaning — and the words you
save become flashcards that resurface with spaced repetition. The more you talk,
the more vocabulary Kai unlocks and reuses, so the language grows with you.

It's built on two proven ideas: **comprehensible input** (learning by
understanding language just above your level) and **spaced repetition** (reviewing
words right before you'd forget them) — wrapped in a friendship, not a worksheet.

## Features

- **Bilingual chat with Kai** — she speaks Japanese at your JLPT level and
  switches to English when you ask a question or need help. Powered by Google
  Gemini with structured output, so each reply comes with a per-word breakdown.
- **Tap-to-translate** — tap any Japanese word for its reading, romaji, meaning,
  and part of speech. One popup at a time, punctuation excluded.
- **Tap-to-add flashcards + word lookup** — save any word with a tap, or look up
  any word (Japanese or English) and add it to your deck.
- **SRS review (SM-2)** — due-card sessions and fully custom sessions (by status,
  count, or study-ahead), with flip cards, keyboard shortcuts, and audio.
- **Vocab deck** — searchable, filterable, grouped by part of speech, with
  per-word progress rings and a detail sheet (reset, mark known, delete).
- **Kai's Memory** — a diary of durable facts Kai remembers about you, editable
  anytime, injected into the conversation so she stays personal.
- **Kai messages first** — opt-in outreach on a schedule or at random. Kai
  notices if you've been away and her mood shifts (cheerful → wistful → sad);
  ignored too long, she gently stops until you return.
- **Model control** — switch Gemini models from the chat header, add multiple API
  keys with automatic rotation on rate limits, and auto-fallback between models.
- **PWA** — installable on your phone, offline-aware app shell.
- **Friendly, mobile-first design** — a calm, playful aesthetic built around Kai.

## Tech stack

- **Next.js** (App Router, TypeScript) + **Tailwind CSS v4**
- **Prisma 7** + **SQLite** (via the `better-sqlite3` driver adapter)
- **Google Gemini** — **BYOK** (bring-your-own-key); the key stays in your
  browser by default, with optional encrypted server-side storage for background
  features
- **Vitest** for tests
- **web-push** + Vercel Cron for scheduled outreach (in progress)

## Getting started

```bash
npm install

# set up environment
cp .env.example .env
# then fill in SESSION_SECRET, ENCRYPTION_KEY, etc. (see below)

# create the database
npx prisma migrate dev

npm run dev
```

Open [http://localhost:3000](http://localhost:3000), create an account, and add
your **Gemini API key** in Settings (get a free one from
[Google AI Studio](https://aistudio.google.com/app/apikey)).

### Environment variables

| Variable | Purpose |
|---|---|
| `DATABASE_URL` | SQLite connection (e.g. `file:./dev.db`) |
| `SESSION_SECRET` | Signs session cookies — use a long random string |
| `ENCRYPTION_KEY` | 32-byte base64 key for encrypting stored secrets at rest |
| `TRIGGER_SECRET` | Bearer token for manual outreach trigger calls |
| `CRON_SECRET` | Bearer token Vercel Cron sends to scheduled routes |

Generate keys:

```bash
# ENCRYPTION_KEY
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

## Scripts

```bash
npm run dev      # development server
npm run build    # production build
npm test         # run the test suite (Vitest)
npm run lint     # lint
node scripts/gen-icons.mjs   # regenerate PWA icons from the Kai mark
```

## Privacy

By default your Gemini API key lives **only in your browser** and calls Google
directly — it's never sent to the server. Background features (Kai messaging you
first, summaries) are opt-in and store the key **encrypted at rest** (AES-256-GCM).
Your conversations, flashcards, and memories are stored in the app's database.

## Deploying

Targeting **Vercel**. Note: SQLite does not work on Vercel's serverless runtime —
the database must move to a hosted store (e.g. **Turso**/libSQL, or Postgres)
before deploying. Vercel Cron drives Kai's scheduled outreach via
`vercel.json` → `/api/cron/outreach`.

## Documentation

See the `Documentation/` folder:

- **GOALS.md** — vision, features, and the learning model
- **SCHEMA.md** — data model and API reference
- **MEMORY.md** — the persistent-memory architecture
- **Design.md** — design philosophy, the Kai mascot, and UI conventions

---

KaiwaAI — made for people who want a friend, not a teacher. <span>またね</span>
