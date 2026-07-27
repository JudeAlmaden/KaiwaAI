# Changelog

All notable changes to KaiwaAI are documented in this file.

## [1.5.0] - 2026-07-27

### Added

- **In-app APK update detection for Android users** — The app now automatically polls the KaiwaAI GitHub Releases latest endpoint whenever you open it (and then every 6 hours) to see whether a newer APK was published on `main`.
  - Indigo banner appears directly below the top bar with the installed vs latest version, release date, and buttons to **Download update APK** or view release notes. Users can "Remind me later" to dismiss it for that release.
  - Settings → Mobile tab now includes the same check with a compact installed/latest label with badge ("Update available", "You are on the latest release") and a **Recheck** button.
  - Capacitor: `@capacitor/app` `App.getInfo()` is used to read the APK's real `versionName`/`versionCode` (`build`) so the check is accurate for installed builds.
  - Web builds: the running app version is injected via `NEXT_PUBLIC_APP_VERSION`, which is generated automatically from `package.json` by the new `scripts/write-app-version-env.mjs` predev/prebuild hook that updates (or creates) `.env.local` with the correct value before every `next dev`/`next build`.
- **Android app users now have full Mobile tab** — Previously the Mobile tab in Settings showed either the APK download card (web) or the App Blocker settings (Android). Now Android users see BOTH: the app-update checker + App Blocker settings, so they have a single place to update the APK and configure focus blocking.

## [1.4.1] - 2026-07-27

### Fixed

- **Production / Vercel showing blank "KaiwaAI" page** — A leftover `public/index.html` stub was hijacking the root route and serving a placeholder instead of the real App Router home page. Removed it so the Vercel deploy renders the real app.
- **GitHub Actions APK showed the same blank stub** — Two combined bugs:
  - `build-apk.yml` never exported `CAPACITOR_SERVER_URL` before `npx cap sync android`, so Capacitor had no `server.url` to connect to and fell back to the bundled `out/index.html`.
  - The bundled stub was just `<body>KaiwaAI</body>` with no redirect. It now exports `CAPACITOR_SERVER_URL=https://kaiwa-ai.vercel.app` into the sync step and ships a branded fallback splash page (spinner + server probe + redirect to prod) as a safety net.
- **Placeholder production domains in CI/mobile config** — Replaced `your-production-domain.com` (network-security-config.xml) and `your-domain.vercel.app` (outreach-trigger.yml) with the real `kaiwa-ai.vercel.app` URL. HTTPS is enforced for the prod domain in Android network policy.
- **Capacitor `cleartext` always-on** — Previously the config unconditionally set `cleartext: true` whenever any server URL existed. Now HTTPS URLs disable cleartext (correct for prod) and only HTTP dev URLs keep it.
- **Lint failures from Android build intermediates** — Added `android/**/build/**` and iOS build dirs to the eslint ignore list so generated Capacitor bridge files can't trip `--max-warnings 0` in CI.
- **TypeScript parse errors from stale dev-artifacts** — Removed a stale `.next/dev/types/**/*.ts` include in tsconfig.json that was pulling in corrupted Next.js dev-only type output.

## [1.4.0] - 2026-07-27

### Added

- **Configurable Focus Guard Study Mode** - App Blocker now lets users pick which card pool to pull from during a lock session: `due` (SRS default), `all` (study ahead), `recent`, `struggling`, or `leeches`. Exposed in both the main Settings → Mobile → Edit Rules modal and the quest-gallery Rules & Goal modal.
- **Practice Mode for Focus Guard** - Toggle in App Blocker settings. When enabled, answers still count toward the unlock threshold, but SRS/learning status is never written to the database (no `POST` to `/api/flashcards/review` or `/api/kanji/review`). A violet `PRACTICE` badge is shown in the lock page header so users know.
- **"If Nothing Due" Options** - Two behaviors when no cards match the configured study mode:
  - `Auto-Open` (default): immediately grant unlock and launch the blocked app.
  - `Use Any`: automatically retry with `studyMode=all` so there's always something to review.
- **Card Type & Direction in Every Rules Modal** - `vocabulary` / `kanji` / `mixed` (card type) and `JP → EN` / `EN → JP` / `Mixed Dir` (direction) selectors are now consistently available in both the Focus Guard Edit Rules modal and the gallery RulesConfig modal, instead of only one of them.
- **APK Download Page in Settings** - The Mobile tab is now visible on web users too: on Android it still shows App Blocker settings; on the web it now shows a "Get KaiwaAI for Android" download card with a primary button to the latest GitHub release and a secondary link to all releases, plus installation notes. URLs point to `judealmaden/KaiwaAI`.
- **`.gitignore` hardening** - Added explicit patterns for `*.keystore`, `keystore-hex.txt`, and `keystore-base64.txt` to prevent accidental commits of signing material (in addition to the existing `*.jks` and `*.b64.txt` rules).

### Changed

- **App Blocker Config Schema** - Extended `AppBlockerConfig` with 3 new fields (`studyMode`, `practice`, `noDueAction`). Type definitions, web-plugin defaults, Android SharedPreferences R/W, and Capacitor route URLs have all been updated to carry the full config.
- **AppMonitorService Interception URL** - The `/app-lock` route URL now also includes `studyMode=`, `practice=`, and `noDueAction=` query params when the native service launches the lock screen (in both the primary fullscreen path and the overlay-window fallback path). Lock page URL params always take precedence over saved config to preserve predictable behavior mid-session.
- **App Lock Fetch** - `fetchDueCards` → `fetchCards(reviewType, studyMode)` now passes the selected study mode instead of a hardcoded `studyMode=due`.
- **Settings → App Blocker Loader** - `loadSettings` now pulls `getAppBlockerConfig()` alongside monitoring/permissions/app-list queries and restores all 8 config fields into React state.

### Security

- **Removed sensitive keystore files** - Deleted `kaiwaai-release.jks`, `kaiwaai-release.jks.b64.txt`, `keystore-base64.txt`, and `keystore-hex.txt` from the working tree; these were local copies not used by GitHub Actions (CI reconstructs the keystore from the `KEYSTORE_HEX` / `KEYSTORE_BASE64` repository secrets).

## [1.3.0] - 2026-07-25

### Added

- **Focus Guard (App Blocker)** - New Android feature that intercepts blocked apps and requires completing a flashcard review session before unlocking access. Configurable card count, review type, and unlock duration.
- **App Lock Screen** (`/app-lock`) - Standalone review page shown by the app blocker service. Features the full review experience including card flip, SRS grading, kanji breakdown, mnemonic hints, and auto-launch of the blocked app on completion.
- **Unified `ReviewCard` Component** - Modularized the flashcard review UI into a single shared `ReviewCard` component used by both `/review` and `/app-lock`. Includes 3D flip animation, audio playback, furigana, kanji breakdown, and mnemonic hint.
- **Spaced Repetition in App Lock** - App lock review now fetches due cards first (falling back to all), tracks first-attempt grades, submits SRS updates to the server, and cycles "Again" cards to the back without counting toward the unlock threshold.
- **AppBlocker Capacitor Plugin** - Native Android plugin with `launchApp` method to auto-launch the originally blocked app after review completion.
- **Offline Banner** - Network status indicator shown when the device is offline.
- **CI/CD Pipeline** - GitHub Actions workflow that builds a signed release APK on every push to `main` and publishes it to GitHub Releases.
- **Android App Icon** - App icon generated from existing brand assets across all mipmap densities (mdpi → xxxhdpi).

### Changed

- **Grade Buttons** - Removed keyboard shortcut number hints from grade buttons (Again / Hard / Good / Easy). Now show icon + label only (2 lines).
- **Capacitor Config** - Server URL now driven by `CAPACITOR_SERVER_URL` env var. Production builds point to Vercel; local dev uses LAN IP.
- **`webDir`** - Changed from `public` to `out` to correctly reference Next.js static export output.

### Fixed

- Fixed `useCallback` missing import in `settings/app-blocker/page.tsx`
- Fixed `@/lib/client-mnemonic` wrong module path → `@/lib/kanji-mnemonic-client`
- Fixed conflicting local `Card` type declaration in `ReviewClient.tsx` (shadowed imported `Card` from `ReviewCard`)
- Removed hardcoded offline fallback card array from app lock page

## [1.2.5] - 2026-07-20

### Added

- **Gallery-Style Review Quest Selection** - Transformed the review page into a Pinterest-style masonry layout with varied card sizes for visual interest.
- **Masonry Grid on Mobile** - Implemented a 2-column masonry layout on mobile devices for better space utilization and visual variety.
- **Modular Quest Card Components** - Refactored quest modes into individual reusable components for better code organization and maintainability.
- **Custom Session Modal** - Moved custom session builder into a clean modal overlay with backdrop blur, keeping the main page focused.
- **Enhanced Quest Card Animations** - Added gradient overlays, icon animations (scale, rotate), and color-matched shadows for each quest type.
- **Difficulty Badges** - Added visual difficulty indicators (RECOMMENDED, HARD MODE, BALANCED, FOCUSED, INFINITE) to each quest card.
- **Responsive Card Sizing** - Implemented progressive sizing for icons, text, and padding that scales from mobile to desktop.
- **Status Indicators** - Added pulsing dots and live card counts to show quest availability and status.

### Changed

- **Improved Mobile UX** - Cards now display in a 2-column masonry grid on mobile with optimized touch targets (44x44px minimum).
- **Better Visual Hierarchy** - Daily Quest and Endless Zen now span full width on all devices to emphasize their importance.
- **Responsive Typography** - Text and icons now scale appropriately across breakpoints (mobile: xs/base, tablet: sm/lg, desktop: sm/xl).

### Fixed

- **Removed Unused Imports** - Cleaned up unused `Chip` import in ReviewClient.tsx to pass linting.

## [1.2.4] - 2026-07-18

### Added

- **Pinned Kai Hero Card** - Pinned a branded quick-access hero card at the top of the Chats list for one-tap conversations with Kai.
- **Dynamic Page Subtitle** - Added a dynamic subtitle in the page header that displays unread conversation counts or guides new users.
- **AI Persona Grid** - Redesigned the persona list into a responsive, premium 2-column grid.
- **New Chat Modal Polish** - Added backdrop blur overlay for a glassmorphism style effect.
- **Conversation UI Polish** - Added typing labels naming the active sender, hidden character counters that only show when nearing limits, and visually colored left borders for quote replies.
- **Review Page Pacing & Accents** - Capped the Daily Quest review sessions at 50 cards to avoid cognitive overload and updated card styling to fit the app's clean container theme.
- **Custom Quest Prompts** - Added the ability to generate quests based on custom user-defined scenarios, alongside themed quests.

### Fixed

- **TS Import path resolution** - Fixed the relative import path of `Kai` in `ChatHub.tsx`.
- **Linter warning/errors** - Fixed let vs const reassignment errors and removed unused `Sparkle` icon import.

## [1.2.3] - 2026-07-16

### Changed

- **Version bump to 1.2.3** - Updated package metadata and release notes for the latest patch release.
- **Changelog added** - Documented the current release in the project changelog.

## [1.2.2] - 2026-07-12

### Fixed

- **Mobile touch event support** - Fixed interactive elements (buttons, toggles) not responding to touch on mobile devices
  - Kanji breakdown modal buttons (Generate mnemonic, Listen, Open kanji lesson) now work on mobile
  - Push notification toggle now responds to touch events
  - Added proper touch event handlers with stopPropagation to prevent modal closures
- **Kanji mnemonic persistence** - Fixed mnemonic not displaying after generation in chat kanji modal
  - Properly merges mnemonic from API response into kanji data
  - Mnemonic now persists when closing and reopening the modal
- **Kanji modal display** - Improved kanji character display to match detail page styling
  - Increased kanji size to `text-6xl sm:text-7xl` for better visibility
  - Removed small boxed display in favor of large, prominent character
- **Push notification initialization** - Improved service worker check with better error handling
  - Added 2-second timeout to prevent loading state from hanging indefinitely
  - Better error messages for unsupported features on mobile browsers
  - Enhanced logging for debugging notification issues

### Changed

- **API endpoint consolidation** - Kanji mnemonic generation now uses `/api/kanji/[character]/mnemonic/save` endpoint
  - Ensures mnemonics are saved to the correct `KanjiMnemonic` table
  - Consistent with kanji detail page implementation

## [1.2.1] - 2026-07-12

### Added

- **Kanji mnemonic generation on review cards** - Generate or regenerate Heisig-style mnemonics directly during review sessions
- **"Show hint" button on kanji cards** - Reveals mnemonic or generates it on-demand without cluttering the card
- **Radicals display on kanji review cards** - Shows component radicals with clickable links to search
- **Improved mnemonic format** - AI now generates structured mnemonics with "Components" breakdown and "Story" sections
- **Mnemonic regeneration with confirmation** - Warns before replacing existing mnemonics

### Changed

- **Mnemonic generation prompt** - Now follows Heisig's "Remembering the Kanji" method more closely with emphasis on primitives/components
- **Kanji detail page radicals** - Changed from "add to study list" to "search for similar kanji" functionality
- **Review card UX** - Mnemonics hidden by default behind hint button for cleaner interface

### Fixed

- Kanji detail modal in chat now displays user mnemonics correctly
- Kanji detail modal close button now works properly (rendered as portal to prevent click conflicts)
- Removed duplicate mnemonic displays on review cards
- Fixed React Hooks violations in review component

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
