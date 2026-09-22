# Changelog

All notable changes to KaiwaAI are documented in this file.

## [2.1.0] - Unreleased (`dev`)

Chat relationship mood, tokenization consistency, richer memory, in-thread quests, and related UX. Developing on `dev`; not yet released from `main` (still at 2.0.0). See also `documentation/RECENT_CHANGES.md`.

### Added
- **Per-conversation mood** — `Chat.mood` / `moodScore` / `moodUpdatedAt` with shared domain in `src/lib/mood.ts`; tone injected into every AI turn; header emoji + hub row indicators; proactive replies gated by mood (independent of outreach `consecutiveIgnored`).
- **Shared tokenization contract** — `src/lib/tokenization.ts` (`validateTokens`, JP-only model tokens, schemas used by client Gemini and server group-chat).
- **Dictionary enrichment on persist** — `dictionary-enrich` + `POST /api/dictionary/enrich` fills readings/meanings from local Word/Phrase tables after validation.
- **Saved-words session context** — `SavedWordsContext` fetches vocab once per chat session; shared `TokenPopup` for WordToken and LookupToken.
- **Lookup session cache** — `src/lib/lookup-cache.ts` avoids repeat Gemini/dict fetches for the same surface.
- **Rich memory suggestions** — Model returns `{ content, category, importance }`; normalize + server upsert/dedup (`memory-upsert`) and soft supersede (`Memory.supersededById` / `lastUsedAt`).
- **Bulk memory save** — `POST /api/memory/bulk` for auto-memory.
- **Conversation summaries** — `Chat.summary` / `summaryUpToId` + `POST /api/groups/[id]/summary` for long threads (~40+ turns).
- **Messenger-style reply quotes** — `Message.replyTo*` denormalized preview fields + serialize/preview helpers.
- **In-chat roleplay quests** — ⋯ → Start a quest attaches `QuestLauncher` to the current thread (`existingGroupId`) without leaving the conversation.
- **Lean project docs** — Restored/cleaned `documentation/` (CHAT, DESIGN, MOBILE_SETUP, APP_BLOCKER, AUTO_SYNC, session-composer, RECENT_CHANGES).

### Changed
- **Chat hub chrome** — URL-synced tabs, personas before quests, slimmer mobile header / nav on `/chat`.
- **Profile entry points** — Name/avatar opens the profile & memory drawer; removed duplicate Profile chip and Profile & Memory header button; ⋯ keeps Open full diary (`/memory`).
- **Memory suggestions UI** — Collapsed pill / durable chips with category cues; pending suggestions cached per conversation.
- **Prompt context** — `/api/chat/context` scoped with `chatId` (recent turns, mood, summary, memories).
- **Relearn grades** — Again + Hard only on relearn (Good/Easy disabled) with unit coverage.
- **Kai avatar** — Restored brand SVG mark in chat (not the `image.png` crop).

### Fixed
- **PC token range handles** — Hit-testing skips `[data-token-selection-ui]` so ‹ › drag works when chrome sits under the cursor.
- **Outreach / context memory scoping** — Persona-filtered memories; superseded rows excluded from injection.

### Technical
- Migrations: `20260922100000_chat_mood_memory_summary`, `20260922120000_message_reply_to`
- New libs/routes: `mood`, `tokenization`, `memory-normalize`, `memory-upsert`, `dictionary-enrich*`, `lookup-cache`, `reply-preview`, `message-serialize`, `api/dictionary/enrich`, `api/memory/bulk`, `api/groups/[id]/summary`, chat `TokenPopup` / `SavedWordsContext` / `SelectionLookupPopup`
- Touched: `GroupChatClient`, `ConvMenu`, `ChatHub`, `QuestLauncher`, `RichText`, `MemorySuggestions`, `MemoryClient`, `gemini`, `group-chat`, message/proactive/memory/context routes, `prisma/schema.prisma`

## [2.0.0] - 2026-09-20

### Added
- **Kanji Folder & Lesson Architecture** — User-generated lesson folders (`KanjiGroup`) to organize kanji study (e.g., "Lesson 1", "Lesson 2: Strokes") with folder-level completion metrics and ordering (`KanjiGroupEntry`).
- **User-Specific Heisig Keywords & Meanings** — Added `customMeaning` to `UserKanji` so personal Heisig RTK keywords and translations are 100% private to each user without modifying the shared dictionary.
- **Folder Explorer UI (`KanjiClient.tsx`)** — Full folder-based navigation: browse lesson binders, enter folders with breadcrumb navigation, order kanji, and drill down into custom collections or "All My Kanji".
- **RTK Add & Bulk Paste Importer (`AddKanjiModal.tsx`)** — Single entry and bulk copy/paste modal supporting tab, comma, or pipe-separated imports from RTK PDFs or notes with live parsing preview and folder assignment.
- **Remembering the Kanji (RTK) Detail Card** — Inline editing of RTK Frame #, Lesson #, and Keyword on `KanjiDetailClient.tsx`.
- **Custom Story & Mnemonic Editor** — View, copy/paste, and edit personal mnemonic stories directly from the kanji detail page (`PATCH /api/kanji/[character]`).
- **Lesson Study Mode (`ReviewClient.tsx` & `/api/kanji/review`)** — Direct folder/lesson drilling via `heisigLesson` and `groupId` query parameters, displaying personal mnemonics on card flip.
- **Inline Kanji Mnemonic Studio (`KanjiBreakdown.tsx`)** — Direct 1-click AI mnemonic story generation (`generateKanjiMnemonicClient`) and interactive rich note editing inside the breakdown modal without opening secondary modals.
- **Inline Folder Selection & Creation** — Real-time lesson folder assignment, quick custom folder creation, and folder relocation directly within `KanjiBreakdown.tsx`.
- **Auto-Provisioning Heisig Lesson Folders (`/api/kanji/[character]/learn`)** — Automatically provisions `Lesson {X}` (`kind: "heisig_lesson"`) folders when adding a kanji with a `heisigLesson` if it does not yet exist for the user.
- **In-App Navigation Shell Modernization (`AppNav.tsx`)** — Live AI companion status indicator with pulsing dot, primary talk CTA, spaced repetition due counter badge, and mobile floating island dock.
- **Home Dashboard Bento Layout Overhaul (`HomeClient.tsx`)** — Bento grid dashboard with time-of-day greeting, companion status, count-up review sprint card, roleplay quest spotlight, and kotowaza proverb spotlight.
- **Feature Highlights Ticker** — Added `LandingStatsTicker.tsx` with continuous smooth horizontal ticker showcasing core app highlights and pausing on hover.
- **Rich Multi-Column Footer** — Added `LandingFooter.tsx` with brand mission, Japanese ethos quote, live operational BYOK badge, structured product and platform navigation links, and legal/privacy shortcuts.
- **Interactive Live Scenario Maker** — Overhauled `LandingQuestRPG.tsx` with authentic roleplay themes (`food`, `travel`, `directions`, `shopping`, `emergency`, `surprise`), custom prompt idea generator, objectives list, and instant preview matching the in-app `/chat` `QuestLauncher`.
- **Expanded Again-Lock Unit Test Suite** — Added unit tests (`src/lib/app-blocker-again-lock.test.ts`) verifying Good/Easy disable enforcement across session re-queues.

### Changed
- **Sidebar User Card Redesign (`AppNav.tsx`)** — Consolidated the bottom user card into a single compact row: gradient avatar, username + email sub-label, inline streak badge, and icon-only logout button (`LogoutButton` `"icon"` variant).
- **Kanji Breakdown Modal Architecture** — Replaced the modal-on-modal anti-pattern (`AddKanjiModal` over `KanjiBreakdown`) with focused inline study and note-taking controls.
- **Dictionary vs. Personal Study Separation** — Cleanly delineated global dictionary meanings (JMDict) from personalized user keywords, RTK frame/lesson data, and custom mnemonic stories in `KanjiBreakdown.tsx`.
- **Mnemonic Schema Synchronization** — Synchronized `UserKanji.mnemonic` and `KanjiMnemonic` across `/api/kanji/[character]/mnemonic/save` and `/api/kanji/[character]/learn`.
- **Kanji Study Navigation** — Transformed the kanji hub from an automatic list into an intentional folder explorer where users manage and study their own curated lesson sets.
- **Landing Page Hero Section** — Integrated `LandingKanjiOrbit` as an ambient rotating halo behind `HeroDemo` instead of vertical stacking, ensuring the hero fits standard desktop and laptop viewports without overflow.
- **Interactive Canvas Quest View** — Updated `CanvasQuestsView` in `LandingInteractiveCanvas.tsx` to match the authentic in-app quest card layout.
- **Privacy & BYOK Messaging** — Replaced legacy subscription paywall references across `page.tsx` with clean, direct Google Gemini API BYOK copy.
- **Home Client State Initialization** — Replaced synchronous `setState` calls in `HomeClient.tsx`'s `useEffect` with lazy `useState` initializers, eliminating cascading re-renders.

### Removed
- **Sidebar Status Blip** — Removed the "Kai is online · talks N5" status text under the logo in the desktop sidebar.
- **Nested AddKanjiModal in Chat** — Removed `AddKanjiModal` invocation and overlay from `KanjiBreakdown.tsx`.
- **Automatic Kanji Ingestion** — Removed `autoAddKanjiFromWord` calls in flashcard creation; adding vocabulary words in chat or flashcards no longer secretly pollutes the kanji review queue.
- **JLPT N1–N5 Filters** — Completely removed legacy JLPT level filter chips from the kanji study interface in favor of user-generated lesson folders.

### Fixed
- **Study Tab Sidebar Navigation (`StudyClient.tsx`)** — Added `useEffect` watching `searchParams` so vocab/kanji tabs reactively switch when sidebar nav links soft-navigate between `/study?tab=vocab` and `/study?tab=kanji`.
- **KanjiBreakdown React Compiler Lint** — Replaced manual `useCallback` memoization with plain functions and resolved folder-picker effect warnings for clean ESLint `--max-warnings 0` compliance.
- **Mnemonic Save Test Coverage** — Added `userKanji` Prisma mocks to `/api/kanji/[character]/mnemonic/save` route tests.
- **WordToken Outside-Click Event Interception** — Fixed critical event capturing bug where clicking buttons inside `KanjiBreakdown` caused `WordToken`'s `document.pointerdown` capture listener to detect an outside click and immediately close, unmounting `KanjiBreakdown` before button actions could fire.
- **Kanji Group Upsert Validation** — Resolved Prisma Client 500 error in `/api/kanji/[character]/learn` caused by empty `update: {}` in `kanjiGroupEntry.upsert` by properly passing `update: { order: nextOrder }`.
- **Kanji Group Assignment Propagation** — Fixed `initialGroupId` mapping bug where group context was lost due to missing group typings on `KanjiDetail`.
- **Sidenav Route Highlighting** — Fixed active tab highlighting in `AppNav.tsx` for `/study?tab=kanji` and `/study?tab=vocab`, and disambiguated `/settings` from `/settings/app-blocker`.
- **`/api/kanji/review` RTK Fields & Deduplication** — Ensured GET response includes `heisigNumber`, `heisigLesson`, `heisigKeyword`, and deduplicated `customMeaning`.
- **Kanji Quest Empty Deck Fallback** — Added `FALLBACK_OFFLINE_KANJI_CARDS` so empty kanji decks do not incorrectly pull vocabulary words.
- **Review Client Completion Tracking** — Fixed `tally.good` and unlock threshold math when passing a card previously marked "Again".
- **Stray Typography Glyphs** — Removed stray cross symbol rendered near the hero headline on the landing page.
- **Unused Imports & ESLint Warnings** — Cleaned up unused React hooks from `LandingStatsTicker.tsx` and resolved effect setState warnings in `HomeClient.tsx`.
- **Pitch Accent Text Drift** — Removed obsolete references to pitch accent from `LandingHowItWorks.tsx` and `LandingInteractiveCanvas.tsx`.
- **Missing Prisma client schema definitions** during Next.js hot reloads by introducing client version cache busting (`PRISMA_SCHEMA_VERSION = 3`).

### Technical
- Modified: `package.json`, `prisma/schema.prisma`, `src/lib/prisma.ts`, `src/app/page.tsx`, `src/app/LandingQuestRPG.tsx`, `src/app/LandingInteractiveCanvas.tsx`, `src/app/LandingHowItWorks.tsx`, `src/app/LandingStatsTicker.tsx`, `src/app/(app)/AppNav.tsx`, `src/app/(app)/home/HomeClient.tsx`, `src/app/(app)/kanji/KanjiClient.tsx`, `src/app/(app)/kanji/[character]/KanjiDetailClient.tsx`, `src/app/(app)/kanji/AddKanjiModal.tsx`, `src/app/(app)/chat/KanjiBreakdown.tsx`, `src/app/(app)/chat/WordToken.tsx`, `src/app/(app)/chat/LookupToken.tsx`, `src/app/(app)/chat/Avatar.tsx`, `src/app/(app)/chat/ChatHub.tsx`, `src/app/(app)/study/StudyClient.tsx`, `src/app/(app)/review/ReviewClient.tsx`, `src/app/LogoutButton.tsx`, `src/app/HeroDemo.tsx`, `src/app/globals.css`, `src/app/api/kanji/review/route.ts`, `src/app/api/kanji/[character]/route.ts`, `src/app/api/kanji/[character]/learn/route.ts`, `src/app/api/kanji/[character]/mnemonic/save/route.ts`, `src/app/api/kanji/[character]/mnemonic/save/route.test.ts`, `src/app/api/review/mixed/route.ts`
- New: `src/app/LandingKanjiOrbit.tsx`, `src/app/LandingStatsTicker.tsx`, `src/app/LandingFooter.tsx`, `src/app/(app)/kanji/AddKanjiModal.tsx`, `src/lib/fallback-cards.ts`, `public/assets/svg/image.png`
- Tests: 321 passing (43 test files) — lint/typecheck clean

## [1.8.0] - 2026-09-19

### Added
- **Focus Guard: Session Re-Queue ("Again") logic** — Pressing "Again" now re-inserts the card 2 positions ahead in the same session instead of counting it as completed. Cards failed during a session cycle back after 2 other cards, enabling true within-session drilling without prematurely unlocking the blocked app.
- **Focus Guard: Session Composer** — New `session-composer.ts` utility splits the card pool into an active-learning pool (new/weak cards) and a maintenance-retention pool, interleaved as `[A1, M1, A2, M2, ...]` for optimal spacing.
- **Focus Guard: Deck Balance setting** — New "Learning vs Retention" control in Edit Rules modal with presets: 50/50 Balanced, 70/30 New Focus, 100% Learning. Configures the `learningRatio` sent to the session composer.
- **Focus Guard: Furigana Mode (3-way)** — Expanded from a binary toggle to three modes: Always (always show ruby), Mastered Off (hide on known/mastered cards, show on learning), Never (clean kanji, maximum challenge). Stored as `furiganaMode` in `AppBlockerConfig`.
- **Focus Guard Furigana toggle** — Added an option in Focus Guard Interception Rules settings to enable or disable furigana reading annotations on flashcards during app interception.
- **Distraction-free kanji recall** — When Furigana is disabled, flashcards display clean kanji characters on the front face without reading ruby annotations, preventing reading spoilers during active recall.
- **Configurable Furigana persistence** — Added `showFurigana` property to `AppBlockerConfig` in TypeScript and Android SharedPreferences (`show_furigana`), maintaining settings across reboots and app launches.
- **Debug preview parameter support** — DebugFab's "Open App Lock Page →" now propagates `showFurigana` to the `/app-lock` preview route.

### Changed
- **ReviewCard furigana rendering** — `ReviewCard` now accepts `showFurigana?: boolean` (default: `true`), conditionally omitting ruby annotations when disabled.
- **Interception Rules modal layout** — Redesigned into 3 clean groups (Goal, Cards, Options) using inline table rows and segmented pill toggles, reducing modal vertical height by ~40% for optimal mobile ergonomics without cluttered nested cards.

### Fixed
- Focus Guard "Again" button was incorrectly marking cards as completed instead of re-queueing them within the same session.
- Missing `furiganaMode` and `learningRatio` React state declarations in the App Blocker settings page caused silent runtime errors.
- Unescaped `"` quotes in `FocusGuardStatusCard` tooltip text (ESLint react/no-unescaped-entities).

### Technical
- Modified: `src/app/app-lock/page.tsx`, `src/app/(app)/settings/app-blocker/page.tsx`, `src/app/(app)/settings/app-blocker/FocusGuardStatusCard.tsx`, `src/app/(app)/settings/app-blocker/RulesConfigCard.tsx`, `src/app/api/flashcards/review/route.ts`, `src/plugins/app-blocker/definitions.ts`, `src/plugins/app-blocker/web.ts`, `android/app/build.gradle`, `android/app/src/main/java/com/kaiwaai/app/AppBlockerPlugin.kt`, `android/app/src/main/java/com/kaiwaai/app/AppMonitorService.kt`, `.agents/APP_BLOCKER.md`
- New: `src/lib/session-composer.ts`
- Tests: 300 passing (41 test files) — lint/typecheck clean



## [1.7.1] - 2026-09-01

### Added
- **Automated Android version sync** — `scripts/write-app-version-env.mjs` now synchronizes `versionName` and increments `versionCode` in `android/app/build.gradle` automatically on `predev`, `prebuild`, and `cap:sync`.
- **Smart semantic version resolution** — In-app update checker fetches release lists and sorts by true semver, ensuring the highest released version is selected regardless of GitHub release publish dates.
- **Settings Mobile & Releases view on PC** — Enabled the Mobile settings tab across web/desktop to view installed and latest release status and access direct APK downloads.

### Changed
- **Instant update checking** — Replaced the 6-hour cache in `useAppUpdates` with immediate automatic background revalidation on app load.
- **GitHub Actions changelog extraction** — Replaced brittle `awk` parsing with a robust Node.js parser in `.github/workflows/ci.yml` so GitHub Releases automatically include full changelog notes.

### Removed
- **Intrusive update pop-up modal** — Removed `AppUpdateModal` to eliminate disruptive auto-popping update dialogs.
- **Dashboard clutter** — Removed duplicate mobile download card from the Home dashboard (`HomeClient.tsx`), keeping the home screen focused on study activity.
- **Manual recheck button** — Removed redundant manual recheck trigger in favor of seamless background checks.

### Fixed
- **Android APK version mismatch** — Fixed desynchronization where native Android builds reported stale `versionName`, causing the app to falsely report updates available.
- **Empty GitHub release notes** — Fixed release creation workflow where bracketed version headings in `CHANGELOG.md` caused empty release descriptions.

### Technical
- Modified: `package.json`, `android/app/build.gradle`, `scripts/write-app-version-env.mjs`, `src/lib/app-updates.ts`, `src/hooks/useAppUpdates.ts`, `src/components/AppUpdateBanner.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/home/HomeClient.tsx`, `src/app/(app)/settings/SettingsClient.tsx`, `.github/workflows/ci.yml`
- Deleted: `src/components/AppUpdateModal.tsx`
- Tests: 300 passing (41 test files) — lint/typecheck clean

## [1.7.0] - 2026-09-01

### Added
- **Maintenance pool furigana suppression** — Vocabulary and phrase cards from the maintenance pool (retention phase) now hide furigana ruby annotations on the front face, requiring active memory recall while keeping full furigana on the answer reveal.
- **Offline & unvalidated connection bypass** — App Blocker checks verified internet connectivity (`NET_CAPABILITY_VALIDATED`) across Wi-Fi, Mobile Data, and Ethernet, skipping app blocking when offline or connected to networks without internet access.
- **Emergency app unlock escape** — Added a direct "🚀 Launch App & Unlock" action on empty / offline review screens to prevent lock loops when logged out or when no cards are due.
- **Shared fallback flashcards** — Created `src/lib/fallback-cards.ts` providing baseline offline vocabulary cards.

### Changed
- **Session composer review API routes** — `/api/flashcards/review`, `/api/kanji/review`, and `/api/review/mixed` now tag each returned card with `_pool: "active" | "maintenance"` metadata.
- **App Blocker cold-start launch** — Staggered navigation retries and full query parameter matching ensure opening a blocked app from a closed state navigates directly into `/app-lock`.

### Fixed
- **App switcher stale package bug** — Switching between blocked apps (e.g. Facebook to YouTube) now dynamically re-navigates and persists `last_blocked_package`, launching the latest app upon session completion.
- **Launcher drop on cold start** — Removed destructive task clear flags in `AppMonitorService` to prevent returning to the Android home screen instead of the review session.

### Technical
- Modified: `src/app/(app)/review/ReviewCard.tsx`, `src/app/(app)/review/ReviewClient.tsx`, `src/app/api/flashcards/review/route.ts`, `src/app/api/kanji/review/route.ts`, `src/app/api/review/mixed/route.ts`, `src/app/app-lock/page.tsx`, `android/app/src/main/java/com/kaiwaai/app/NetworkUtils.kt`, `android/app/src/main/java/com/kaiwaai/app/AppMonitorService.kt`, `android/app/src/main/java/com/kaiwaai/app/MainActivity.kt`, `android/app/src/main/java/com/kaiwaai/app/AppBlockerPlugin.kt`, `src/plugins/app-blocker/definitions.ts`
- New: `src/lib/fallback-cards.ts`, `.agents/DESIGN.md`, `.agents/APP_BLOCKER.md`, `.agents/MOBILE_SETUP.md`, `.agents/LIVE_UPDATES_GUIDE.md`, `.agents/flashcard-session-composer/`
- Deleted: `.kiro/`, `documentation/`
- Tests: 300 passing (41 test files) — lint clean

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
