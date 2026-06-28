# Changelog

All notable changes to KaiwaAI are documented here. This project follows
[Semantic Versioning](https://semver.org/) (pre-1.0: minor = features, patch =
fixes).

## [Unreleased]

### Fixed
- **Add to vocabulary** now works in persona and group chats. Tapped words
  carried a `GroupMessage` id into a field that references `Message`, so the
  save silently hit a foreign-key error; the id is now validated and dropped
  when it isn't a real `Message`.
- Conversations open at the latest message instantly instead of scrolling from
  the oldest message down.

### Changed
- Renamed "Add to review" to "Add to vocabulary" across the UI.
- Group conversations load newest-first and page in older messages on
  scroll-up (cursor pagination) instead of loading the whole history at once.
- Tightened Kai's system prompt: English-led "Japanglish", no romaji in the
  visible reply, and a more thorough romaji-shadow stripper. The prompt was
  also condensed to save context budget.

## [0.3.0] — 2026-06-28

### Added
- **Personas**: Kai plus three locked presets (Hana, Riku, Sora), and
  user-created custom personas you can rename, edit, and delete. Each persona
  has its own memory, scoped per user.
- **Friends & inbox**: friend requests by email, an inbox with accept/decline,
  group invites that require acceptance, and pending-count badges.
- **Group chats** (up to 5 people + one AI persona): owner provides the Gemini
  key (encrypted); the persona is summoned with an `@mention` and replies with
  the full rich payload (tap-to-translate, English, grammar corrections).
- **Unified chat hub**: one conversation list (personas, DMs, groups) with
  search, unread dots, a compose sheet, message grouping, timestamps, and
  session dividers.
- **Memory upgrades**: per-persona memory, "remember this?" suggestions with an
  optional auto-save mode, and deep-link shortcuts from a conversation.
- **Grammar corrections**: structured correction card on Kai's replies.
- **Quote-reply** and **in-chat proactivity** (idle openers / follow-ups), plus
  a tap-to-translate fallback (on-demand lookup) for messages without cached
  tokens. Any looked-up word can be saved.
- Phosphor icon set across the nav and chat UI.

### Changed
- **Unified Kai into the persona/conversation system**: removed the dedicated
  Kai page and `/api/chat/{messages,compact,kai-message}` endpoints; every chat
  now runs on one `GroupMessage`-based model. Daily outreach writes to the Kai
  conversation.
- Mobile: a conversation is full-screen (no stacked bars) with keyboard-aware
  composer and safe-area padding.
- Looked-up words of any part of speech can now be saved deliberately (only
  auto-save stays restricted to content words).

### Fixed
- Memory recall (personas no longer deny saved facts).
- Service-worker stale-bundle hydration mismatch in dev; centralized chat cache
  so clear/delete/logout stay consistent.
- Vercel Hobby cron limit (outreach reduced to once daily).
- Resynced `package-lock.json` so `npm ci` passes.

## [0.2.0] — 2026-06-28

### Added
- **Home dashboard** (`/home`): greeting, streak card, vocab progress, stat
  cards, and quick actions.
- **Real streaks**: consecutive-day tracking (current + best) that advances on
  chat or app open, shown in the nav and on the home page.
- **Server-side multi-key storage**: opt-in encrypted (AES-256-GCM) storage of
  all Gemini keys with rotation, enabling background features.
- **Kai outreach** ("messages first"): scheduled/random modes, quiet hours, a
  mood ladder, the cron + trigger pipeline (`runOutreach`).
- **PWA**: installable manifest, icons, offline-aware service worker.
- CI pipeline (lint + typecheck + test + build) and release tagging.

### Changed
- **Migrated the database from SQLite to PostgreSQL (Supabase)** via the
  `@prisma/adapter-pg` driver; migrations regenerated for Postgres.
- Auth guards now verify the user still exists (stale sessions are logged out).
- Redesigned logout; chat redesigned into a messaging-app layout; chat history
  paginated + cached.

### Fixed
- Hydration mismatch on the home page (time-based greeting now computed
  client-side).
- SM-2 review test typing; lint cleanup (0 errors).

## [0.1.0] — 2026-06-27

### Added
- Initial build: bilingual Gemini chat, tap-to-translate, tap-to-add flashcards,
  word lookup, SRS review (SM-2), vocab deck, Kai's Memory diary, BYOK key
  management with model switching and rotation.
