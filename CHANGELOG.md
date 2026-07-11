# Changelog

All notable changes to KaiwaAI are documented in this file.

## [1.2.1] - 2026-07-11

### Fixed

- Kanji detail modal in chat now displays user mnemonics correctly
- Kanji detail modal close button now works properly (rendered as portal to prevent click conflicts)
- Added ability to generate AI mnemonics directly from the kanji detail modal

## [1.2.0] - 2026-07-11

### Added

- **Client-side local storage caching** for vocabulary and kanji data to improve performance and reduce API calls
- **Review notification system** with configurable browser notifications to remind users about due flashcards
  - Notifications scheduled at 4, 8, and 12 hours after app launch or review completion
  - Settings panel to enable/disable notifications and configure preferences
  - Automatic rescheduling after completing reviews
- Word token click-to-add feature in chat for quickly adding vocabulary to flashcards

### Changed

- Flashcard API routes now return proper status codes for better error handling
- Vocabulary and kanji lists now use pagination with local caching for improved performance
- Review notifications state persists in localStorage across sessions

### Fixed

- React Hooks violations: moved all useEffect hooks before conditional returns
- ESLint warnings for setState in effects (suppressed legitimate cases)
- Unescaped quotes and apostrophes in JSX

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
