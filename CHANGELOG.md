# Changelog

All notable changes to KaiwaAI are documented here. This project follows
[Semantic Versioning](https://semver.org/) (pre-1.0: minor = features, patch =
fixes).

## [0.4.0] — 2026-07-02

### Added
- **Kanji SRS Review**: Full spaced-repetition review for kanji, integrated into the existing review flow
  - **New `UserKanji` model**: Tracks per-user kanji progress with SM-2 fields (`easeFactor`, `interval`, `repetitions`, `timesReviewed`, `nextReview`, `lastReviewedAt`, `status`)
  - **New API** `/api/kanji/review`: `GET` fetches due/recent/struggling/leeches/all kanji cards; `POST` grades a card and advances SRS state — auth-gated and ownership-checked
  - **Tests**: 14 tests covering all study modes, limit clamping, grade validation, auth checks, and security (cross-user grading rejected)
  - **Review type selector**: Choose **Vocabulary** or **Kanji** directly on the review setup screen
  - **Card direction selector**: Study **Japanese → English**, **English → Japanese**, or **Mixed** (randomly shuffled per-card)
  - **Direction-aware card rendering**: Front/back content, prompt text, and TTS button adapt to the selected direction; kanji breakdown shown only in jp-to-en vocab mode
- **Enhanced Review System**: Smarter study modes for targeted vocabulary practice
  - **Study Focus Modes**: Due now, Study ahead, Recent (last 7 days), Struggling (low ease), Leeches (not sticking)
  - **Practice Mode**: Study without affecting mastery/SRS scores (in advanced options)
  - **Clean UI**: Condensed from 7 sections to 3 (Study Focus, Session Size, Advanced Options)
  - **Backend**: Enhanced `/api/flashcards/review` GET endpoint with `studyMode` parameter
  - **Tests**: 28 comprehensive API tests covering all study modes and edge cases
- **Kanji Learning System**: Comprehensive kanji study feature with local database
  - **Backend**: Database tables `Kanji` (13,108 characters) and `KanjiMnemonic` (user-specific AI stories)
  - Seeded kanji data from davidluzgouveia/kanji-data (MIT licensed)
  - Includes: meanings, readings (on'yomi/kun'yomi), radicals, JLPT levels, stroke counts
  - API endpoints: `/api/kanji` (list), `/api/kanji/[character]` (detail), `/api/kanji/[character]/mnemonic` (generate)
  - Utility functions: kanji extraction, vocabulary lookups, mastery calculation
  - AI-powered mnemonic generation using Gemini with caching
  - **Frontend**: New `/kanji` page showing all kanji from your vocabulary with:
    - Search by character, meaning, or reading with clear button
    - Filter by JLPT level (N5-N1) with visual chips
    - Sort by frequency, mastery, or stroke count
    - Enhanced mastery ring indicator with color coding (mint=80%+, amber=40-79%, sky=0-39%)
    - Improved card design with hover effects and larger kanji display
    - Better loading states with animated spinner
    - Enhanced empty state with call-to-action button
  - **Frontend**: New `/kanji/[character]` detail page with:
    - Large character display (text-6xl on mobile, text-7xl on desktop) with audio pronunciation
    - Enhanced header showing grade level, frequency rank, and JLPT level badges
    - Meanings with primary meaning highlighted in indigo
    - Color-coded reading sections with Japanese labels (音/訓)
    - Radicals section with hover scale effects
    - Beautiful AI-generated memory aid with gradient background and glow effects
    - Enhanced vocabulary cards showing reading, romaji, meaning, and status
    - All sections use improved spacing and visual hierarchy
    - Smooth transitions and hover effects throughout
  - **Frontend**: "Learn Kanji" button added to vocabulary detail modal
    - Appears when word contains kanji characters
    - Navigates directly to kanji detail page
  - **Kanji Breakdown Component**: Clickable kanji everywhere!
    - Chat word popup: Click any kanji to learn it
    - Vocabulary modal: Interactive kanji tiles
    - Review flashcards: Study kanji while reviewing
    - All kanji are clickable tiles that navigate to detail page
  - Navigation: Added kanji link to app navigation (sidebar + bottom tabs)
- **Intelligent vocabulary meaning merging**: When you tap a word that's already in
  your vocabulary but with a different meaning (e.g., "取る" as "to take" vs "to steal"),
  the system now uses AI to intelligently merge the meanings instead of ignoring the new
  context. The button changes to show "New meaning added!" with a ✨ icon.
- **Vocabulary pre-loading**: Chat now pre-loads your saved vocabulary on mount, fixing
  the false positive where words already in your deck would show "Add to vocabulary"
  before checking the database.

### Improved
- **Kanji UI Polish**: Major visual enhancements across kanji system
  - Larger, more prominent kanji characters in all views
  - Color-coded sections (sky=on'yomi, amber=kun'yomi, mint=radicals)
  - Smooth hover effects with scale transforms
  - Better loading states with pulse animations
  - Enhanced empty states with visual hierarchy
  - Improved spacing and typography throughout
  - Gradient backgrounds for mnemonic cards
  - Shadow effects for depth perception
  - Better mobile responsiveness
  - Clearer visual feedback on interactions
- **Lint enforcement**: Added `--max-warnings 0` to enforce strict linting in CI/CD

### Fixed
- **Japanese word tokenization**: Improved system prompt to instruct the AI model
  to keep complete Japanese words together as single tokens (e.g., "寝たい" now
  stays as one tappable word instead of being split into "寝" + "たい"). Added
  tests documenting expected tokenization behavior.
- **False positive "Add to vocabulary"**: Previously, saved words would show the add
  button on first tap because vocabulary wasn't pre-loaded. Now the system fetches
  your vocabulary list when the chat loads.
- **HTML hydration errors**: Fixed React hydration errors caused by nested `<p>` tags.
  Changed `<p>` to `<div>` in RichText, KanjiBreakdown, and CorrectionCard components.
- **Popup management**: Added click-outside handler to close word/kanji popups when
  clicking elsewhere. Previously, multiple popups could be open simultaneously.

### Changed
- Added `meaningContexts` field to Flashcard schema for future multi-meaning support.
- Migrations squashed into single `20260701000000_init` migration.

## [0.3.1] — 2026-06-29

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
