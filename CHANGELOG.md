# Changelog

All notable changes to KaiwaAI are documented in this file.

## [1.1.0] - 2026-07-11

### Added

- Optional conjugation flashcards: learners can add one form, add all available conjugations, or return to a base-form-only deck.
- Conjugation labels and base-word context in Vocab, chat word popups, and review cards.
- A compact, expandable conjugation browser in Vocab to prevent large form lists from overwhelming the word detail view.
- A kanji detail modal with readings, meanings, audio, and a direct path to the kanji lesson.
- A reproducible dictionary CSV generation workflow, including source-data organization, generated word/form CSVs, documentation, and an `npm run regenerate:words` command.

### Changed

- Review cards use a taller layout for long definitions and keep form information visible in both review directions.
- Chat word popups now choose available vertical space above or below the tapped word to avoid viewport clipping.
- Dictionary CSV assets are organized into `public/database/source` and `public/database/generated`.

### Fixed

- Corrected vocabulary search and duplicate-reading behavior.
- Relaxed API key validation to support valid provider key formats.
