# Changelog

All notable changes to KaiwaAI are documented in this file.

## [1.6.2] - 2026-08-13

### Changed

- **Unified token tap-to-lookup + draggable range handles (`/chat`)** — All devices (desktop & mobile) now use the same interaction model: tap a word token to open the inline popup and enter range-selection mode with draggable start/end arrow handles. Removed the separate desktop-only drag-highlight popup. Range toolbar shows cached preview and a **Look up** action for multi-word phrases.
- **Popup click-outside reliability** — Dismiss detection switched from `mousedown` to `pointerdown` with capture phase; added 400 ms grace period after open to prevent the opening tap from closing the popup; `anchorRef` clicks excluded from dismiss; range UI marked with `data-token-selection-ui` to avoid triggering close.
- **Context-aware Gemini word lookups** — `lookupWord(query, context?)` accepts full message content; system prompt now includes the surrounding sentence for more accurate definitions and natural example sentences; `SelectionLookupPopup` receives `messageContent` from both token-range and selection paths.

### Added

- **Token selection display utilities** — `src/lib/token-selection.ts` gained `truncateText(text, maxLen)` for toolbar/popup headers, `extractJapaneseSelection(text)` for stripping English noise from lookups, and `selectionAnchorRect(range)` for anchoring popups to selection endpoints. Unit tests added in `token-selection.test.ts`.

### Fixed

- **SelectionLookupPopup loading state** — Replaced raw truncated text header with a compact "Looking up…" state during loading; furigana/word shown once lookup completes.
- **Session composer recency handling** — Adjusted Maintenance Pool recency filter threshold and test assertions for consistent session composition behavior.
- **Review route SRS submission** — `flashcards/review` and `kanji/review` API routes updated with correct response type handling.

## [1.6.1] - 2026-08-10

### Added

- **Swipe-to-reply gestures** — `swipe-reply.ts` enables horizontal swipe detection on chat messages to trigger quote-reply actions
- **Token selection & repair** — new `token-selection.ts` and `token-repair.ts` utilities for handling furigana-aware text selection and fixing malformed/orphaned ruby tags in chat messages
- **Enhanced RichText rendering** — improved `RichText.tsx` with better ruby annotation handling, text selection support, and swipe gesture integration
- **Group chat improvements** — `GroupChatClient.tsx` enhanced with swipe-reply support and better message interaction handling

### Fixed

- **Android build Kotlin compatibility** — resolved Kotlin compiler metadata version conflicts by using Kotlin 2.0.21 with `-Xskip-metadata-version-check` flag
- **CI/CD workflow reliability** — consolidated Release job into CI workflow using job dependency (`needs: verify`) instead of unreliable `workflow_run` trigger
- **Gradle memory optimization** — increased heap to 2GB, added `--no-daemon --max-workers=2` flags, and disabled Kotlin incremental compilation to prevent out-of-memory errors during Android APK builds

## [1.6.0] - 2026-08-10

### Added

- **Organic Landing Page Overhaul (`/`)** — replaced static card grids with fluid, story-driven Framer Motion sections and Phosphor Icons. New components: `LandingInteractiveCanvas` (orbital live preview), `LandingLookupExperience` (AR-style kanji annotations), `LandingMemoryStory` (asymmetric persona memory split), `LandingQuestRPG` (RPG quest encounter prompt), `LandingDeckCascade` (fanning SRS deck stack), `LandingHowItWorks` (3-step routine flow), `LandingShowcaseTabs` (tabbed feature showcase).
- **Persona Profile & Memory Drawer** — `PersonaProfileDrawer.tsx` slide-over drawer accessible from the chat header; shows persona bio, categorised memory cards, inline add/delete, and a **⚙ Settings** pill link.
- **In-chat memory auto-save Settings reminder** — when memory chip panel is in *propose* mode a `💡 Auto-save memories automatically from Settings` hint link is shown beneath the chips.
- **`cleanMemorySuggestion()` helper** — deterministic post-processor in `src/lib/gemini.ts` converts Japanese date/age patterns (`2004年3月16日` → `March 16, 2004`, `20歳` → `20 years old`) and strips trailing Japanese copula from extracted memory suggestions.
- **Unified `/study` hub** — merged `/vocab` and `/kanji` into a single tabbed page with URL `?tab=` sync and `localStorage` persistence; `/vocab` and `/kanji` redirect for backward compatibility.
- **Proactive Chat Settings card** — `ProactiveChatCard.tsx` replaces the removed outreach cards for managing Kai chat-initiative preferences.
- **Capacitor Live OTA Updates** — added `@capgo/capacitor-updater` integration and `CapacitorUpdater` plugin config in `capacitor.config.ts` for automatic background app updates.

### Changed

- **Memory suggestions enforced to English** — `memorySuggestions` system prompt now includes `CRITICAL REQUIREMENT: MUST BE WRITTEN IN CLEAR ENGLISH ONLY`; `cleanMemorySuggestion` applied at parse time and in `MemorySuggestions.tsx` before display and API save.
- **Navigation logo targets `/`** — `AppNav.tsx` logo now navigates to `/` (landing) instead of `/home`.
- **Landing page accessible to logged-in users** — removed automatic `if (user) redirect("/chat")` from root `page.tsx`; returns dynamic CTA (*Open Chat* vs *Log In*) based on auth state.
- **Kanji filter cleanup** — removed redundant *In Reviews / Not in Reviews* filter and unused client-side sort buttons from `KanjiClient.tsx`.
- **Vocab layout declutter** — embedded progress bar into `PageHeader` subtitle; consolidated filters + sort into one toolbar row; replaced add-word bar with floating **⊕ FAB**.
- **Vocab status consolidation** — merged *New* into *Learning*; added `Mastery ↑` / `Mastery ↓` sort options.
- **Quest diversity engine** — `src/lib/quests.ts` upgraded with 4-axis diversity (life domains, scenario slots, interaction friction, rolling title blocklist) to prevent repetitive roleplay themes.
- **Focus Guard settings permission recheck** — `FocusGuardStatusCard.tsx` now listens to both `visibilitychange` and `window.focus` and always re-checks status on app return, removing the `!hasPermissions` gate.
- **GitHub Release APK Automation** — updated `.github/workflows/release.yml` so every release tag build compiles and attaches signed `app-release.apk` directly to GitHub Releases.

### Removed

- **Outreach & push notification subsystem** — removed `OutreachCard`, `ReviewNotificationCard`, `ReviewNotificationManager`, `useReviewNotifications`, `src/lib/outreach.ts`, `src/lib/run-outreach.ts`, `src/lib/review-notifications.ts`, `src/lib/push-server.ts`, `/api/cron/outreach`, `/api/settings/outreach`, `/api/push/subscribe`, `/api/triggers/kai-opener`, and associated `vercel.json` cron config.
- **`/memory` nav item** — removed from primary `NAV_ITEMS`; memory management is now inline in the `PersonaProfileDrawer`.

### Fixed

- **Mobile responsive layout fix for `LandingInteractiveCanvas`** — fixed layout overflow on mobile screens where `flex` was defaulting to row orientation, causing the studio preview frame to squeeze to ~200px width. Converted orbital nodes container to a 2x2 touch-button grid on mobile/tablet (`< lg`), and centered full-width preview frame below it.
- **`AppUpdateBanner` high-contrast styling overhaul** — fixed illegible, washed-out banner text (`Update available`, `Installed ...`) caused by low opacity on light/dark mode gradients. Redesigned with solid glassmorphic card backdrop (`bg-card/95`), high-contrast `text-foreground` typography, vibrant release badges, and responsive action button layout.
- **Lint clean** — resolved all ESLint warnings/errors across landing components, `RichText.tsx`, `WordToken.tsx`, `ProactiveChatCard.tsx`, and `StudyClient.tsx`.
- **Flashcard test suite** — `route.test.ts` mock updated with `userFlashcard.findFirst` to match new route code path; all 281 tests passing.

### Technical

- Modified: `src/lib/gemini.ts`, `src/app/(app)/chat/MemorySuggestions.tsx`, `src/app/(app)/chat/PersonaProfileDrawer.tsx`, `src/app/page.tsx`, `src/app/(app)/nav.ts`, `src/app/(app)/AppNav.tsx`, `src/app/(app)/study/StudyClient.tsx`, `src/app/(app)/vocab/VocabClient.tsx`, `src/app/(app)/kanji/KanjiClient.tsx`, `src/components/AppUpdateBanner.tsx`, `src/app/LandingInteractiveCanvas.tsx`, `.github/workflows/release.yml`, `capacitor.config.ts`, `package.json`
- New: 8 Landing page components, `PersonaProfileDrawer.tsx`, `ProactiveChatCard.tsx`, `StudyClient.tsx`
- Deleted: 10 outreach/notification files
- Tests: 281 passing, 38 suites — fully lint/typecheck clean

## [1.5.3] - 2026-08-01

### Changed

- **Flashcard review algorithm refactored to session-composition system** — replaced simple age-based sorting with intelligent two-pool architecture: Active Pool (40%, new cards + weak short-interval cards) and Maintenance Pool (60%, due cards with 1-hour recency filter). New cards now get highest priority; old weak cards must meet both `easeFactor < 2.2` AND `interval < 3` to remain active, preventing starvation of genuinely new cards. Consecutive sessions show different cards via `lastReviewedAt` filtering.
- **Session composition applies to all standard review modes** — `due`, `all`, and `recent` study modes now use the new session composer (`src/lib/session-composer.ts`); special diagnostic modes (`struggling`, `leeches`) retain legacy sorting for targeted practice.
- **Default Focus Guard Study Mode changed to `all`** — changed fallback `studyMode` default from `due` to `all` across App Blocker settings (`DEFAULT_CONFIG`), status cards, rules configuration card, and `/app-lock` initialization so users without pending due cards still receive a review session instead of an immediate auto-unlock bypass.
- **Documentation reorganized** — created `documentation/flashcard-session-composer/` subfolder containing technical documentation, visual diagrams, improvements summary, and deployment checklist for the session composition refactor. Updated `documentation/APP_BLOCKER.md` with PC preview, offline auto-unlock, and default studyMode details.

### Added

- **Focus Guard PC Preview mode** — added direct launcher button in `DebugFab` on `/settings/app-blocker` page allowing developers to preview `/app-lock` with live URL query parameters.
- **Offline Auto-Unlock policy for App Lock** — when network requests fail due to missing internet connection, `/app-lock` gracefully auto-unlocks and grants access rather than stranding users on an error screen.
- **Unit test suite for app-blocker-unlock** — added `src/lib/app-blocker-unlock.test.ts` (6 tests) covering native plugin integration, localStorage synchronization, fallback behavior, and storage clearing.

### Fixed

- **App Lock URL parameter requirement bypassed on Web/PC** — on web environments, `/app-lock` now launches a session directly without requiring `?mode=app-blocker`, making PC development and UI testing seamless.
- **ReviewCard back face TTS speaker positioning** — moved `SpeakerButton` outside the scroll container (`card-back-scroll`) so its absolute positioning anchors to the card face, fixing button visibility and clipping issues on card flip.

### Technical

- Modified files: `src/app/app-lock/page.tsx`, `src/app/(app)/settings/app-blocker/page.tsx`, `src/app/(app)/settings/app-blocker/FocusGuardStatusCard.tsx`, `src/app/(app)/settings/app-blocker/RulesConfigCard.tsx`, `src/app/(app)/review/ReviewCard.tsx`, `src/lib/app-blocker-unlock.test.ts`
- Test coverage: 290 tests passing across 39 test suites (added `app-blocker-unlock.test.ts` with 6 unit tests). All linting, typechecking, and vitest runs 100% clean.
- No database schema changes required
- Fully backward compatible with existing frontend

## [1.5.1] - 2026-07-27

### Added

- **Conjugation cheat-sheet tab** in Vocab — new "Conjugation" content tab with interactive tutorial covering godan, ichidan, i-adjective, and na-adjective forms with category picker, sample word selector, transformation rules, and per-category reminder cards.
- **Learning reset modal** in Settings — new `LearningResetCard` lets users reset or delete their vocab/kanji SRS progress with a confirmation step (type "RESET" to confirm). Backed by new `/api/learning/reset` endpoint.
- **Focus Guard permission diagnostics** — when the App Monitor service is running but overlay or usage-stats permissions were revoked, an amber warning banner now appears in the FocusGuardStatusCard with a "Grant Permissions" button, so users know exactly what went wrong instead of silently failing.

### Changed

- **ReviewCard component refactored** — extracted `SpeakerButton` and `ConjugationBadge` into standalone sub-components; simplified front/back content derivation with inline expressions instead of pre-computed variables; added conjugation badge display (formType + base dictionary form) on the review card front face.
- **WordToken dual-button UX** — tapping a conjugated form that hasn't been saved now shows **both** "＋ Add base word" (primary, purple) and "＋ Study this form" (secondary, mint) side-by-side, instead of hiding one behind a mutually-exclusive if/else. The legacy "Add all N conjugations" batch button is now only shown for irregular verbs (suru/kuru); regular godan/ichidan verbs and adjectives auto-conjugate server-side when the base form is added.
- **Flashcards API batch-add hardening** — the `POST /api/flashcards` batch conjugation endpoint now ensures the base dictionary card exists (creating it if missing) and auto-adds constituent kanji before inserting individual form cards, preventing a partially-saved deck state.
- **App Monitor service reliability** — home-screen kick now runs on the main thread with `FLAG_ACTIVITY_CLEAR_TASK` so ActivityManager properly finishes the blocked task; overlay-window interception is attempted first (most reliable on modern Android) with full-screen Activity as fallback; all blocking modes now pass the complete config (studyMode, practice, noDueAction) through to the lock screen.
- **Review session UI polished** — increased `ReviewCard` height for better display, added custom review session modal support, and improved review queue parameter handling for `new`/`custom` study modes.
- **`getAppBlockerConfig` now returns live permission status** — `hasUsageStatsPermission`, `hasOverlayPermission`, and `monitoringActive` fields are included in the Capacitor plugin response so the web layer can show accurate diagnostics without a separate permissions query.

### Fixed

- **WordToken `verbOrAdj` unused variable** — removed dead assignment that triggered `@typescript-eslint/no-unused-vars`.
- **LearningResetCard `handleClose` accessed before declaration** — moved `handleClose` above the `useEffect` that references it and wrapped it in `useCallback` to satisfy `react-hooks/exhaustive-deps` and `react-hooks/immutability`.
- **ConjugationTutorial unescaped entities** — replaced literal `'` and `"` in JSX text with `&apos;` / `&quot;` to fix `react/no-unescaped-entities` errors.

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
