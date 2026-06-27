# Changelog

All notable changes to KaiwaAI are documented here. This project follows
[Semantic Versioning](https://semver.org/) (pre-1.0: minor = features, patch =
fixes).

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
