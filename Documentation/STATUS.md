# KaiwaAI — Build Status

A running snapshot of what's built, what's pending, and how it fits together.
Read this first when picking up the project in a new session.

_Last updated: after the home dashboard + real streaks._

## Stack (as built)

- **Next.js** (App Router, TypeScript) + **Tailwind v4**
- **Prisma 7 + PostgreSQL** via `@prisma/adapter-pg`. Hosted on **Supabase**.
  - `DATABASE_URL` = Supabase **pooled** (port 6543) — runtime
  - `DIRECT_URL` = Supabase **direct** (port 5432) — migrations
- **Google Gemini**, BYOK. Default key lives client-side (localStorage); an
  opt-in **encrypted** copy can live server-side for background features.
- **Vitest** (71 tests passing)
- **PWA** (manifest, service worker, icons) + **Vercel Cron** for outreach
- Deploy target: **Vercel**

## What works (done)

- **Auth**: register/login/logout (bcrypt + signed-JWT cookie via `jose`).
  Guards verify the user still exists in the DB (stale cookies are logged out).
  Logout clears the chat cache.
- **Chat**: bilingual Kai (Gemini structured output → reply + english + tokens),
  playful persona, message-app UI (avatars, grouping, day dividers), paginated
  + cached loading (25/page, lazy older on scroll-up), 3-dot menu (clear /
  compact), model switcher, char limit.
- **Tap-to-translate**: tap a Japanese word → reading/romaji/meaning/POS popover
  (one open at a time; punctuation/English not tappable). **Tap-to-add** saves
  a flashcard.
- **Word lookup**: search any word via Gemini and add it.
- **SRS review (SM-2)**: due sessions + custom sessions (status/count/study-
  ahead), flip cards, keyboard shortcuts, audio (speechSynthesis), end summary.
- **Vocab deck**: search, filters, POS grouping, progress rings, detail sheet
  (reset / mark-known / delete), audio.
- **Kai's Memory**: diary page; view/add/delete facts (`/api/memory`).
- **Home dashboard** (`/home`): greeting, streak card, stat cards, vocab bar,
  quick actions. Registers daily activity on load.
- **Streaks**: real, on `User` (`streakCount`/`streakBestCount`/`lastStreakDay`).
  Advances on chat or app open; shown in nav + home.
- **Models/keys**: multiple API keys with rotation (client) + auto model
  fallback; same multi-key rotation server-side (encrypted JSON array).
- **Kai outreach ("messages first")**: settings (off/scheduled/random + quiet
  hours), mood ladder (cheerful→…→dormant) based on `consecutiveIgnored`,
  trigger (`/api/triggers/kai-opener`) + Vercel cron (`/api/cron/outreach`) →
  `runOutreach()` generates a personalized opener server-side. **Message is
  saved; it appears on next open.**

## Pending / not built

1. **Push notifications** — the missing half of "Kai messages you offline".
   VAPID keys generated, `web-push` installed, service worker exists, but:
   no subscription storage, no SW push handler, no send-on-cron. This is the
   next big piece. (iOS requires the PWA be installed to home screen, 16.4+.)
2. **Server/local key sync** — changing client keys doesn't auto-refresh the
   encrypted server copy; user must re-toggle background mode.
3. **Memory depth** (post-MVP, see MEMORY.md): day/month summaries, reconciliation,
   temporal-reference resolution, embedding fallback.
4. **Exposure-based reinforcement**: `exposures` is tracked but doesn't yet nudge
   mastery; reinforce payload is wired but not fully exercised.
5. **N5 seed set** for cold-start (empty deck) — not built.

## Key files / structure

```
src/lib/
  prisma.ts            Postgres client (pg adapter)
  gemini.ts            client-side chat call (BYOK, multi-key, model fallback)
  gemini-server.ts     server-side call w/ decrypted key(s) + rotation
  crypto.ts            AES-256-GCM encrypt/decrypt (server-only)
  api-keys.ts          client multi-key store (localStorage)
  model-config.ts      model registry, output tokens, autosave, fallback
  srs.ts               SM-2 scheduling + progress
  streak.ts            streak advance/current
  day.ts               dayKey (tz-stamped), previousDayKey, labels
  outreach.ts          mood ladder + eligibility
  run-outreach.ts      server outreach runner (cron + trigger share this)
  types.ts             shared types (tokens, POS, char limit)

src/app/(app)/         authed shell: home, chat, review, vocab, memory, settings
src/app/(auth)/        login, register
src/app/api/           auth, chat (messages/context/compact), flashcards
                       (+[id]/review), memory, stats, activity, settings
                       (server-key/outreach), triggers, cron
```

## Env vars (see .env.example)

`DATABASE_URL`, `DIRECT_URL`, `SESSION_SECRET`, `ENCRYPTION_KEY` (32-byte
base64, **never rotate after storing keys**), `TRIGGER_SECRET`, `CRON_SECRET`.

## Run / deploy

```bash
npm install
cp .env.example .env        # fill in values
npx prisma migrate deploy   # apply migrations to the DB
npm run dev                 # local
npm test                    # 71 tests
```

Deploy: push branch → import to Vercel → set all env vars → `prisma migrate
deploy` against Supabase. Vercel Cron (`vercel.json`) drives outreach every
10 min.

## Gotchas (learned the hard way)

- **Restart the dev server after schema changes** — the running server caches
  the old Prisma client; stale client → routes 404 or `Unknown argument` errors.
- **Don't `taskkill /F` node mid-build** — corrupts `.next`; if routes all 404,
  delete `.next` and restart.
- **PowerShell `Out-File -Encoding utf8` adds a BOM** that Postgres rejects in
  migration SQL. Prisma's own `migrate dev` writes BOM-free files; only hand-
  written SQL needs care.
- **Client components must not render time/locale/random during SSR** (e.g.
  `new Date().getHours()`), compute in `useEffect` to avoid hydration mismatch.
