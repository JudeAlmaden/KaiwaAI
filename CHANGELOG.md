# Changelog

All notable changes to KaiwaAI are documented in this file.

## [Unreleased]

## [2.7.0] - 2026-11-25

### Added
- **Cards sit under Words or Phrases** — whether a card belongs in the Words tab or the Phrases tab is now the card's own property (`kind`), not a guess from the shared dictionary row: AI-saved phrases are stored as `Word` rows with part-of-speech "phrase", so they used to appear as words. New cards inherit the kind from the token they were saved from or the dictionary's part of speech, a migration backfills the existing deck (phrase-backed cards become phrases), and the vocab detail sheet has a **Saved as** switch to move a word-backed card between tabs. Phrase-backed cards stay under Phrases.
- **Sentence Construction** — a standalone `/review/construction` page, separate from vocabulary flashcards. A six-module curriculum (sentence order → particles → adjectives → verbs → questions/negation → expansion) groups 27 concepts as topics; they are mastery tags, not prerequisites, and the endless stream can serve any of them at any time. Five exercise types cover the difficulty range: word-tile **assembly** (shuffled tiles with several decoys, alternative natural orders accepted), **particle selection** with a curated reason each wrong particle fails, **completion** (choices early, typed later), **transformation**, and **production** from English with multiple accepted sentences. Feedback always shows the completed sentence, its English, the rule, a structure breakdown and particle/conjugation highlights; a miss names the specific slip and offers retry or more practice on the same concept. Per-concept attempts, accuracy, streak and next-due time persist in the new `GrammarMastery` table through `/api/grammar/mastery`, difficulty and spacing are derived from those counts, and the adaptive selector prefers weak+overdue concepts, avoids repeating exercises, and prefers words already in the learner's deck. Uses 86 hand-checked N5 sentences, no AI calls, no SRS writes.
- **Type romaji, get hiragana** — typed practice answers convert Latin input as you type (`neko` → ねこ, `gakkou` → がっこう, `matcha` → まっちゃ), so a Japanese IME is optional. Kanji, kana, punctuation, and spaces are left alone, a trailing `n` stays `n` until a consonant, space, punctuation or a second `n` follows (so `ni` becomes に, never んい), and a target counts when you write either its surface form or its reading (五 can be answered as ご).
- **Audio pronunciation** — Japanese audio playback for the target word and the feedback sentence via `speakJa`.
- **Component-aware RTK mnemonics** — mnemonic generation now resolves a kanji's primitive buildup to the keywords you already learned and gives them to the AI as fixed meanings (`八` → "eight", frame #42), so each story builds on earlier keywords instead of re-inventing them. Primitives resolve in one batched query per request and are returned as `components` by `GET /api/kanji/[character]`, `GET /api/kanji/review`, and `GET /api/review/mixed`; the Add Kanji modal, kanji detail page, chat breakdown, review session, and App Blocker all send the same context.
- **Your own component stories are reused** — if you already wrote a mnemonic for a component kanji, the generator sees it and keeps the new story consistent with it.

### Changed
- **Fill the blank prompts read in kanji** — the practice frames were authored in kana (きのう, みずを) because one frame has to fit every tense; the prompt now upgrades the words with an unambiguous everyday kanji form (`私は 昨日 水を ___`). Conversion happens at display time in `lib/review/kanji-frames.ts`, chunk by chunk with the trailing particle kept kana, so answers, accepted spellings, hints and audio are untouched, and unknown words (かばん, ここ) stay as authored. Kanji introduced this way carry ruby readings taken from the kana they replaced (`私` わたし, `手紙` てがみ, `昨日` きのう), because the conversion already knows the reading — no dictionary call. `TappableJapanese` takes an optional `readings` map, so prompts, feedback sentences and word-card examples show furigana while staying tappable.
- **Lookups are cached across reloads, without guessing the sense** — dictionary and AI definitions are now kept in `localStorage` (six hours, 200 entries, oldest pruned) behind the existing `lookup-cache` API, so tapping the same word again does not re-fetch it. Dictionary entries are word-level and shared everywhere; AI definitions are generated from the sentence, so their keys include a hash of that sentence (`ai:word:とる:<hash>`). The same word in a different sentence misses the cache and is looked up with its own context instead of reusing another sense. Keys stay scoped by kind, failures are never cached, disabled storage just means the old fetch-every-time behaviour, and the storage prefix moved to `v2` so context-free `v1` entries are never read.
- **Review practice pages: shared header, honest counters, faster starts** — Construction and Fill the blank now share one back control in `PageHeader` (an icon button beside the title, inside the header instead of an indented text link under it), and the duplicate "Back to review" button in Fill the blank's empty state is gone. The sitting bar no longer shows `0/0` on a fresh page: an endless stream has no target, so it reports `12 answered · 83%`, says "New sitting" before the first answer, hides the accuracy meter and reset until there is something to reset, and renames **End sitting** to **Reset sitting**. Construction's bar is folded into the topic card (topic, goal, counters, focus/reset in one block). Loading no longer waits on the network to show something: Construction serves its first exercise straight from the bundled bank and only uses mastery/deck data for the next pick (no loading state at all), Fill the blank renders a card-shaped skeleton instead of "Loading words…", keeps its built word pool in `localStorage` for 30 minutes so a revisit skips the review round trip, and the unanswered question on screen is remembered locally — id only for Construction, word + form for Fill the blank — so a reload resumes that question instead of silently skipping it. Both carry-overs are same-day, versioned, pruned when the deck or templates change, and drop a question after three unanswered loads.
- **Construction sentences are generated from your deck** — the 86-item curated bank is no longer the whole stream. Saved nouns, verbs and adjectives are turned into extra exercises at load time by deterministic templates (`lib/grammar/deck.ts` + `generated-templates.ts` + `generate.ts`), so the practice grows with the vocabulary you actually added: noun sentences with particles, が + すき, の possession, い/な-adjective predicates and negatives, adjective + noun phrases, conjugation drills for any verb with a known verb type (ます / ません / ました, kanji or kana accepted), and full verb sentences for the verbs that already have a curated scene and object. Generated items reuse the existing 27 concept ids, so mastery, spacing and the topic browser work unchanged; they cap at four drills per word and 160 in total, are deduped, and are labelled **from your deck** so they are distinguishable from curated items. No AI call, no schema change, no new API — deck words come from the review endpoint the page already fetched.
- **Construction tiles are shuffled and noisier** — assembly exercises no longer hand over the sentence in the correct order with a single decoy. The tray is mixed per exercise and carries three to four distractors: the authored one plus derived sibling particles and wrong-tense/wrong-polarity endings for the predicate (`わかります` → `わかりました`, `ありません`), so word order, particle choice and tense all have to be decided. The tray is seeded by exercise id, so an item looks the same on every render, and the footer says how many tiles don't belong. The `from your deck` badge now reads **deck words**, since the badge marks sentences that *use* saved vocabulary — the sentences themselves still come from the curated curriculum bank.
- **Practice split into two pages** — `/review/construction` and `/review/conjugation` are now standalone routes, and `/review` shows one card per mode with live topic/pattern counts, accuracy and a "Continue" chip when a sitting is in progress, fed by the new `GET /api/review/forge-summary`. The 1,050-line practice page was decomposed into a drill hook plus prompt, answer, feedback, word-card and pattern-mastery components; the construction tab moved next to its own page and now shares `TappableJapanese`, `SittingBar`, `useSavedWords` and `useSitting` from `review/components` and `review/hooks`. **This sitting** now survives a reload for the rest of the day (sessionStorage), shows accuracy and a streak, has an explicit **Reset sitting** control, and is shown on both pages and cards. Pressing **H** reveals a hint in either mode (ignored while typing), and the Next / Try again actions stick to the bottom of the viewport on mobile.
- **Tap any word in Construction for its meaning** — particle and completion prompts, the sentence-to-transform, and the answer in feedback are now rendered with the same `TappableJapanese` component as Fill the blank. Tapping a word opens the shared dictionary/AI lookup popup with add-to-deck, using the full sentence as context, and keeps its saved state in sync with the deck (`/api/flashcards?wordsOnly=true` plus the `kaiwa:vocab-removed` event).
- **Construction is an endless stream** — the 27-topic prerequisite ladder and the frozen 24-item round are gone. Every topic is open and each **Next** is chosen on demand from current mastery: weakest and most overdue topics first, difficulty matched to demonstrated accuracy, short in-memory buffers for recently served exercises (30) and topics (5), familiar deck words, and a penalty for repeating the same exercise kind on a topic. Mastery still persists per topic in `GrammarMastery` through `/api/grammar/mastery` with no migration; only the session/round state is gone. The curriculum drawer became a topic browser showing accuracy, attempts, streak, last practiced and next due, and the per-exercise difficulty label was removed from the UI. Logic is split into `lib/grammar/mastery.ts` (scheduling and difficulty) and `lib/grammar/stream.ts` (selection), with the tab composed from small components instead of one file.
- **Delete an archived chat for yourself** — archived rows now carry a trash action beside Restore. It removes the conversation from your list for good instead of parking it in Archived: a group you don't own is left (its history stays for the other members), a persona chat is deleted, and an owner who still shares the chat with someone is told to delete it for everyone. Backed by a new `DELETE /api/groups/[id]/leave`.
- **Read the English after answering** — Fill the blank feedback now includes a full English translation of the completed Japanese sentence, with tense and polarity matched to the practiced form (`wrote`, `did not write`, `is not expensive`, `at all` for ぜんぜん). Scene verbs use curated English glosses so objects read naturally (`listen to music`, `wait for the train`, `get off at the station`), and idiomatic scenes such as 好き and 忙しい get natural phrasing.
- **Tap any word for a definition** — Fill the blank's Japanese prompts, feedback sentences and word-card examples are now word-by-word tappable. Tapping opens the same lookup popup used in chat: dictionary entry first (reading, meanings, common forms, add/remove from the review deck), with the AI definition fallback and kanji breakdown for words the dictionary doesn't have. Words are segmented with `Intl.Segmenter`; the full sentence is passed as AI context, and nothing is looked up until the learner taps.
- **In-exercise conjugation coaching** — Fill the blank now offers optional three-step hints (sentence context → word group → the actual sound change), so a stuck learner can derive the form without revealing it. Feedback is compact by default, shows a `Conjugation breakdown` with the headline, the sound-change line (`す → さ + ない`) and other verbs that follow the same rule, and only expands to "why the other choices fail" on a miss. Depth adapts: first-time/steady correct answers get a brief reminder, hint users get the full rule, and misses get the detailed explanation. Pattern Mastery now records **recognition**, **construction** and **application** separately (new columns on `ConjugationMastery`, stage sent with each answer), shows all three percentages with bars, and weights the queue by the dimension the learner is currently practising. The word card now shows the verb group, every available form (the one being practised is hidden until answering) and an example sentence that deliberately uses a different form.
- **Progressive conjugation practice** — Fill the blank now teaches a pattern instead of only quizzing it, over four stages: **recognition** (a Japanese sentence with the word missing and four choices, form name hidden), **understanding** (the same question, with rule steps and a short reason each distractor fails), **transformation** (dictionary form → named form, typed once the pattern is steady), and **application** (typed into a full sentence with English context). Distractors are curated near-misses — wrong tense, polarity or te-form — not random stored forms; the word card is collapsible; after a miss, "Try a similar one" repeats the pattern with a different word; and the queue starts with the patterns weakest for that learner. Per-pattern attempts, accuracy, streak and next-due time are stored in the new `ConjugationMastery` table through `/api/conjugation/mastery`, while stage and review spacing are derived from those counts. Labels now say "polite non-past", not "polite present".
- **Mnemonic prompt and output** — the prompt now uses the authored primitive buildup (glyphs plus resolved keywords) instead of dictionary radical names, and asks for plain prose. New stories no longer save literal `**Components:**` / `**Story:**` headings into the note.
- **Kanji detail generation** now sends the RTK keyword and frame number it already had in memory.
- **Focus Guard and Endless Zen cards share one row height** — both cards stretch to the taller card in their grid row instead of leaving Endless Zen short with dead space beneath it.
- **Review counts agree across the app** — the nav badge, home “Review N cards” quest, home review-button mix, review page Daily Quest, and the session’s own `0/N` now all show the same projected session total. Two bugs caused the drift: `/api/stats` counted vocabulary only (kanji due cards were invisible), and the mixed composer split the new-card allowance per deck, stranding a share when one deck had no new cards (with 4 kanji new and a 3-card allowance, only 1 was delivered). The allowance now follows the cards that exist, and `fetchProjectedMix` is the single client-side source for the displayed total.
- **Leeches now mean repeated failure, not age** — a card is a leech after **3 lapses** with an interval still under a week. `timesReviewed` no longer decides it, so a heavily reviewed card that keeps succeeding stops being flagged. A lapse is a grade-0 review of a card that was actually due; practising early never counts. The `leeches` pool in all three review routes and the deck-hint copy use the same rule.
- **Lapse counters are stored and backfilled** — additive `lapses` column on vocabulary and kanji cards, backfilled as `GREATEST(0, timesReviewed - repetitions)` from existing history, and cleared by “reset progress”.
- **Word hints build on the kanji they contain** — both review APIs now attach `wordKanji` for every vocabulary card (one batched `kanji.findMany` + `userKanji.findMany` per page, never per glyph). Kai's Breakdown sends those locked keywords and your saved kanji stories to the model with a "never invent a different meaning" rule, so 今週 can reuse 今 = now and 週 = week instead of re-inventing them.
- **Breakdowns use the mnemonic model** — Kai's Breakdown now calls the model chosen for mnemonic stories, not the chat model, so both hints share quality and latency settings.
- **Hint cache is content-aware** — the local breakdown cache is keyed by card id plus a signature of word, meaning, and kanji keywords, so editing a card stops an old hint from being served.
- **Kai's Breakdown is available on every card** — the amber "Tricky word" row is gone. Any card with a word or kanji now shows a compact `Kai's Breakdown` / `New angle` button on its back. Leeches detection and the Leeches deck are unchanged; the label that claimed the algorithm had marked your card tricky no longer exists.
- **Breakdown button polish** — the card action is now a centered pill (no emoji) tinted with the app's indigo accent, and its error message is centered to match.
- **Breakdowns are cached locally** — the last breakdown per card (up to 100) is kept in `localStorage`, so flipping away and back shows the hint instantly instead of paying for another Gemini call. "New angle" still regenerates on demand.
- **Mnemonic model picker** — the Story row in the Add Kanji modal has a compact model selector. The choice is stored separately (`kaiwa_mnemonic_model`), so it no longer follows the chat header's model; with auto-fallback on, the mnemonic model is tried first and the rest of the curated list after it. Unset means "use the chat model", and an unknown stored id is ignored.
- **Bulk paste left the Add Kanji modal** — Single Entry is now the only mode (no tabs, parser, or bulk state), and the modal dropped from 823 to 563 lines. A "Paste many at once →" link in the footer opens the new `/kanji/import` page, which keeps the paste workflow, checks every response, and lists failed rows with their reason instead of counting them as imported.
- **Add Kanji modal asks for one thing** — Heisig keyword, RTK frame, and primitive buildup are no longer three full-width inputs. They render as a single summary row (keyword chip, `#frame`, `亠 → 八` chips) with an "Edit RTK data" disclosure that reveals them only when the lookup is wrong. Single entry now shows just character, story, and folder.
- **Add Kanji footer reduced to one primary action** — "Save & Add Another" became an "Add another" checkbox beside Save, and the redundant Cancel button is gone (✕ and Escape close the modal). Dead `initial*` props and the duplicated primitive hint were removed, and the subtitle is one line.
- **Add Kanji modal scaffolding resets on open** — the shared create-folder flag and name are cleared, so a folder name typed in Bulk Paste no longer appears in Single Entry (or vice versa) the next time the modal opens; it also reopens on the Single tab with the bulk folder selection reset.
- **One mnemonic save path** — the detail page, AI story, chat notes, review hint, and App Blocker now all write through `PUT /api/kanji/[character]/mnemonic`. It upserts the note and syncs a study card only when one already exists; blank text deletes the note. `PATCH` on the same route and the legacy `/mnemonic/save` remain as thin aliases so older clients keep working.

### Fixed
- **Editing a card's reading or meaning no longer overwrites your note** — correcting a dictionary card used to write a `Meaning: … | Reading: …` string into the personal note, so a note could never be used for actual notes and the correction vanished from review. Corrections are now per-card `readingOverride` / `meaningOverride` values that the vocab list, both review routes, `/api/flashcards`, Kai's word list and the kanji detail all read, and an empty value clears the override back to the dictionary. The shared `Word` row is never modified.
- **The add-word button no longer scrolls away** — the lookup FAB sat inside the vocabulary list's scroll container, so it left the screen as soon as you scrolled; it is now pinned to the viewport above the floating mobile nav. Its popup is capped to the viewport width so it no longer overflows narrow phones.
- **Generating a mnemonic no longer enrols the kanji** — the old review `PATCH /mnemonic` created a `UserKanji` row with `status: "new"` as a side effect of saving a story. The unified write path only updates cards that already exist, so generating a hint can't silently add a kanji to the review list.
- **Add Kanji modal closes like a modal** — Escape and a backdrop click (outside the panel) close it, Tab is trapped inside while open, background scrolling is locked, and focus returns to the trigger on close. It also announces itself with `role="dialog"` / `aria-modal` / `aria-labelledby`.
- **Add Kanji rejects multi-character input** — the character field is NFKC-normalized and must be exactly one character; entering `六六` now shows an inline error instead of saving the whole string, and the lookup only runs for a valid single character.

### Technical
- New: `src/lib/kanji-mnemonic/types.ts`, `src/lib/kanji-mnemonic/context.ts`, `src/lib/kanji-mnemonic/context.server.ts`, `src/lib/kanji-mnemonic/prompt.ts`, `src/lib/kanji-mnemonic/mnemonic-store.ts`, `src/lib/kanji-mnemonic/save-client.ts`, `src/lib/kanji-mnemonic/context.test.ts`, `src/lib/kanji-mnemonic/prompt.test.ts`, `src/lib/kanji-mnemonic/context.server.test.ts`, `src/lib/kanji-mnemonic/mnemonic-store.test.ts`, `src/lib/kanji-mnemonic/save-client.test.ts`
- Modified: `src/lib/kanji-mnemonic-client.ts`, `src/lib/kanji-mnemonic-client.test.ts`, `src/app/api/kanji/[character]/route.ts`, `src/app/api/kanji/[character]/mnemonic/route.ts`, `src/app/api/kanji/[character]/mnemonic/save/route.ts`, `src/app/api/kanji/review/route.ts`, `src/app/api/kanji/review/route.test.ts`, `src/app/api/review/mixed/route.ts`, `src/app/api/review/mixed/route.test.ts`, `src/app/(app)/kanji/AddKanjiModal.tsx`, `src/app/(app)/kanji/[character]/KanjiDetailClient.tsx`, `src/app/(app)/chat/kanji-breakdown/types.ts`, `src/app/(app)/chat/kanji-breakdown/KanjiMnemonicSection.tsx`, `src/app/(app)/review/card-types.ts`, `src/app/(app)/review/hooks/useReviewQueue.ts`, `src/app/(app)/review/components/ReviewSessionView.tsx`, `src/app/app-lock/page.tsx`
- New (Add Kanji modal M0): `src/lib/kanji-input.ts`, `src/lib/kanji-input.test.ts`
- Modified (Add Kanji modal M0–M3): `src/app/(app)/kanji/AddKanjiModal.tsx`
- New (bulk import page): `src/app/(app)/kanji/import/page.tsx`
- Modified (mnemonic model picker): `src/lib/model-config.ts`, `src/lib/model-config.test.ts`, `src/lib/kanji-mnemonic-client.ts`, `src/lib/kanji-mnemonic-client.test.ts`
- New (breakdown everywhere): `src/lib/review/breakdown.ts`, `src/lib/review/breakdown-cache.ts`, `src/lib/review/breakdown.test.ts`, `src/lib/review/breakdown-cache.test.ts`
- Modified (breakdown everywhere): `src/app/(app)/review/ReviewCardParts.tsx`
- Modified (unified hints): `src/lib/card-breakdown-client.ts`, `src/lib/card-breakdown-client.test.ts`, `src/lib/review/breakdown-cache.ts`, `src/lib/review/breakdown-cache.test.ts`, `src/app/(app)/review/ReviewCardParts.tsx`, `src/app/(app)/review/card-types.ts`, `src/app/api/review/mixed/route.ts`, `src/app/api/flashcards/review/route.ts`, `src/app/api/flashcards/review/route.test.ts`
- Modified (lapse leeches): `prisma/schema.prisma`, `prisma/migrations/20261123150000_add_lapses/migration.sql`, `src/lib/fsrs/apply-review.ts`, `src/lib/review/leech.ts`, `src/lib/review/leech.test.ts`, `src/lib/fsrs/review-payload.test.ts`, `src/app/api/review/mixed/route.ts`, `src/app/api/flashcards/review/route.ts`, `src/app/api/kanji/review/route.ts`, `src/app/api/learning/reset/route.ts`, `src/lib/review/session-plan.ts`, `src/app/(app)/review/card-types.ts`, `src/app/(app)/review/types.ts`, and the three review route tests
- Modified (batched word context): `src/app/api/review/mixed/route.ts` (one lookup for primitives + word kanji), route tests for `wordKanji` and batch counts
- Database: migration `20261123150000_add_lapses` applied; backfill audit 0 mismatches (156 vocab, 5 kanji cards)
- Modified (count consistency): `src/lib/dashboard-stats.ts`, `src/app/api/stats/route.test.ts`, `src/app/api/review/mixed/route.ts`, `src/app/api/review/mixed/route.test.ts`, new `src/lib/review/session-ready.ts`, `src/app/(app)/AppNav.tsx`, `src/app/(app)/review/ReviewClient.tsx`, `src/app/(app)/home/KaiRoomClient.tsx`
- New (review practice): `src/lib/grammar/*` (curriculum, exercises, generated templates, deck, noise, stream, mastery, carryover), `src/lib/review/{conjugation,conjugation-mastery,conjugation-patterns,kanji-frames,practice-cache,sentence-frames,sentence-task}.ts` (+ tests), `src/lib/{local-store,lookup-cache,japanese-input}.ts`, `src/app/(app)/review/{construction,conjugation,components,hooks,quest-cards}/*`, `src/app/api/{grammar,conjugation}/mastery/route.ts`, `src/app/api/review/forge-summary/route.ts`, migrations `20261125120000_add_conjugation_mastery`, `20261125160000_add_grammar_mastery`, `20261125170000_add_conjugation_dimensions`
- New (card kinds and overrides): migrations `20261124120000_add_card_kind`, `20261124130000_drop_unused_card_kind_index`, `20261124140000_add_card_overrides`
- New (chat): `src/app/api/groups/[id]/leave/route.ts` (+ test)
- Modified (card kinds and overrides): `prisma/schema.prisma`, `src/app/api/flashcards/route.ts`, `src/app/api/flashcards/[id]/route.ts`, `src/app/api/kai/word/route.ts`, `src/app/api/kanji/[character]/route.ts`, `src/app/api/review/mixed/route.ts`, `src/app/(app)/vocab/types.ts`, `src/app/(app)/vocab/VocabDetailSheet.tsx`
- Modified (chat delete): `src/app/(app)/chat/ChatHub.tsx`, `src/app/(app)/chat/ChatRail.tsx`, `src/app/(app)/chat/InboxList.tsx`, `src/app/(app)/chat/useInbox.ts`
- Modified (vocab polish): `src/app/(app)/vocab/VocabList.tsx`, `src/app/(app)/vocab/LookupBox.tsx`, `src/app/(app)/vocab/ConjugationTutorial.tsx` (now reuses the review conjugation builders)
- Modified (tooling): `eslint.config.mjs` (registers the `react-hooks` plugin so the override loads, ignores `.agents/**`), `src/app/(app)/kanji/AddKanjiModal.tsx` (stale disables removed)
- Deleted (removed practice route): `src/app/(app)/review/sentence/page.tsx`
- Tests: 1080 passing (119 files) — lint and typecheck clean
- `npm run lint` is blocked by a pre-existing ESLint config error (`react-hooks/set-state-in-effect` is set without registering the `react-hooks` plugin in `eslint.config.mjs`); the config is unchanged by this work.

## [2.6.2] - 2026-11-22

### Changed
- **Automatic top notch & status bar safe-area detection** — the mobile notch setting now defaults to **Auto**, dynamically respecting the device hardware safe-area top inset (`env(safe-area-inset-top)`) without requiring manual adjustment. Manual pixel presets and slider adjustments remain available as overrides, with an "Auto" pill button to restore device-native spacing at any time.

### Technical
- Modified: `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/settings/MobileNotchCard.tsx`, `src/lib/mobile-notch.ts`, `src/lib/mobile-notch.test.ts`
- Tests: 866 passing (96 suites) — lint/typecheck clean

## [2.6.1] - 2026-11-21

### Added
- **Ambient @Kai summon in direct 1:1 user DMs** — users can now summon Kai directly inside 1:1 human-to-human DMs by typing `@Kai` or selecting Kai from the mention autocomplete popup. Kai participates in the conversation to translate, answer language questions, or explain Japanese grammar and vocabulary using interactive furigana/audio bubbles, without requiring users to leave their private DM or create a separate group chat.

### Changed
- **Group chat reply button & bubble grouping polish** — fixed awkward consecutive bubble shaping in `GroupBubble.tsx`. Previously, middle bubbles in a run had symmetric rounded corners that looked inverted next to each other. Adopted standard Messenger/iMessage bubble grouping (top message has rounded-br-sm, middle messages have rounded-r-sm, bottom message has rounded-tr-sm), with reply buttons clean on hover/swipe.
- **Streamlined Kai summon & keyboard-navigable autocomplete** — removed the floating `✓ Kai will reply` banner above the input box completely. Enhanced the mention autocomplete menu with full keyboard navigation (`ArrowUp` / `ArrowDown` to navigate, `Enter` / `Tab` to select, `Escape` to dismiss) and styled `@mentions` directly inside message bubbles as clean inline pills (`bg-white/20` in user bubbles, `bg-indigo-ai/15` in received bubbles).
- **Review card breakdown & tricky card UI polish** — merged the separate `⚠️ Leech` tag and `🩺 Kai's Breakdown` button into a single unified helper pill (`💡 Tricky word · Kai's Breakdown ✨`) in `ReviewCardParts.tsx`, decluttering the vertical stack and replacing clinical icons with intuitive learning indicators.
- **Chat responsiveness & latency optimization** — eliminated the serial upfront `checkJapaneseGrammar` API call that was previously running before Kai's turn generation (Kai's generation already handles Japanese grammar feedback in a single roundtrip). Human messages in group and DM chats now display optimistically and instantly on the UI without waiting for server roundtrips, reducing message dispatch latency by 1.5–3s.
- **Modularized KanjiClient monolith** — broke down `src/app/(app)/kanji/KanjiClient.tsx` from 1,353 lines down to ~360 lines following single-responsibility principles. Extracted dedicated subcomponents under `src/app/(app)/kanji/components/`: `KanjiHeader`, `KanjiNavigation`, `KanjiFoldersGridView`, `KanjiFolderDetailView`, `KanjiAllGridView`, `KanjiDetailModal`, `CreateFolderModal`, `EditFolderModal`, and `ImageLightbox`. Reduced layout re-render scope and separated modal workflows into clean isolated boundaries.
- **Modularized KanjiBreakdown monolith** — decomposed `src/app/(app)/chat/KanjiBreakdown.tsx` from 913 lines down to ~330 lines. Extracted dedicated submodules under `src/app/(app)/chat/kanji-breakdown/`: `KanjiGlyphHeader` (glyph, badges, audio), `KanjiDetailsBody` (meanings, readings, primitives), `KanjiMnemonicSection` (AI story generator, textarea draft, save handler), and `KanjiFolderActions` (queue status, move folder, inline create).
- **Modularized Gemini API library monolith** — decomposed `src/lib/gemini.ts` (870 lines) into focused single-responsibility domain modules under `src/lib/gemini/`: `types.ts`, `sanitizers.ts`, `lookup.ts`, `summary.ts`, `mnemonics.ts`, and `chat.ts`. Retained a backwards-compatible barrel export in `src/lib/gemini.ts` ensuring zero call-site breakage across all routes and background tasks.
- **Modularized ReviewClient monolith** — refactored `src/app/(app)/review/ReviewClient.tsx` (760 lines down to ~220 lines). Extracted review state machines and active card queues into `useReviewQueue.ts`, encapsulated the 3D-card presentation and keyboard shortcuts in `ReviewSessionView.tsx`, and consolidated shared interfaces into `types.ts`.

### Fixed
- **Chat message flash/disappear on send** — fixed a race where the Pusher `new-messages` WebSocket event arrived mid-send while `busyRef.current` was true, causing the optimistic message to be briefly removed then re-added. The Pusher handler now skips processing while a send is in-flight; the HTTP response handler performs the atomic swap instead.
- **Pusher channel authorization & privacy** — transitioned group chat channels from public `group-${groupId}` to authenticated `private-group-${groupId}`. Implemented `POST /api/pusher/auth` ensuring only active, accepted group members can subscribe to real-time chat updates.
- **AI persona message spoofing mitigation** — restricted client-provided `aiReply` injections in `POST /api/groups/[id]/messages` strictly to 1:1 persona rooms, preventing message forgery in multi-user group chats. Enforced 1:1 chat verification on proactive turn generation.
- **Shared dictionary table immutability** — prevented global dictionary poisoning in `POST /api/kanji/[character]/learn` and `PATCH /api/flashcards/[id]`. User edits are now strictly isolated to `UserKanji` and `UserFlashcard.note` / `UserFlashcard.customMeaning`, leaving canonical `Kanji` and `Word` dictionary entries immutable across tenants.
- **Authentication rate limiting** — added sliding-window rate limiters for `POST /api/auth/login` (5 attempts/min per IP and email) and `POST /api/auth/register` (3 attempts/min per IP) to prevent brute-force attacks and automated registration spam.
- **Session invalidation on password change** — added `tokenVersion` to `User` and JWT session payloads. Password resets increment `tokenVersion`, immediately revoking all other active JWT sessions across devices while seamlessly re-issuing a refreshed token to the updating client.

### Technical
- Modified: `prisma/schema.prisma`, `src/lib/rate-limiter.ts`, `src/lib/session.ts`, `src/lib/auth-helpers.ts`, `src/lib/gemini.ts`, `src/lib/pusher-client.ts`, `src/lib/pusher-server.ts`, `src/app/api/auth/login/route.ts`, `src/app/api/auth/register/route.ts`, `src/app/api/settings/password/route.ts`, `src/app/api/groups/[id]/route.ts`, `src/app/api/groups/[id]/route.test.ts`, `src/app/api/groups/[id]/messages/route.ts`, `src/app/api/groups/[id]/messages/route.test.ts`, `src/app/api/groups/[id]/proactive/route.ts`, `src/app/api/kanji/[character]/learn/route.ts`, `src/app/api/flashcards/[id]/route.ts`, `src/app/(app)/groups/[id]/GroupChatClient.tsx`, `src/app/(app)/groups/[id]/GroupBubble.tsx`, `src/app/(app)/kanji/KanjiClient.tsx`, `src/app/(app)/kanji/components/EditFolderModal.tsx`, `src/app/(app)/chat/KanjiBreakdown.tsx`, `src/app/(app)/review/ReviewClient.tsx`
- New: `src/app/api/pusher/auth/route.ts`, `prisma/migrations/20261121150000_add_token_version/migration.sql`, `src/lib/gemini/types.ts`, `src/lib/gemini/sanitizers.ts`, `src/lib/gemini/lookup.ts`, `src/lib/gemini/summary.ts`, `src/lib/gemini/mnemonics.ts`, `src/lib/gemini/chat.ts`, `src/lib/gemini/index.ts`, `src/app/(app)/review/types.ts`, `src/app/(app)/review/hooks/useReviewQueue.ts`, `src/app/(app)/review/components/ReviewSessionView.tsx`, `src/lib/auth-helpers.test.ts`, plus kanji subcomponents
- Deleted: None
- Tests: 863 passing, 96 suites — fully lint/typecheck clean


## [2.6.0] - 2026-11-21

### Added

- **Real-time WebSocket Messaging via Pusher Channels** — added scalable real-time WebSocket communication for group chats and DMs using Pusher Channels (`pusher` on server, `pusher-js` on client). Incoming messages trigger instant pushes across clients in `< 50ms` on channel `group-${groupId}`, eliminating database and Vercel compute overhead. Includes graceful automatic fallback: if Pusher environment variables are not yet configured, the client smoothly falls back to 3-second HTTP polling; when Pusher is active, polling drops to a quiet 30-second background sync.
- **@mention Autocomplete & Summon Chip in Group Chats** — added interactive autocomplete for @mentions in group chats, matching group members and AI personas with tab/click auto-insertion. Added a top summon chip (`@Summon Kai` / `✓ Kai will reply`) so users can summon the AI companion into group conversations effortlessly.
- **In-context Conversation Memory Modal** — replaced page redirects to `/memory` with an in-context `MemoryModal` scoped directly to the active conversation or group. Removed confusing global/convo scope toggles and all decorative emojis in favor of a clean, typography-first UX with text category pills (`All`, `Profile`, `Preference`, `Fact`, `Goal`, `Relationship`), discrete delete actions, and an integrated category select add bar. Verified and extended prompt injection across both client-side BYOK and server fallback (`generatePersonaReply` in `group-chat.ts` and `messages/route.ts`) so AI models actively recall and converse with remembered notes.
- **Top notch & status bar padding setting** — added a setting under Settings → Mobile to adjust top padding (`--mobile-notch-offset`) for devices with camera cutouts or status bars overlapping the header. Provides presets (Off, Subtle, Standard, Notch, Tall) and a slider, synced to localStorage and applied immediately on mobile screens.
- **Custom attitudes for Kai** — users can now create, edit, and delete custom attitudes for Kai directly from the attitude picker in `ConvMenu` (1:1 chats) and `GroupSettings`. Saved as `kind: "kai_mode"` personas linked to Kai.
- **Unified search and add with debounced search & scrolling** — unified friend search and add-by-email into a single bar in `PeopleSheet` and `NewChatSheet`, removing the redundant bottom input boxes. Typing an email provides an inline Add/Send button, Enter key submission, and an in-list action card; search queries are debounced (`useDebounce`, 180ms) for responsive typing, and scrolling debounces keyboard dismissal on mobile and throttles chat transcript pagination.
- **Redesigned Group Creation** — transformed the New group tab in `NewChatSheet` into a Messenger-style flow with top group name field, selected member tag strip with removal chips and `(X/4)` cap indicator, and consistent avatar friend rows with checkmark selection toggles.

### Fixed

- **Kai SVG hair/ahoge missing on mobile** — converted `Kai.tsx` to a client component using `useId()` to generate globally unique SVG gradient IDs per instance. Previously, multiple `<Kai>` components at the same size (e.g. inbox list) shared the same `id`, causing browsers to silently reuse the first gradient definition found in the DOM — stripping the hair gradient on mobile. Removed the `<clipPath>` sheen element and added a solid fill fallback layer for extra robustness.
- **Gemini Multiturn Alternation Normalization & Multi-User Group Context** — implemented `normalizeGeminiContents` in `src/lib/gemini.ts` to merge consecutive same-role turns (`user` + `user` or `model` + `model`) and guarantee the first turn begins with `user`, preventing Gemini API `400 Alternation` errors across BYOK client turns and proactive follow-ups. In group chats, history turns now prefix the human sender's display name (`senderName: content`) so the AI companion understands multi-user conversational context and addresses participants naturally.
- **Message Key Duplication & Polling Race in Group Chat** — implemented strict message deduplication (`dedupeMessages`) across initial load, pagination, sending, and polling. Polling is paused during active message transmission (`busyRef.current`) to eliminate concurrency races between the optimistic/POST response and the 3s poller that caused repeated messages and React duplicate key console errors.
- **AI Typing Indicator Decoupled from Plain Message Sending** — decoupled the persona typing indicator (`aiTyping`) from generic message sending (`sending`), preventing the AI typing animation from flashing when sending human-to-human messages in group chats or DMs.

### Changed

- **Clean Typography-first Menu & Settings UI** — stripped decorative emojis from `ConvMenu` and `GroupSettings` attitude pickers (converting them to clean typography pills), replaced emoji icons with standard Phosphor icons (`Gear`, `Brain`, `Bell`, `BellSlash`, `UserPlus`, `UserMinus`, `Broom`, `Trash`), and unified the 1:1 conversation memory menu item to "Conversation memory" with clear single-conversation scoping.

### Removed

- **Personas & Roleplay Quests from People & New Chat** — removed the "Your personas" / "+ Create" persona management section from `PeopleSheet` (which is now strictly for friends and requests), and removed the "Roleplay quest" launcher from New Chat.

### Technical

- Modified: `package.json`, `package-lock.json`, `src/app/layout.tsx`, `src/app/(app)/layout.tsx`, `src/app/(app)/settings/SettingsClient.tsx`, `src/app/api/personas/route.ts`, `src/app/api/personas/[id]/route.ts`, `src/app/api/groups/[id]/route.ts`, `src/app/(app)/groups/[id]/group-types.ts`, `src/app/(app)/groups/[id]/ConvMenu.tsx`, `src/app/(app)/groups/[id]/GroupSettings.tsx`, `src/app/(app)/groups/[id]/GroupChatClient.tsx`, `src/app/(app)/groups/[id]/conversation-menu.ts`, `src/app/(app)/chat/PeopleSheet.tsx`, `src/app/(app)/chat/NewChatSheet.tsx`, `src/app/(app)/chat/MemorySuggestions.tsx`, `src/lib/group-chat.ts`, `src/app/api/groups/[id]/messages/route.ts`, `src/lib/message-serialize.ts`, `src/lib/gemini.ts`, `src/lib/gemini.test.ts`, `src/app/Kai.tsx`, `.env.example`
- New: `src/app/(app)/chat/MemoryModal.tsx`, `src/lib/mobile-notch.ts`, `src/lib/mobile-notch.test.ts`, `src/app/(app)/settings/MobileNotchCard.tsx`, `src/app/(app)/groups/[id]/CustomAttitudeModal.tsx`, `src/hooks/useDebounce.ts`, `src/lib/debounce.ts`, `src/lib/debounce.test.ts`, `src/lib/email-utils.ts`, `src/lib/email-utils.test.ts`, `src/lib/pusher-server.ts`, `src/lib/pusher-client.ts`
- Deleted: None
- Tests: 852 passing, 95 suites — fully lint/typecheck clean

## [2.5.0] - 2026-11-21

### Added

- **Conversation memory** — every group and friend DM now has its own memory bucket (`Memory.chatId`) instead of sending you to Kai's global diary. The group menu opens **Group memory** and keeps Kai's global memory as a second entry; a DM opens **Chat memory**. Notes are per user (only the signed-in member sees them), dedupe runs inside their own bucket, auto-saved suggestions from a group land there, and `GET /api/chat/context` injects the conversation's notes alongside the persona's global memory. `/memory?chat=<id>` renders the scoped diary with a link back to persona memories.
- **Group nicknames** — human members can carry a nickname that applies only inside one group (24 characters, owner or the member themselves can set it). `ChatMember.nickname` resolves to the displayed member name in Group settings, the member subtitle, the inbox preview and every message from that member, while their account name and other chats stay untouched. Honoured in `PATCH /api/groups/[id]/members/[memberId]`.
- **Groups own Kai's attitude** — Hana/Riku/Sora no longer exist as characters anywhere in the UI: they are Kai's attitudes (Calm, Playful, Thoughtful) and never appear by name. Every Kai conversation stores the attitude it owns in `Chat.activeModeId`; a new group can pick one at creation (or start on Kai's default), and the owner can switch it for the whole room from the header chip (which everyone sees but only the owner can change). `@Kai`, Kai's avatar, memories and profile stay the same across attitudes — only the voice changes. Existing conversations that used a preset (1:1 or group) are converted: their persona member becomes Kai, the preset becomes the chat's attitude, the chat and its historical persona messages read as Kai, and their memories move to Kai's shared memory. New chat lists Kai once under **Kai** plus **Your personas**, New group offers **Kai or your persona** with attitude chips, and People only manages personas you created.
- **Kai personalities (data layer)** — built-in Hana/Riku/Sora are now personalities of Kai rather than separate characters. `Persona.kind` is `kai` for Kai, `kai_mode` for a personality, or `custom` (the default), and `kai_mode` rows point at Kai through `Persona.modeOfId`; existing built-in rows are upgraded in place, so legacy chats keep their persona FK and are otherwise untouched. A Kai conversation stores the chosen personality in `Chat.activeModeId`, and the Kai prompt is composed as Kai's base voice plus the mode's character text — in the chat detail (`GET /api/groups/[id]`, which the BYOK client uses) and in the server fallback generation, so both paths speak with the same voice. `resolveKaiId()` replaces the name-based Kai lookup for new code. `PATCH /api/groups/[id]/mode` with `{ modeId }` (or `null` to reset) validates that the personality belongs to that Kai conversation; the AI personas list now returns `kind`/`modeOfId`. The New chat and People surfaces are unchanged in this phase, so the four presets still appear as before.
- **Message-request rate limit** — one account can send at most 5 new message requests an hour. The count comes from the sender's own `Chat` rows (kind `dm`, created in the last hour) whose other member is not an accepted friend, so it holds across serverless instances, chatting with friends and opening an existing conversation don't spend it, and a declined request (its membership row is gone) still counts — declining can't reset the budget. The count and the insert run in one `$transaction` behind a transaction-scoped `pg_advisory_xact_lock` keyed on the sender, so simultaneous requests from one account queue up instead of both passing the check, and the lock cannot leak through the pooler. The 6th attempt returns 429 with “You can send 5 message requests an hour. Try again later.”
- **Message requests** — `POST /api/groups` now accepts `email` and starts a DM with that account. A friend is added as an accepted member (so it behaves like today's DM); anyone else is added as a **pending** member, and their `/api/invites` payload carries `kind: "dm"` so People → Requests can say “Hana wants to message you”. Accepting the request (`PATCH /api/invites/[id]`) turns it into a normal conversation. Requesting someone who already requested you returns 409 with a pointer to People → Requests.
- **Random stranger chat (Phase 0 + 1, behind `STRANGER_CHAT_ENABLED`)** — a new **Meet** tab in `/chat` opens `/chat/strangers`, a lobby that queues you for an anonymous one-on-one room with another learner. Both sides get a throwaway alias ("quiet tanuki") instead of a name, matchmaking is a single atomic claim so two people can never grab the same waiter, and the room polls every 2 s for new messages. **Next** skips straight into a new search; leaving and skipping both stamp the participant and end the room for both sides, while the transcript stays readable until it is reaped. Rooms are deliberately separate from the normal conversation list: 30 min idle, 2 h hard cap, and no rows in `Chat`/`ChatMember`/`Message`.
- **Cron-free cleanup for stranger rooms** — expired queue entries and rooms are filtered on every read and reaped opportunistically by `maybeRunStrangerCleanup()` (throttled to once a minute per server instance, fire-and-forget, idempotent deletes). Ended rooms linger 10 minutes so the other side can still read "they left", then cascade away. No Vercel cron and no advisory lock (which would leak through the pgbouncer transaction pooler).
- **Safety scaffolding for stranger chat** — `StrangerBlock` rows are honoured in both directions by matchmaking, and `StrangerReport` is in place for the Phase 3 report UI. Text is capped at the existing 200 characters and rate-limited by a DB count (8 messages / 10 s), so the limit holds across serverless instances.
- **DB-backed cap on new stranger rooms** — a learner can open at most 6 rooms in 10 minutes, counted from their own `StrangerParticipant` rows rather than process memory, so the limit survives Vercel's instances. A capped caller is dropped from the queue (so nobody can pair with them by accident) and the lobby shows when the door reopens ("about 5 min") instead of searching forever. The window matches the ended-room retention, so the rows the cap counts are the rows the reaper already keeps that long.
- **Stranger chat documented in the env table** — `STRANGER_CHAT_ENABLED` now sits with the other `.env` values in the README, including what it turns on and that the `Stranger*` migration must be applied first.
- **Stranger chat now looks like the rest of the app** — the Meet card in `/chat`, the lobby and the room were re-skinned in the shipped visual language instead of their own gradient treatment: the hub card is a bordered `bg-card` card with violet/mint chips and a full-width violet CTA, the lobby's online count is a mint chip, the capped state reads as a warm amber note, and a failed search's button says **Try again**. The room gained a card-coloured translucent header with a bordered back control, a live presence line ("here now" / "away" / "left the chat"), day dividers built from the app's hairline-and-label pattern, `rounded-2xl` bubbles at 78 % width with timestamps only on the last bubble of a group, and an ended state that is a bordered card rather than a bare strip.

### Added

- **Group settings** — the conversation's **⋯** menu now opens a **Group settings** panel: rename the group, see members (including pending invites), invite accepted friends, remove members, and leave the group. The same panel manages Kai: add or remove Kai, pick Kai's attitude, and open Kai's memory. Owners can edit; other members see the member list and can leave.

### Changed

- **Archived is a real, durable place** — the collapsible section and the row ellipsis are gone. A **Chats / Archived (n)** switch appears once something is archived, filters with the same search, and marks unread activity on the tab and rows. DM and group rows archive with swipe-left on phones or a hover/focus icon on desktop; Kai's thread deliberately has no archive action (hiding it only surfaced the “start chatting” hero for the same chat) and is muted from its conversation menu instead. New messages no longer clear the hidden flag, so a chat stays archived until **Restore**; archived rows can still be opened without unarchiving.
- **Kai can be muted per chat** — 1:1 Kai conversations get **Mute Kai** in the ⋯ menu, which stops proactive openers and follow-ups in that chat (localStorage `kaiwa_chat_muted_<id>`); Kai still replies normally when you speak to her.
- **The conversation menu now speaks in group terms** — adding to the previous group-management work: in a group the diary entry reads **Kai's memory** (or the persona's diary) instead of "Open full diary", a quest reads **Start a quest with Kai** and only appears when Kai is in the group, and clearing messages is offered to the owner only, with copy that says it empties the group for everyone. Non-owners' delete action reads **Hide group** and states they stay a member; the owner's reads **Delete this group**.
- **Personas moved out of the creation sheets into the conversation menu** — New chat now lists friends only (Kai is reached from the inbox hero/Kai thread, not the compose list), and New group creates a human group with no persona section. Kai's controls live in the **⋯** menu: a 1:1 Kai chat or a group that has Kai shows **Kai's attitude** (Default + Calm/Playful/Thoughtful, owner-only, applies to everyone in that chat), and a group owner whose group has no AI gets **Add Kai to this group** and **Remove Kai**. The header attitude chip is gone, so there is one place to change it. Custom personas are still created and managed in People → **Your personas**.
- **The floating New chat button is gone from the phone hub** — the header pencil and the empty-state button are the only compose actions, so nothing floats over the last conversation row any more.
- **Phones pin the same search row as the rail** — the phone hub used to show a search field inside the list only once there were more than three conversations. Search is now pinned under the header and appears with any number of chats, and both surfaces order the inbox the same way (search, requests, queue, list, Meet), so the mobile hub carries the same People/New chat buttons, pending badge, requests, queue, Meet row and both sheets as desktop.
- **People and New chat are separate sheets again, with different jobs** — **People** is management only: requests (friend requests, group invites and message requests), friends with search/remove and add-by-email, and AI personas with their create/edit/delete UI. It has no chat or group actions. **New chat** is writing only: message a friend, message a persona, send a **message request** by email to someone who is not a friend yet, create a group, or start a roleplay quest. The pencil/FAB open New chat with search focused; the people icon opens People. Neither sheet carries “Meet someone new” any more — that is the row at the end of the conversation list.
- **One people sheet replaces New chat and the personas page** — the contacts/creation surfaces were collapsed into a single modal. `PeopleSheet` now has two modes: **People** (a requests block, friends with add-by-email and a sent line, and AI personas with their create/edit UI inline) and **New group** (friend chips, optional persona, name, Create). The separate `ComposeSheet` is deleted — the rail pencil, the phone pencil/FAB and the empty state open the same sheet with search focused — and `/chat/personas` is now a redirect, its `PersonaManager` rendering inside the sheet in a new compact row style. "Meet someone new" exists once, as the row at the end of the conversation list; the sheet footers that duplicated it are gone. `?compose=`/`?tab=` links still resolve (one release), and `/chat/strangers` now redirects to `?queue=1`.
- **The inbox is a conversation list again** — the People group no longer sits under the conversations. Requests collapse into one **Requests · N →** row that opens the People sheet (Requests / Friends / AI plus **Meet someone new**), inline friend requests, add-by-email, persona rows and the Meet card are gone from the column, and the rail regains its **Chats** header with People and New chat buttons (the search field loses its inline `+`). The compose sheet was rebuilt around people instead of four tiles: a **People / New group** switch, one searchable list of friends and personas, inline add-by-email with a **Sent** line, and the empty state is now a single **New chat** prompt rather than three suggestion chips. A **Meet someone new** row closes the conversation list (online count, or *Looking for someone…* while queued), so stranger matching is one tap from the inbox without opening the People sheet.
- **Friends and matching live inside `/chat`** — the `/friends` page and the rail's Chats · Friends · Meet chips are gone. `/chat` is one scrolling inbox: friend requests and group invites are actionable rows at the top, the stranger queue is a row that keeps running while you browse instead of a dialog that cancels on close, and a **People** sheet holds requests, friends (tap to open the DM), add-by-email, AI personas and **Meet someone new**. Search and compose are pinned above the rail so they are reachable from any scroll position, `/friends` redirects to `/chat?panel=people`, and the sidebar's People group is gone entirely — Friends and Meet a stranger now live only inside `/chat`. One `InboxProvider` owns conversations, people and the queue for the whole `/chat` subtree, which also removes the duplicate `/api/groups` fetch the split view had.
- **The desktop sidebar folds inside `/chat`, with a pin toggle** — on `lg`, `/chat` and `/chat/c/[id]` render the sidebar as a 72 px icon strip: brand mark, Talk-to-Kai sparkle, the same nav icons with badges (unread pulse, due count) and hover labels. A floating circular toggle on the divider above the profile card pins either state in `localStorage` (`kaiwa:sidebar-expanded`) on every route; both states share one header row, CTA height, and reserved section-label spacing, so switching never shifts the links. That returns ~184 px to the conversation list and the message pane. Phones are untouched.
- **The open conversation row is softer** — the selected row in the list is a violet tint with a left accent bar instead of a 2 px indigo ring, so it sits at the same visual weight as the rest of the list.
- **Desktop `/chat` is a Messenger-style split view** — from `lg` up, `/chat` and `/chat/c/[id]` are one page: a fixed 360 px rail is just a list column — **Chats · Friends · Meet** chips, then a search row whose violet **+** starts a new chat, then the conversation list with the open row marked (no second title or friends/pencil header, since the app sidebar already names this screen), while the selected chat opens in the pane beside it and `/chat` itself shows "No chat selected" with a **New chat** button. Friends in the rail is a compact summary (waiting count, friend list, **Manage friends** → `/friends`) and Meet is the online card with **Meet someone** opening the existing queue dialog, so friends, matching and every chat live on one URL. The rail is mounted by a new `chat/(inbox)/` route group, so it survives navigation and the stranger room stays full screen; phones render exactly as before. The list and its loading rules moved out of `ChatHub` into `InboxList` + `useInbox`, shared by both surfaces.
- **`/chat` is one inbox with a compose sheet** — the Chats · AI · Friends · Meet tab row is gone. Persona chats, DMs and groups now share one recency list, with identity carried by the avatar rather than a tab; a requests banner replaces the Friends tab's badge, and the empty state offers start-here chips instead of a dashed box. A 56 px floating **New chat** button sits above the island nav on phones (desktop keeps the header pencil) and opens a four-tile sheet: **Talk to AI** (personas plus **Manage personas** and **Roleplay quest**), **Message a friend**, **Start a group**, and **Meet a stranger**, which hands over to the queue dialog. Personas moved to `/chat/personas` and friends to `/friends`; `?tab=ai|meet|friends` still resolves, and "Back to Quests" opens the sheet with the quest launcher already expanded. On desktop, where the floating button is hidden, a new **People** sidebar group carries **Friends** and **Meet a stranger** (the latter jumps straight into matching); on phones the compose sheet holds both, a friends icon in the Chat header opens `/friends` in one tap, and pending requests still show the banner above the inbox.
- **Matching moved into a queue dialog on `/chat`** — **Meet someone** on the Meet card now opens the search right there instead of navigating to a lobby page. The dialog opens already searching (pulsing globe, elapsed clock, your alias), closes itself into the room when a partner is found, and drops the queue row when cancelled by button, Escape or a backdrop tap. A room-cap refusal shows **Take a breather** with the minutes left, and an expired or unreachable queue offers **Try again**. The room's **Next**, its ended-state button and skipping now return to `/chat?tab=meet&queue=1`, and `/chat/strangers` redirects to the Meet tab so older links still work.

### Fixed

- **Friend chats only get friend-chat actions** — a DM's menu had a Delete label that only hid the conversation for non-owners. It now offers **Chat memory**, **Clear** (both of you) and **Hide/Delete** by ownership, with no group settings, Kai attitude, mute or quest entries; the menu model is covered by a unit test.
- **Kai's attitude pills left ragged gaps** — the four options wrapped at their text width, so the row ended mid-card and each pill had a different size. Both Group settings and the 1:1 conversation menu now lay them out as an even two-column grid with full-width, centre-aligned pills.
- **Any group member could wipe the transcript** — `DELETE /api/groups/[id]/messages` only checked membership, so a group member could delete every message for everyone. It now requires the group owner (1:1 chats are still the member's to clear), and the menu hides Clear from non-owners.
- **`/api/invites` 500'd with “Column Chat.activeModeId does not exist”** — it loaded every Chat column; it now selects only the fields the invite list needs.
- **Groups and the ⋯ menu broke before the personalities migration** — the group detail, inbox and message routes selected `Chat.activeModeId` / `Persona.kind`, which do not exist until the migration runs, so opening `JJ + testers` failed, sending showed “Something went wrong.”, and the menu could not load its settings entry. Those routes now select the legacy columns explicitly, derive Kai's role from the built-in name, and treat the attitude tables as optional; `POST /api/groups`, the persona list/seed/create/edit paths fall back the same way. Attitude actions return a clear 503 (“need the personalities migration”) instead of a 500, and everything else (group chat, rename, members, Kai join/leave) works on an unmigrated database.
- **People and New chat could still list Kai's attitudes as people** — the persona cache in the browser (and a database that has not run the personalities migration yet) holds rows without `kind`, so Hana/Riku/Sora fell through the new filters and appeared as custom characters in People and under “Your personas”. The chat surfaces now derive a role for legacy rows (`Kai`, one of Kai's attitudes, or custom) in one helper before filtering, and People shows a single **Your personas** section with no duplicate “AI personas” heading.
- **Unauthenticated kanji debug endpoints removed** — `GET /api/kanji/test` answered without a session and returned database connectivity, sample rows and `error.stack` on failure, and `GET /api/kanji/debug` listed the Prisma client's model names. Both scratch routes are deleted.
- **Group creation allowed a fifth friend** — the chips accepted any number of friends and the server then rejected Create with the 5-person error. Selection now stops at four (you plus four) with a note under the chips.
- **Message requests only matched the exact email** — `POST /api/groups` looked the address up as typed, so `Hana@Example.com` failed even when the account was `hana@example.com`. The lookup is now case-insensitive, and the friend/non-friend paths are covered by a new route test.
- **A friend had to accept your DM** — opening a friend from New chat added them as a **pending** member, so the first DM showed up in their requests like a group invite. A DM now adds the friend as accepted; group invitees still accept. This also makes the two ways to start a DM (tap the friend, or type their email) behave the same.
- **Settings was unreachable at the bottom on phones** — the settings column ended at `py-5`, so the last card sat underneath the floating bottom tab bar (and its raised Talk-to-Kai button) and could not be scrolled clear. The container now reserves `6.5rem` plus `env(safe-area-inset-bottom)` below `sm`, matching the app's other mobile screens.
- **App Manager clipped its own list on phones** — the app grid carried `max-h-[360px] overflow-y-auto` at every width, so in the single-column mobile layout the eighth app (Netflix) was cut off inside a nested scroll region. The height cap and inner scrolling now apply only from `sm` up, and phones let the list flow in the page's own scroll.
- **Standalone Focus Guard page** — its bottom padding now also accounts for the device safe area instead of a flat `pb-28`.

### Technical

- New migration `20261121120000_conversation_memory` adds `Memory.chatId`, its index and a cascading FK, so conversation notes disappear with their chat; run `npx prisma migrate deploy`.
- New migration `20261121090000_group_member_nicknames` adds `ChatMember.nickname` (nullable text). Group detail/list and the message route resolve it over the person's account name; run `npx prisma migrate deploy`.
- New migration `20261120130000_kai_personalities` (single script; the earlier split into two was never applied): adds `Persona.kind` (default `custom`), `Persona.modeOfId` (self-FK, `ON DELETE SET NULL`), `Persona.label`, `Chat.activeModeId` (FK, `ON DELETE SET NULL`) with indexes; backfills builtin Kai → `kind='kai'` and builtin Hana/Riku/Sora → `kind='kai_mode', modeOfId=<Kai>` with Calm/Playful/Thoughtful labels; converts every 1:1 and group `ChatMember` that pointed at a mode to Kai while storing the mode in `activeModeId`; renames those 1:1 chats to Kai; reattributes persona messages to Kai; and moves `Memory` rows from a mode's bucket to Kai's. Non-builtin rows and their memories are untouched. `resolvePersonaId()` maps an attitude id to Kai so memory reads/writes always land on Kai's bucket, and `ensureBuiltinPersonas()` applies the same seed values on a fresh database. **Requires `npx prisma migrate deploy`** before the app can query the new columns. Not applied to the production database in this change.
- Kai attitudes also touched `src/app/api/groups/route.ts` (accepts `modeId`, rejects an attitude as a participant), `src/app/api/groups/[id]/mode/route.ts` (owner-only, works for groups, returns the composed prompt), `src/app/api/groups/[id]/route.ts` (`kaiModes`, labeled `activeMode`), `src/app/(app)/chat/NewChatSheet.tsx`, `src/app/(app)/chat/PeopleSheet.tsx`, `src/app/(app)/groups/[id]/GroupChatClient.tsx`, `src/app/(app)/groups/[id]/group-types.ts`, `src/app/(app)/chat/useInbox.ts`, `src/app/(app)/chat/InboxList.tsx`, `src/app/(app)/chat/QuestLauncher.tsx`, `src/app/(app)/memory/MemoryClient.tsx`. New: `src/lib/persona-role.ts` (+ `.test.ts`). The attitude controls moved from `KaiModePicker` (deleted) into `ConvMenu`; Kai can be added to or removed from a group through new `src/app/api/groups/[id]/kai/route.ts` (+ `.test.ts`), and `GET /api/groups/[id]` now returns the persona's `kind`. Group management adds `src/app/(app)/groups/[id]/GroupSettings.tsx`, `POST /api/groups/[id]/members` (+ `.test.ts`), `DELETE /api/groups/[id]/members/[memberId]` (+ `.test.ts`), a rename path in `PATCH /api/groups/[id]`, and member ids/status in the group payload.
- Kai personalities also touched `prisma/schema.prisma`, `src/lib/personas.ts` (`composePersonaPersonality`) and `src/lib/personas-server.ts` (`resolveKaiId`, kind-aware seeding). New: `src/app/api/groups/[id]/mode/route.ts` (+ `.test.ts`). Modified: `src/app/api/groups/[id]/route.ts`, `src/app/api/groups/[id]/messages/route.ts`, `src/app/api/personas/route.ts`, `src/lib/personas.test.ts`.
- Modified: `src/app/(app)/settings/SettingsClient.tsx`, `src/app/(app)/settings/app-blocker/AppManagerCard.tsx`, `src/app/(app)/settings/app-blocker/page.tsx`, `src/app/(app)/chat/ChatHub.tsx`, `src/app/(app)/chat/(inbox)/page.tsx`, `src/app/(app)/AppNav.tsx`, `src/app/(app)/chat/strangers/page.tsx`, `src/app/(app)/chat/strangers/[sessionId]/StrangerRoom.tsx`, `src/app/(app)/groups/[id]/GroupChatClient.tsx`, `src/lib/stranger/config.ts`, `src/lib/stranger/service.ts`, `prisma/schema.prisma`, `README.md`, `.agents/STRANGER_CHAT_PLAN.md`
- New: `prisma/migrations/20261119000000_stranger_chat/migration.sql`, `src/lib/stranger/config.ts`, `src/lib/stranger/alias.ts`, `src/lib/stranger/service.ts` (+ `.test.ts`), `src/lib/stranger/cleanup.ts` (+ `.test.ts`), `src/app/api/stranger/queue/route.ts`, `src/app/api/stranger/online/route.ts`, `src/app/api/stranger/sessions/[id]/route.ts`, `src/app/api/stranger/sessions/[id]/messages/route.ts`, `src/app/api/stranger/sessions/[id]/leave/route.ts`, `src/app/(app)/chat/strangers/page.tsx`, `src/app/(app)/chat/strangers/queue-state.ts` (+ `.test.ts`), `src/app/(app)/chat/strangers/[sessionId]/page.tsx`, `src/app/(app)/chat/strangers/[sessionId]/StrangerRoom.tsx`, `src/app/(app)/chat/ComposeSheet.tsx`, `src/app/(app)/chat/personas/page.tsx`, `src/app/(app)/chat/personas/PersonasClient.tsx`, `src/app/(app)/friends/page.tsx`, `.agents/STRANGER_CHAT_PLAN.md`, `.agents/CHAT_HUB_UI_PLAN.md`, `src/app/(app)/chat/(inbox)/layout.tsx`, `src/app/(app)/chat/(inbox)/c/[id]/page.tsx`, `src/app/(app)/chat/ChatRail.tsx`, `src/app/(app)/chat/InboxList.tsx`, `src/app/(app)/chat/useInbox.ts`, `src/app/(app)/chat/InboxProvider.tsx`, `src/app/(app)/chat/PeopleSheet.tsx`, `src/app/(app)/chat/RequestsRow.tsx`, `src/app/(app)/chat/QueueRow.tsx`, `src/app/(app)/chat/usePeople.ts` (+ `.test.ts`), `src/app/(app)/chat/useMatchQueue.ts`, `src/app/api/groups/route.ts`, `.agents/PEOPLE_INTEGRATION_PLAN.md`
- Deleted: `src/app/(app)/chat/strangers/StrangerLobby.tsx` (replaced by the queue dialog on `/chat`), `src/app/(app)/chat/NewChat.tsx` (replaced by `ComposeSheet.tsx`), `src/app/(app)/chat/strangers/StrangerQueueModal.tsx` and `src/app/(app)/chat/strangers/useStrangerQueue.ts` (replaced by `QueueRow` + `useMatchQueue`), `src/app/(app)/chat/RailFriendsSection.tsx` and `src/app/(app)/chat/RailMeetSection.tsx` (replaced by `PeopleSheet`), `src/app/(app)/chat/PeopleGroup.tsx` (replaced by `PeopleSheet` + `RequestsRow`), `src/app/(app)/groups/FriendsPanel.tsx` (actions moved into `usePeople`; `/friends` now redirects)
- New migration `20261120120000_chat_indexes_and_constraints`: `ChatMember(userId, kind, status, hidden)` and `Chat(ownerId, kind, createdAt)` indexes (the inbox, invites and the message-request cap filter user-first), a partial unique index on `UserFlashcard(userId, wordId) WHERE wordFormId IS NULL` so base-word cards can't duplicate, and `ChatMember_one_subject` CHECK enforcing exactly one of `userId`/`personaId`. The dedupe keeps the most-studied duplicate (then most recent review, then oldest row); the CHECK is added `NOT VALID` and then validated so existing rows are checked without an exclusive scan; `lock_timeout = 5s` and create-before-drop keep lock waits short. The CHECK, partial index and dedupe are raw SQL because Prisma can't express them. Preflight on the current database: 0 duplicate groups, 0 CHECK violations (10 members, 5 chats, 156 cards).
- Requires `npx prisma migrate deploy` (new `Stranger*` tables + `stranger_participant_one_active` partial unique index) and `STRANGER_CHAT_ENABLED=true` before the surface appears.
- Removed in the streamlining pass: `src/app/(app)/chat/ComposeSheet.tsx` and `src/app/(app)/chat/personas/PersonasClient.tsx` (`/chat/personas` now redirects), plus the duplicate meet footers. `PersonaManager` gained `compact` and `showChat` modes.
- Split in the follow-up: `src/app/(app)/chat/NewChatSheet.tsx` (writing) alongside `PeopleSheet.tsx` (management); `src/app/api/groups/route.ts` gained the `email` message-request path and a shared `dmBetween()` helper; `src/app/api/invites/route.ts` now returns `kind`; `src/app/api/groups/route.test.ts` covers the friend, stranger and unknown-email paths.
- New `src/app/api/route-guards.test.ts`: walks every `route.ts` under `src/app/api`, fails when a route doesn't call `getCurrentUser()`, allowlists only `auth/login`, `auth/logout` and `auth/register` (with the reason recorded), and fails when an allowlisted path no longer exists.
- Monoliths split: `SelectionLookupPopup` moved out of `WordToken.tsx` (1,104 → 708 lines) into its own module, with `WordToken` exporting the two lookup types and `WordTokenBody` it needs; `sessionDivider`/`dayLabel` moved into `group-format.ts` beside `timeLabel` (`GroupChatClient.tsx` 1,132 → 1,106).
- Deleted dead modules with no importer: `src/app/(app)/chat/SelectionLookupPopup.tsx` (the live one comes from `WordToken.tsx`), `src/app/(app)/chat/SavedWordsContext.tsx`, `src/app/(app)/kanji/FormattedText.tsx`, `src/app/(app)/settings/app-blocker/RulesConfigCard.tsx`, `src/app/HeroDemo.tsx`, `src/app/components/landing/SimpleLandingHero.tsx`, `src/app/components/landing/SimpleLandingFeatures.tsx`, `src/components/NoApiKeyBanner.tsx`, `src/lib/auto-add-kanji.ts`, `src/lib/kanji-mnemonic.ts`, `src/lib/review/presets.ts`.
- Modified for the rate limit and phone parity: `src/app/api/groups/route.ts` (+ `.test.ts`), `src/app/(app)/chat/NewChatSheet.tsx`, `src/app/(app)/chat/ChatHub.tsx`, `src/app/(app)/chat/ChatRail.tsx`, `src/app/(app)/chat/InboxList.tsx`, `src/app/(app)/ui.tsx`. `InboxList` no longer owns a search row (`onQuery`/`searchInList` are gone); both surfaces pin `InboxSearchRow`.
- Checks: `npm run typecheck` and `npm run lint` clean; `npm run test` 786 passing (84 files), including `src/lib/stranger/service.test.ts`, `src/lib/stranger/cleanup.test.ts`, `src/app/(app)/chat/strangers/queue-state.test.ts`, `src/app/(app)/chat/people.test.ts` and `src/app/api/groups/route.test.ts`

## [2.4.2] - 2026-11-19

### Added

- **Focus Guard session plans** — the separate "Pool" and "Focus" rows (5 × 5 combinations, most of which were unreachable in practice) are replaced by six named plans: Due reviews, Gentle, Due + new, Study ahead, Weak cards and Leeches. Each plan pins both `studyMode` and `learningRatio`, so the label always describes what the session does; the plan picker is shared by the interception modal and the rules editor, a saved non-plan mix shows a Custom badge with the old rows underneath, and `resolvePlan()` maps legacy configs deterministically (percent comparison, not an epsilon). The config shape, native plugin payload and review API are unchanged.

### Fixed

- **Settings tabs scrolled sideways on phones** — the tab strip carried both `flex-1` and `shrink-0`, so at 390 px the four tabs needed 388 px inside a 338 px container and the last two scrolled out of view (with a visible scrollbar). The strip is now a 2×2 grid below `sm` and a single flex row above it.
- **Focus Guard showed up on desktop** — nothing gated the feature: the sidebar item was hard-coded and `/settings/app-blocker` rendered the whole blocker/permissions UI on any platform, while only the debug widgets and the Mobile-tab embed honoured `NEXT_PUBLIC_APP_BLOCKER_DEBUG`. Availability is now one rule (Android, or the debug flag, or local dev): the nav item is filtered out, the page shows an "Android only" card instead of the blocker, and both use a hydration-safe hook.
- **Reviews-only sessions hid lapsed cards** — `studyMode=due` with a zero review mix added `repetitions > 0`, which also excludes a card you just failed (repetitions 0, timesReviewed > 0). Those are learning cards and the ones most in need of review, so "Due reviews" served everything except them. All three review routes and the composition counts now use one `STUDIED_CARD_WHERE` filter, and the maintenance top-up no longer re-introduces the same filter.
- **Learning defaults and Focus Guard drifted apart** — each surface wrote only the keys it happened to know (direction and review mix on one side, furigana on the other) and neither re-read the other, so a learner who changed a default in one tab reviewed with the other tab's value. Writes now mirror both ways through a single mapping, which also covers the early-review strategy, and the app-lock page falls back to `defaultLearningRatio` instead of a hard-coded 0.5.
- **The due-review badge promised cards the session would not serve** — it asked `/api/review/mixed` for `studyMode=due&limit=200` and nothing else, so the count ignored the review mix, the new-card quota and the largest learning pool. With "Reviews only" selected, for example, the badge counted new cards the session then refused. The badge now sends the same composition inputs as the session it counts.
- **Max daily reviews was never enforced** — the setting only shrank the home-screen projection, so a session started from the review screen, Focus Guard or the app-lock notification served a full batch past the ceiling. The three review routes now clamp `limit` to what remains of today's goal (counted from `lastReviewedAt` in the learner's timezone, shared across vocab and kanji) and return an empty batch once it is spent.

## [2.4.1] - 2026-11-16

### Fixed

- **The FSRS debug endpoint served any user's cards** — `GET /api/debug/fsrs-state` had no auth check at all (the project has no `middleware.ts`), so `?userId=` returned any account's review state and `?cardId=` returned any card by id. It now requires a session and only ever reports on the caller's own cards.
- **Removing a kanji from your list deleted it from the shared dictionary** — both `DELETE /api/kanji/[character]` and `/learn` dropped the `Kanji` row once no one referenced it. `Kanji` has no owner column, so that permanently removed the character from browse and search for every user. The cleanup is gone.
- **Home counted lapsed cards as new** — `/api/review/composition` split `due.new` on `repetitions: 0` alone, so a card that had lapsed was promised as new while the session delivered it as maintenance. The split now also requires `timesReviewed: 0`.
- **Kanji browse accepted junk query numbers** — `?jlptLevel=N5` became `NaN` and threw a 500, and `limit`/`offset` were unclamped. Query params are now parsed to bounded integers, so bad input falls back to defaults.
- **Good reviews made cards harder** — the FSRS difficulty update used `gradeAdjusted - 4` on a 1-based grade instead of `- 3`, so Good added +0.86 difficulty every review and Easy never lowered it. Difficulty pinned at 10, which cut stability growth (11 − D) from ~6 to 1; ten clean Good reviews produced a 183-day interval where 3,650 was correct. Good and Easy now behave as the model intends.
- **Lapsed cards counted as new** — `isNewCard` treated `repetitions = 0` as "never studied", so a card that had lapsed consumed new-card quota, showed as "new", and dropped out of the in-progress pool at the same time. Newness now also requires `timesReviewed = 0`, and `LEARNING_CARD_WHERE` counts lapsed cards as in progress.
- **Focus Guard could read another user's kanji folder** — the `groupId` branch of `/api/kanji/review` (and the folder filter on `/api/kanji`) queried group entries without an ownership check. Both are now scoped to `group: { userId }`.
- **Lesson and group kanji could not be graded** — kanji you did not own yet were returned with `preview-<id>` placeholders, and grading one returned 404, silently dropping the review. Missing records are now scaffolded, and the cards carry real ids.
- **Home promised new cards the day could not deliver** — `projectSessionMix` ignored cards already introduced today. It now subtracts them from the daily ceiling, matching the routes.
- **Practice reviews moved the scheduling clock** — an early practice review wrote `lastReviewedAt`, which lowered the retrievability the next real review computed. Practice now leaves the scheduling fields untouched.
- **SM-2 fallback left stale FSRS state** — after a fallback the old difficulty/stability remained on the card, so the next review scheduled from a stability that no longer matched its interval. Those fields are cleared so the next review converts cleanly.
- **A lapse showed a multi-day interval** — Again wrote an interval derived from stability while returning the card in 10 minutes, which skewed the mastery ring and the leech badge. A lapse now stores interval 0.
- **Struggling ignored FSRS cards** — the deck filtered on `easeFactor`, which FSRS never updates. It now uses `difficulty > 7`, falling back to SM-2 ease for unmigrated cards.
- **The daily introduction count was wrong in both directions** — it counted `repetitions = 1`, which missed cards that succeeded twice and re-counted old cards that had lapsed back to 1. Introductions are now stamped once with `firstLearnedAt`.
- **Intake showed "daily ceiling" when new cards were switched off** — `describeIntake` now reports `off` for a zero daily ceiling.
- **Day boundary could land an hour off** on zones whose DST change happens at midnight; the offset is now resolved against the candidate instant instead of UTC midnight.
- **Non-numeric grades were accepted** — `"0"` slipped past the `< 0` check and then failed `grade === 0`, so an Again was applied as a success. Both review routes now require an integer.

### Technical

- Modified: `src/lib/fsrs/scheduler.ts`, `src/lib/fsrs/apply-review.ts`, `src/lib/review/lifecycle.ts`, `src/lib/review/intake.ts`, `src/lib/review/composition.ts`, `src/lib/session-composer.ts`, `src/lib/review/maintenance-window.ts`, `src/lib/day.ts`, `src/app/api/flashcards/review/route.ts`, `src/app/api/kanji/review/route.ts`, `src/app/api/kanji/route.ts`, `src/app/api/review/mixed/route.ts`, `src/app/(app)/home/KaiRoomClient.tsx`, `prisma/schema.prisma`
- New: `prisma/migrations/20261114120000_add_first_learned_at/migration.sql`, `src/lib/fsrs/difficulty.test.ts`, `src/lib/fsrs/review-payload.test.ts`, `src/lib/review/lapsed-lifecycle.test.ts`
- **Requires `npx prisma migrate deploy`** before the review routes run against the database (adds `UserFlashcard.firstLearnedAt` / `UserKanji.firstLearnedAt`).
- Modified (refactor): `src/app/(app)/kanji/KanjiClient.tsx` — data loading and the filtering/sorting projections moved out of the component
- New (refactor): `src/app/(app)/kanji/types.ts`, `src/app/(app)/kanji/useKanjiLibrary.ts`, `src/app/(app)/kanji/useKanjiView.ts`
- Bench: `KanjiClient.tsx` 1,565 → 1,353 lines, with the view logic now unit-testable outside React
- Tests: 693 passing (74 files) — lint/typecheck clean

## [2.4.0] - 2026-11-14

### Added
- **Intake status in Learning settings** — "New cards" now shows why intake is or is not happening, from the learner's real deck: "new cards are paused — 48 cards are in progress against a cap of 20", "today's ceiling of 20 is already used", or "3 new available". `GET /api/review/composition` gained `intake.inProgress` and `intake.introducedToday`, and `describeIntake()` resolves the three limits into one allowance plus the reason it is zero.

### Changed
- **New-card intake is one block** — "Per session", "Per day" and "In-progress learning cap" now sit together in Review defaults as a single "New cards" group, with the daily field moved out of the Spaced-repetition card. The three limits were previously split across two cards with no hint that they combine.
- **Learning-pool cap defaults to All** — `maxLearningPool` defaults to 0 (unlimited) instead of 20, so an existing deck no longer has new-card intake silently disabled on first run. The 10/15/20/30 chips remain for anyone who wants a cap.
- **Learning tab order** — Review defaults now leads with intake and review mix, and puts direction, furigana and auto-save after them; the Spaced-repetition subtitle no longer implies it only applies to future scheduling.
- **Group chat split into modules** — `GroupChatClient.tsx` (1,473 lines) now imports `GroupBubble`, `QuestStrip`, shared `group-types` and a `timeLabel` helper instead of defining them inline; the file is 1,132 lines.
- **Word-token popup split into a module** — the popup positioning maths, viewport constants and portal moved to `chat/WordTokenPopup.tsx` (`calcPos`, `PopupPos`, `PopupPortal`, `POPUP_W`, `POPUP_MAX_H`); `WordToken.tsx` drops from 1,213 to 1,104 lines.
- **Review screens split out** — `ReviewClient.tsx` now delegates its empty, error and completion states to `review/screens/EmptyReviewScreen.tsx`, `ErrorReviewScreen.tsx` and `DoneReviewScreen.tsx`, each taking callbacks instead of reaching into session state; 958 → 742 lines.
- **Review card parts split out** — the speaker button, conjugation badge and card-back extras (leech badge, saved chat exchange, Kai's Breakdown) moved to `review/ReviewCardParts.tsx`, with the `Card` shape in `review/card-types.ts` so the parts and the card share one type without a circular import; `ReviewCard.tsx` 731 → 546 lines.
- **Vocab page split into modules** — `VocabClient.tsx` (929 → 336 lines) now composes `VocabFilterBar` (search, status chips, sort), `VocabList` (grouped rows, empty state, infinite-scroll sentinel, add-word FAB) and `VocabDetailSheet` (reading/meaning edits, notes, conjugation picks, reset/mark-known/delete). The sheet owns its own editing state and reports back through `onUpdated`/`onReload`/`onRemove` instead of reaching into the page; the card shape, filters and mastery weighting live in `vocab/types.ts`. A leftover `console.log` in the content filter was removed.
- **Kanji markdown renderer split out** — `FormattedText` and its inline-token parser moved from `KanjiClient.tsx` to `kanji/FormattedText.tsx` (1,700 → 1,565 lines). It was exported but never imported by any other file, so it is now a standalone module instead of an inline block nobody reached.
- **Interceptor rules are typed, not stepped** — the cards-to-unlock stepper is now a numeric field (presets kept), and the unlock grace is a typed number of minutes defaulting to 45 instead of fixed chips.
- **Block chance removed** — the interceptor always blocks at 100%. The 25/50/75% options are gone from the rules modal, and a stored value is normalised to 100 on load and on every save (web config and Android prefs).
- **Direction defaults to Mixed** for interception rules on web, in the Android plugin defaults and in the review gallery.

### Fixed
- **Mixed sessions no longer exceed the new-card quota** — the allowance is split across the vocab and kanji pools so the two halves sum to it (a quota of 3 was becoming 2 + 2 = 4), and the backfill recompose now receives only the allowance the other half did not spend instead of the full amount again (that path could reach 5). Both are pinned by route tests that fail against the previous logic.
- **The home projection respects the in-progress learning cap** — `projectSessionMix` now takes `inProgress` and `maxLearningPool` and drops projected new cards when the pool is full, using the same `isLearningPoolFull` rule the routes apply. The home button no longer promises "3 new" for a session that will hand back reviews only.
- **Daily new-card ceiling follows the learner's timezone** — `introducedTodayWhere` now accepts `User.timezone` and resolves the day boundary with `startOfDayInTimezone`, so the limit resets at local midnight rather than the server's (a UTC+8 learner on a UTC host was resetting at 08:00). All four call sites pass it: mixed, composition, flashcards/review and kanji/review.

### Technical
- Modified: `src/app/(app)/settings/app-blocker/InterceptionRulesModal.tsx`, `src/app/(app)/settings/app-blocker/FocusGuardStatusCard.tsx`, `src/app/(app)/settings/app-blocker/page.tsx`, `src/app/(app)/settings/ReviewDefaultsCard.tsx`, `src/app/(app)/settings/FsrsSettingsCard.tsx`, `src/app/(app)/review/QuestGallery.tsx`, `src/app/(app)/review/ReviewClient.tsx`, `src/app/(app)/groups/[id]/GroupChatClient.tsx`, `src/lib/learning-config.ts`, `src/lib/review/intake.ts`, `src/lib/review/intake.test.ts`, `src/plugins/app-blocker/web.ts`, `android/app/src/main/java/com/kaiwaai/app/AppBlockerPlugin.kt`, `src/app/api/review/mixed/route.ts`, `src/app/api/review/mixed/route.test.ts`, `src/app/api/review/composition/route.ts`, `src/app/api/kanji/review/route.ts`, `src/app/api/flashcards/review/route.ts`, `src/lib/review/composition.ts`, `src/lib/review/composition.test.ts`, `src/app/(app)/home/KaiRoomClient.tsx`
- New: `src/app/(app)/groups/[id]/GroupBubble.tsx`, `src/app/(app)/groups/[id]/QuestStrip.tsx`, `src/app/(app)/groups/[id]/group-types.ts`, `src/app/(app)/groups/[id]/group-format.ts`, `src/app/(app)/chat/WordTokenPopup.tsx`, `src/app/(app)/kanji/FormattedText.tsx`, `src/app/(app)/review/screens/EmptyReviewScreen.tsx`, `src/app/(app)/review/screens/ErrorReviewScreen.tsx`, `src/app/(app)/review/screens/DoneReviewScreen.tsx`, `src/app/(app)/review/ReviewCardParts.tsx`, `src/app/(app)/review/card-types.ts`, `src/app/(app)/vocab/types.ts`, `src/app/(app)/vocab/VocabBits.tsx`, `src/app/(app)/vocab/VocabFilterBar.tsx`, `src/app/(app)/vocab/VocabList.tsx`, `src/app/(app)/vocab/VocabDetailSheet.tsx`
- Deleted: —
- Tests: 677 passing (71 files) — lint/typecheck clean
- Note: the Android defaults only take effect in a rebuilt app; an already-saved 15-minute grace is left untouched, and `RulesConfigCard.tsx` (the only consumer of `InterceptionRulesEditor.tsx`) is no longer imported anywhere.
- Note: `GroupBubble.tsx` carries the same `/* eslint-disable react-hooks/immutability */` the original single-file component used for its swipe refs; the exemption moved with the code rather than being added for it.
- Remaining files over 700 lines: `kanji/KanjiClient.tsx` (1,565), `groups/[id]/GroupChatClient.tsx` (1,132), `chat/WordToken.tsx` (1,104), `chat/KanjiBreakdown.tsx` (913), `kanji/[character]/KanjiDetailClient.tsx` (829), `review/ReviewClient.tsx` (742), `kanji/AddKanjiModal.tsx` (703). Seven remain, down from eleven; each needs its render split into children with explicit props rather than another mechanical move.
- Known duplication, not merged: `chat/WordTokenPopup.tsx` and `chat/TokenPopup.tsx` implement overlapping popup positioning and portal logic with slightly different APIs; unifying them is a behaviour change and was left alone.

## [2.3.1] - 2026-11-13

### Added
- **Focus mix in Interception Rules** — the Focus row (new vs review mix) now always appears in the interception rules modal instead of only when Pool = All, and gained a 70% option so it matches Review defaults.
- **Rationed new-card intake** (`newPerSession`, default 3) — sessions no longer take whatever new cards happen to be in the deck. Each session introduces at most this many brand-new cards, further capped by the daily `maxNewCards` ceiling and anything already introduced today; reviews fill every remaining slot, and a session is allowed to be shorter rather than padded with new cards. Exposed in Settings → Review defaults ("New cards per session") and passed by both the in-app review flow and Focus Guard.
- **Visible session composition** — the home **Review Cards** button and the review session header now show the new-vs-review split (e.g. "3 new · 7 review") instead of a single opaque due count. New `GET /api/review/composition` returns due cards split by class (vocab + kanji), and `projectSessionMix` projects them through the device's Learning defaults (intake quota, new-card ceiling, review mix, max daily reviews) with the same rules the composer uses. The session header summarises the cards actually loaded, so the mix is verifiable at a glance.
- **One card lifecycle** (`src/lib/review/lifecycle.ts`) — graduation is now defined once: 3 successful reviews and a 21-day interval. Scheduling (SM-2 and FSRS), session composition, the learning-pool gate and the status backfill all use it, ending the three-way disagreement where 61 reviewed cards sat in "learning" forever.

### Fixed
- **The review mix setting was not honoured** — `learningRatio` only picked the target slice, and the interleave forced active cards into every other slot, so 20%, 50%, 70% and 100% all produced a 50/50 session. Composition now fills each side to its target and lets reviews take over any shortfall: 0/10, 2/8, 5/5, 7/3 and 10/0 for ratios 0, 0.2, 0.5, 0.7 and 1. The home-screen projection agrees with the composer in every case.
- **Cards silently retired by runaway intervals** — 33 cards had intervals over 100 years (worst 98,592,206 days) and could never come due again. `recallProbability` treated a missing `lastReviewedAt` as "elapsed = stored interval", collapsing retrievability to ~0 and exploding the FSRS growth term. Unknown history now assumes an on-time review, and intervals/stability are clamped to 3,650 days. `scripts/fix-runaway-intervals.ts` repairs existing cards (dry-run by default).
- **The in-progress learning gate counted almost the whole deck** — it queried `status: "learning"`, which included every card short of graduation (77 of 155 cards for one account), so the gate could block new cards for weeks. It now counts only cards actively in progress (reps 1–2 or interval under 21 days).
- **Maintenance cards were locked out for an hour** — the maintenance recency guard was 60 minutes, so a session started right after another was new-only. It is now 2 minutes, and maintenance cards rotate least-recently-reviewed first so a short cooldown doesn't replay the same few.
- **Review sessions never composing the maintenance pool** — all three review endpoints fetched a single weakest-first window of candidates, so a deck with more new cards than that window held returned only new cards and the maintenance half of the session was never formed, regardless of the 50/50 mix in Review defaults or Focus Guard. Each endpoint now checks whether the fetched window can satisfy its maintenance target and, if not, merges a separate reviewed pool ordered by `nextReview` (deduplicated by card id). Reviews-only queries, which already constrain `repetitions`, are left untouched.

### Technical
- Scripts (`npx tsx`): `scripts/audit-card-timing.ts` (read-only scheduling audit), `scripts/fix-runaway-intervals.ts` and `scripts/backfill-card-status.ts` (dry-run by default, `--apply` to write).
- Modified: `src/app/(app)/settings/app-blocker/InterceptionRulesModal.tsx`, `src/app/(app)/settings/app-blocker/InterceptionRulesEditor.tsx`, `src/lib/session-composer.ts`, `src/lib/learning-config.ts`, `src/lib/srs.ts`, `src/lib/fsrs/apply-review.ts`, `src/lib/fsrs/scheduler.ts`, `src/app/api/flashcards/review/route.ts`, `src/app/api/kanji/review/route.ts`, `src/app/api/review/mixed/route.ts`, `src/app/(app)/home/KaiRoomClient.tsx`, `src/app/(app)/review/ReviewClient.tsx`, `src/app/(app)/settings/ReviewDefaultsCard.tsx`, `src/app/app-lock/page.tsx`
- New: `src/lib/review/maintenance-window.ts` (+ test), `src/lib/review/composition.ts` (+ test), `src/lib/review/lifecycle.ts` (+ test), `src/lib/review/intake.ts` (+ test), `src/app/api/review/composition/route.ts`, `scripts/fix-runaway-intervals.ts`, `scripts/backfill-card-status.ts`, `scripts/audit-card-timing.ts`
- Tests: 664 passing (71 files) — lint/typecheck clean

## [2.3.0] - 2026-11-13

### Added
- **In-progress learning card cap (`maxLearningPool`)** — added a user setting to cap actively learned cards (reps 1–3) at 10, 15, 20, 30, or unlimited; when the active learning queue reaches this threshold, introduction of new cards is automatically paused so users are not overwhelmed before existing cards mature.
- **Reviews-only mode (`learningRatio: 0`)** — added a dedicated "Reviews only" (0% new) option in Review Defaults and Focus Guard interception rules to practice existing cards exclusively without introducing new vocabulary.
- **`maxNewCards` session composer option** — `composeSession` now accepts a `maxNewCards` cap to strictly limit brand-new cards in any single study or Focus Guard unlock session.
- **Chat-sourced review context** — vocabulary cards now remember the exact chat exchange they were first saved from (`UserFlashcard.sourceChatId` / `sourceMessageId` / `sourceContext`). The review card back shows a "From your chat" block with the learner's preceding message and Kai's line, so a saved word stays anchored to the sentence that gave it meaning. `POST /api/flashcards` verifies the message belongs to a chat the user is in, backfills context onto cards saved before this feature, and silently ignores unknown/foreign message ids.
- **Leech badge & Kai's Breakdown** — cards reviewed 8+ times whose interval is still under a week get a ⚠️ Leech badge on the card back. Tapping **Kai's Breakdown** (BYOK Gemini) returns a fresh mnemonic, 1–2 confusable lookalikes with the distinguishing feature, and two short example sentences — using the card's original chat exchange as context when available.
- **Kanji Coverage wall** — new **Coverage** tab in Study → Kanji (`GET /api/kanji/coverage`) rendering every JLPT kanji N5→N1: green = mastered, purple = learning, dashed = added, faint = untouched, with per-level percentages and a mastered/total summary.
- **Kai's room rotates her speech** — the home bubble now draws from per-mood line variants (`kaiLineVariants` / `pickKaiLine`), seeded by day and hour so she stops repeating one sentence all day and a refresh doesn't reshuffle it. The original data-aware line (due counts, streak, level) always stays as the first variant.
- **Word of the moment on the home screen** — `GET /api/kai/word` picks one card from the learner's own deck (learning/new first, whole deck as fallback) rotated deterministically per local day. It renders as a chip under Kai's bubble with the word, reading, gloss, and a speaker button that speaks it aloud — no AI call or API key needed.

### Fixed
- **Brand-new cards flooding "Due" review mode** — resolved an issue where unstudied cards (`repetitions: 0`) with default `nextReview: now()` were treated as due retention reviews, filling review sessions even when the user selected "Due" cards only.
- **Maintenance pool leakage** — ensured unstudied cards (`repetitions === 0`) can never enter the retention/maintenance pool or overflow into reviews when `learningRatio === 0`.
- **Focus Guard card overfetching** — `app-lock` now queries the exact session count required for unlock rather than overfetching up to `maxDailyReviews` (50 cards), respecting `maxLearningPool` and `learningRatio`.
- **Flashcard card overflow on mobile** — content (Kanji breakdown, long meanings, mnemonics) no longer gets clipped or spills outside the card boundary on small screens.
- **Flexbox safe-center scroll bug** — replaced `justify-content: center` with `justify-content: safe center` on card scroll containers; content that exceeds the card height now scrolls correctly from the top instead of being cropped off-screen.
- **Card height adaptive to viewport** — switched from fixed `h-[420px]` to a `clamp(340px, 46vh, 460px)` fluid height so the card, grade buttons, and progress bar all fit on screen simultaneously on phones with small or dynamic viewports.
- **Bottom nav obscuring grade buttons** — added `data-hide-bottom-nav="true"` to the active review session wrapper; the floating mobile bottom tab bar now hides during sessions so the *Again / Hard / Good / Easy* buttons are never obscured.
- **Card front scroll wrapper** — wrapped card front content in a matching `.card-front-scroll` container so the front side can also scroll when mnemonic hints or long content are shown without overflowing the card.

### Changed
- **Review Defaults settings UI** — added configurable chip selectors for **Max in-progress learning cards** (`10`, `15`, `20`, `30`, `All`) and **Review mix** (`Reviews only`, `20% new`, `50/50`, `70% new`).
- **Focus Guard interception rules** — added "Reviews" (0% new) and "Gentle" (20% new) focus ratio options to InterceptionRulesEditor and InterceptionRulesModal.
- **`KanjiBreakdown` centered in flashcard back** — added optional `center` prop to `KanjiBreakdown`; kanji chip strips on flashcard backs are now center-aligned to match the surrounding content layout.
- **`BottomTabs` marked with `data-bottom-tabs`** — added data attribute to the mobile nav wrapper to enable CSS-based hiding via parent context.
- **Settings tab icons** — replaced emoji icons in the Settings tab bar (User, AI Settings, Learning, Mobile) with Phosphor icon components for a consistent, theme-aware look.
- **Early review strategy pills** — switched from `flex-wrap` to a strict `grid grid-cols-2` layout so the two strategy pills always split exactly 50/50 regardless of text length.
- **Direction & Furigana pills** — switched to `grid grid-cols-3` so all three options always fill the row equally in the Review Defaults card.
- **Reply length cap pills** — switched to `grid grid-cols-4` so all four token options fill the row equally in the Model card.
- **`Chip` component** — now renders as `inline-flex items-center justify-center` so label text is always perfectly centred inside a grid cell.
- **Review counters on every surface** — `/api/flashcards/review`, `/api/kanji/review`, and `/api/review/mixed` now return `timesReviewed`, `interval`, and `repetitions`, so the leech badge has data regardless of how the session was composed.
- **`WordToken` forwards `sourceMessageId`** — the prop was declared and passed by `RichText` but never destructured or sent; every save path (base word, single form, all forms, phrase) now includes it so the card can keep its context.

### Technical
- Modified: `src/lib/learning-config.ts`, `src/lib/session-composer.ts`, `src/lib/session-composer.test.ts`, `src/app/api/flashcards/review/route.ts`, `src/app/api/kanji/review/route.ts`, `src/app/api/review/mixed/route.ts`, `src/app/app-lock/page.tsx`, `src/app/(app)/review/ReviewClient.tsx`, `src/app/(app)/settings/ReviewDefaultsCard.tsx`, `src/app/(app)/settings/app-blocker/InterceptionRulesEditor.tsx`, `src/app/(app)/settings/app-blocker/InterceptionRulesModal.tsx`, `src/app/globals.css`, `src/app/(app)/review/ReviewCard.tsx`, `src/app/(app)/chat/KanjiBreakdown.tsx`, `src/app/(app)/AppNav.tsx`
- Modified (chat/SRS bridge pass): `prisma/schema.prisma`, `src/app/api/flashcards/route.ts`, `src/app/api/flashcards/review/route.ts`, `src/app/api/kanji/review/route.ts`, `src/app/api/review/mixed/route.ts`, `src/app/(app)/chat/WordToken.tsx`, `src/app/(app)/review/ReviewCard.tsx`, `src/app/(app)/kanji/KanjiClient.tsx`, `src/app/api/flashcards/route.test.ts`, `.agents/AGENTS.md`
- New (chat/SRS bridge pass): `prisma/migrations/20261113120000_flashcard_source_context/`, `src/lib/review/card-source.ts` (+ test), `src/lib/review/leech.ts` (+ test), `src/lib/card-breakdown-client.ts` (+ test), `src/lib/kanji-coverage.ts` (+ test), `src/app/api/kanji/coverage/route.ts`, `src/app/(app)/kanji/KanjiCoverageGrid.tsx`
- Migration: the three nullable `UserFlashcard` source columns are applied on the current database (recorded in `_prisma_migrations`); run `npx prisma migrate deploy` for any other environment.
- Modified (Kai's room pass): `src/lib/kai-mood.ts` (+ test), `src/app/(app)/home/KaiRoomClient.tsx`, `src/app/app-lock/page.tsx`, `package.json`, `package-lock.json`, `android/app/build.gradle`
- New (Kai's room pass): `src/lib/kai-word.ts` (+ test), `src/app/api/kai/word/route.ts`
- Tests: 633 passing (67 files) — lint/typecheck clean

## [2.2.8] - 2026-11-13

### Added
- **Vocab card edit mode** — added an **✏️ Edit** action to the `/study?tab=vocab` detail modal sheet, allowing users to directly correct inaccurate readings (Kana) and meanings (English definitions) on flashcards and synchronize those edits back to the underlying `Word` or `Phrase` database records.
- **Direct card removal from chat popups** — added a **Remove** button alongside `✓ in your review deck` in `WordToken` and `SelectionLookupPopup`, enabling users to instantly un-save or delete mistakenly added vocabulary without navigating away from their chat session.
- **RESTful batch card removal endpoint** — added `DELETE /api/flashcards` supporting query/JSON parameters (`word`, `wordId`, `phraseId`, `id`) to remove user flashcards cleanly by target surface, dictionary form, or ID.
- **Cross-view deletion event synchronization** — introduced a `kaiwa:vocab-removed` global window event and wired it into `SavedWordsContext`, ensuring cards deleted in the Vocab study tab immediately update `savedWords` across all active chat bubbles in the current session.

### Changed
- **Flashcard patch actions** — extended `PATCH /api/flashcards/[id]` with `action: "editCard"` to support updating reading, definition glosses, and part-of-speech mappings for both dictionary words and custom phrases.

### Technical
- Modified: `package.json`, `android/app/build.gradle`, `CHANGELOG.md`, `src/app/(app)/vocab/VocabClient.tsx`, `src/app/(app)/chat/SavedWordsContext.tsx`, `src/app/(app)/chat/WordToken.tsx`, `src/app/api/flashcards/[id]/route.ts`, `src/app/api/flashcards/route.ts`
- New: —
- Deleted: —
- Tests: 599 passing (62 files) — lint/typecheck clean

## [2.2.7] - 2026-10-17

### Fixed
- **Vercel build failure** — `GroupChatClient.tsx` was calling `hasAnyKey()`, `charLength()`, and `MAX_MESSAGE_CHARS` without importing them, causing a fatal TypeScript type error (`Cannot find name 'hasAnyKey'`) that blocked the Vercel deployment. Added the two missing import lines.

### Technical
- Modified: `src/app/(app)/groups/[id]/GroupChatClient.tsx`
- New: —
- Deleted: —
- Tests: lint/typecheck clean (`tsc --noEmit` exits 0)

## [2.2.6] - 2026-10-17


### Added
- **Rolling context summarization** — wired up background rolling conversation summarization via `summarizeConversation()` in `GroupChatClient.tsx`, saving compressed context to `/api/groups/[id]/summary` so personas retain infinite chat memory across sessions without exceeding token limits.
- **Dynamic grammar reinforcement in prompt context** — `/api/chat/context` now extracts the user's latest 3 Japanese grammar corrections (`userCorrection`), injecting them into Kai's system prompt to naturally reinforce weak grammar points in conversation.
- **Session-level app lock progress resilience** — tracked `completedCount` in `sessionStorage` (`kaiwa_app_lock_completed`) in `app-lock`, preventing mid-session progress from resetting back to 0 on screen locks or app switches.

### Changed
- **Expanded sliding chat context window** — increased active message window in `GroupChatClient.tsx` from 12 to 20 messages for both user responses and proactive messages, giving models deeper immediate context.
- **Enforced async non-blocking app lock grading** — removed synchronous `await fetch(...)` in `app-lock/page.tsx` during card grading; persistence now dispatches asynchronously in the background so card flips and transitions occur with zero UI latency.
- **Clear remaining card display in Focus Guard** — updated the app lock status badge to explicitly show `{remaining} Left · {completed} / {required}` (e.g. `4 Left · 1 / 5`), eliminating counter confusion.
- **Keyboard shortcut safety** — number keys (<kbd>1</kbd>–<kbd>4</kbd>) in `app-lock` now require `flipped === true`, preventing accidental grading before the card answer is revealed.

### Fixed
- **App blocker web config reset** — added `localStorage` persistence to `AppBlockerWeb` (`kaiwa_app_blocker_config`) so custom flashcard requirement counts are remembered across page navigations rather than resetting to the default 10.
- **App lock client card count fallback** — initialized `requiredCount` from URL query parameters, `localStorage`, and `savedConfig` rather than hardcoding initial state to 10.
- **Android trampoline count parameter** — updated `FlashcardBlockActivity.kt` to read `flashcard_requirement` from `SharedPreferences` when constructing the fallback route, ensuring `count=$targetCount` is always passed.
- **Redundant database query in chat context** — removed the unused 6-message fetch in `/api/chat/context/route.ts` that was discarded by the client, replacing it with an efficient user message lookup.

### Technical
- Modified: `package.json`, `android/app/build.gradle`, `CHANGELOG.md`, `src/lib/gemini.ts`, `src/app/api/chat/context/route.ts`, `src/app/(app)/groups/[id]/GroupChatClient.tsx`, `src/app/app-lock/page.tsx`, `src/plugins/app-blocker/web.ts`, `android/app/src/main/java/com/kaiwaai/app/FlashcardBlockActivity.kt`
- Tests: 593 passing (62 files) — lint/typecheck clean

## [2.2.5] - 2026-10-13

### Changed
- **Landing page layout & grid alignment** — adjusted `LandingFooter` container width from `max-w-6xl` to `max-w-7xl px-4 sm:px-7 2xl:max-w-[1500px]`, bringing footer margins into exact alignment with `LandingNav`, `LandingHero`, and the main page content grid.
- **Landing navigation links** — replaced dead links (`#levels`, `#pricing`, `#privacy`) in `LandingNav` and `LandingFooter` with actual interactive sections and functional routes (`#features`, `#demo`, `#quests`, `#study`, `#how`, `/settings`).
- **Landing copy modernization** — updated legacy "SuperMemo-2" reference in `LandingDeckCascade.tsx` to "Adaptive FSRS v4 Spaced Repetition (SRS)".

### Fixed
- **Stray `[` in chat word tokens and popups** — fixed string-indexing bug in `enrichTokensFromDb` (`w.meanings[0]` / `p.meanings[0]`) where querying JSON string columns in Prisma returned character `[` instead of the definition array; added safe JSON gloss parsing (`extractGloss`) and token meaning sanitization (`cleanTokenMeaning`).
- **Defensive UI bracket sanitization** — filtered stray bracket strings (`"["`, `"]"`, `"[]"`) and duplicate Japanese romaji labels in `WordToken.tsx`, `SubWordChip`, and `SelectionLookupPopup.tsx` so historical chat messages render cleanly without lone brackets.
- **Token repair payload cleaning** — updated `repairSplitTokenSurfaces` to scrub corrupted bracket meanings during client-side token hydration.
- **FSRS converter sub-second test race condition** — clamped sub-second elapsed review times in `converter.ts` to prevent microsecond floating-point test assertions from failing `toBe(1.0)`.

### Technical
- Modified: `src/lib/dictionary-enrich.ts`, `src/lib/dictionary-enrich-db.ts`, `src/lib/token-repair.ts`, `src/app/(app)/chat/WordToken.tsx`, `src/app/(app)/chat/SelectionLookupPopup.tsx`, `src/lib/fsrs/converter.ts`, `src/app/page.tsx`, `src/app/components/landing/LandingNav.tsx`, `src/app/components/landing/LandingFooter.tsx`, `src/app/components/landing/LandingDeckCascade.tsx`, `package.json`, `android/app/build.gradle`
- Tests: 599 passing (62 files) — lint/typecheck clean

## [2.2.4] - 2026-10-12

### Added
- **Android WebView cookie flush on lifecycle** — explicit `CookieManager.getInstance().flush()` calls on `onPause()` and `onStop()` in `MainActivity.kt` to persist session cookies to SQLite immediately, preventing session loss when the Android package installer kills the process during APK updates.
- **Native Capacitor cookie bridge** — enabled `CapacitorCookies` in `capacitor.config.ts` for native Android persistent storage support.

### Changed
- **Extended session cookie lifespan** — increased session cookie `MAX_AGE` from 7 days to 30 days in `src/lib/session.ts` for long-lived mobile sessions.
- **Production cookie security** — configured session cookies with `secure: process.env.NODE_ENV === "production"` to satisfy modern Chromium/WebView SSL persistence standards.
- **Focus Guard early review strategy alignment** — defaulted `app-lock` early review strategy resolution to `getLearningConfig().earlyReviewStrategy` instead of hardcoding `'practice'`.

### Fixed
- **Focus Guard rapid card repetition on failure** — failed cards ("Again" / grade 0) are now re-inserted randomly towards the back (minimum 2 cards ahead if available) rather than deterministically 2 cards ahead.
- **Focus Guard final card drop on unlock** — `handleGrade` in `src/app/app-lock/page.tsx` now awaits the review persistence POST request before `finishUnlock()` navigates away, eliminating the race condition where the 10th card's grade was canceled by page teardown.
- **Focus Guard grading input debouncing** — added a synchronous `isGradingRef` guard in `app-lock` to drop duplicate events from rapid double-taps or keypresses during deck transitions.

### Technical
- Modified: `src/app/app-lock/page.tsx`, `android/app/src/main/java/com/kaiwaai/app/MainActivity.kt`, `capacitor.config.ts`, `src/lib/session.ts`, `package.json`, `android/app/build.gradle`
- Tests: 593 passing (62 files) — lint/typecheck clean

## [2.2.3] - 2026-10-07

### Added
- **Review error screen** — dedicated error phase in `ReviewClient` with retry actions, preventing network errors or server 500s from masquerading as empty decks ("All Caught Up").
- **Timezone-aware start of day helper** — `startOfDayInTimezone` in `src/lib/day.ts` to compute exact UTC midnight in user timezone without local client/server drift.
- **Mixed review tests** — test suite in `src/app/api/review/mixed/route.test.ts` verifying mixed composition, Gauntlet mode, backfill, and malformed JSON resilience.

### Changed
- **Focus Guard learning ratio visibility** — the "Focus" ratio selector in `InterceptionRulesModal` is now conditionally shown only when `studyMode === 'all'`, where it actually takes effect.
- **Review empty states** — Daily Quest (`mixed` / `due`) now renders "All Caught Up! 🎉" instead of "No Flashcards Found"; The Gauntlet (`mixed` / `struggling`) renders "Gauntlet Cleared! 🔥" when 0 struggling cards exist.
- **Due count freshness** — `refreshDueCount` callback in `ReviewClient` triggered on session completion, early exit, and return to Quest Gallery to eliminate stale badge counters.

### Removed
- **Redundant learning ratio setting** — removed duplicate "New vs review mix" chips from `ReviewDefaultsCard` and its sync to AppBlocker, establishing single source of truth.

### Fixed
- **Daily Quest chat checkmark bug** — on `/home`, the "Send a message to Kai" quest was permanently checked for any user who had ever sent a message; `dashboard-stats.ts` now counts messages sent today in the user's timezone.
- **Mixed review backfill maintenance flags** — `src/app/api/review/mixed/route.ts` previously used stale `maintenanceCards` from pre-backfill sessions; now tracks flags from the actual session used.
- **Kanji dictionary meanings wiped in mixed mode** — `mixed/route.ts` previously overwrote dictionary meanings with single `customMeaning`; now prepends `customMeaning` while preserving full meanings and primitives.
- **Kanji review JSON parse 500s** — added `safeJsonArray` helper in `src/app/api/kanji/review/route.ts` preventing crashes on malformed database strings.

### Technical
- Modified: `src/app/(app)/settings/app-blocker/InterceptionRulesModal.tsx`, `src/app/(app)/settings/ReviewDefaultsCard.tsx`, `src/lib/day.ts`, `src/lib/day.test.ts`, `src/lib/dashboard-stats.ts`, `src/app/api/review/mixed/route.ts`, `src/app/api/kanji/review/route.ts`, `src/app/api/kanji/review/route.test.ts`, `src/app/(app)/review/ReviewClient.tsx`, `src/lib/session-composer.ts`, `package.json`, `android/app/build.gradle`
- New: `src/app/api/review/mixed/route.test.ts`
- Tests: 593 passing (62 files) — lint/typecheck clean

## [2.2.2] - 2026-10-05

Cleanup pass: removed dead prop and import surfaced during UI consistency audit.

### Fixed
- **Unused `onToggleMonitoring` prop** — removed from `QuestGallery` props interface, component destructure, and `ReviewClient` callsite. Monitoring toggle lives exclusively in the Focus Guard settings page; it was never wired up inside the review gallery after the `InterceptionRulesModal` was moved there.
- **Stale handler removed** — `handleToggleMonitoring` async function in `ReviewClient` deleted alongside the prop removal.
- **Unused `vi` import** — removed from `app-blocker-trigger.test.ts` (was imported but never called in any mock).

### Technical
- Modified: `src/app/(app)/review/QuestGallery.tsx`, `src/app/(app)/review/ReviewClient.tsx`, `src/lib/app-blocker-trigger.test.ts`
- Tests: 594 passing (62 files) — lint/typecheck clean

## [2.2.1] - 2026-09-28

Fixes across all review session types: state persistence in ReviewClient, mixed endpoint backfill, accurate mixed due counts, and UI card limit alignments.

### Fixed
- **Stale setup state across all review modes** — `ReviewClient.start()` now persists resolved session config via `setSetup(s)`. Previously, `setup` remained frozen at its initial default values throughout the session, causing Endless Zen continuous refills (`fetchMoreCards`), SRS routing (`grade`), and AppBlocker unlock checks to query with stale parameters.
- **Mixed review pool backfill** — `/api/review/mixed` previously split limits 50/50 between vocabulary and kanji with no backfill, causing sessions to return half-decks if one pool was empty or sparse. Both the standard composer (`due`/`all`) and legacy (`struggling`/`leeches`) paths now donate unused capacity to the surplus pool so requested limits are fulfilled.
- **Daily Quest due count & 50-card cap** — The review dashboard due counter now queries `/api/review/mixed` to count both vocab and kanji cards due, instead of querying vocab only. Daily Quest now launches with `limit: 50` matching the "Up to 50 cards" UI copy, preventing artificial 5- or 10-card caps when kanji counts were omitted.
- **Gauntlet session limit mismatch** — Gauntlet mode in `QuestGallery` now passes `limit: 50` matching its "50 CARDS" chip (previously passed `limit: 30`).
- **AppBlocker unlock threshold** — Unlocking now accurately tracks against actual session card count (`total`) rather than defaulting to stale `setup.limit`.

### Technical
- Modified: `src/app/(app)/review/ReviewClient.tsx`, `src/app/(app)/review/QuestGallery.tsx`, `src/app/api/review/mixed/route.ts`, `src/app/api/review/mixed/route.test.ts`, `package.json`, `android/app/build.gradle`
- Tests: 590 passing (61 files) — lint/typecheck clean

## [2.2.0] - 2026-09-27

RTK Lesson Folders overhaul — folders become self-contained lessons with images, primitives, multi-selection review, and enhanced search.

### Added
- **Multi-folder Kanji Quest selection** — Kanji Quest source picker now uses checkboxes so you can pick multiple lesson folders at once. A sticky "Study Selected (X Folders · Y Kanji) →" button appears and passes comma-separated `groupId` params to the review API which deduplicates across folders.
- **Folder lesson number** — `KanjiGroup.lessonNumber` exposed in Create Folder and Edit Folder modals. Lesson N badge shown on folder cards and in the review picker.
- **Edit Folder modal** — full modal (name, lesson #, description, image gallery) accessible via ✏️ hover button on each folder card.
- **Reference image upload** — up to 6 RTK book page screenshots per folder; compressed in-browser via canvas (max 1400px, JPEG 80 %) before storing as base64 in Postgres. Thumbnail strip visible on folder cards; click to zoom in lightbox.
- **Kanji primitive buildup** — `Kanji.primitives` JSON array field (`["一", "十", "古"]`). Entry in Add Kanji modal (space-separated). Edit on Kanji Detail page. Displayed as `一 → 十 → 古` chips on the ReviewCard flip side (JP→EN back, below radicals).
- **Folder search by lesson number** — queries like `1`, `L1`, `lesson 1`, `#1` match folders by `lessonNumber` in both the Kanji explorer search bar and the Kanji Quest picker modal.
- **Review picker folder search** — search bar inside the Kanji Quest modal to filter folders by name or lesson number.
- **Sort pills on folder grid** — sort by Lesson #, Most Kanji, Completion %, or Recently Added.
- **Image compression utility** (`src/lib/image-compress.ts`) — reusable `compressImageToDataUrl()` using HTML Canvas; enforces 500 KB output cap.
- **DB columns** — `Kanji.primitives TEXT` and `KanjiGroup.images TEXT` added via `prisma db push`.

### Changed
- **Folder cards** — show Lesson N badge, image thumbnail strip (up to 3 + overflow count), and ✏️ / ✕ hover buttons replacing the single delete button.
- **Create Folder modal** — now includes Lesson Number field in a 2-column grid alongside Description.
- **Kanji Quest picker** — redesigned as a scrollable modal with checkbox list, search, Select All/Clear, and sticky CTA footer.
- **Review API** (`GET /api/kanji/review`) — `groupId` param now accepts comma-separated IDs; deduplicates kanji across all selected folders. Returns `primitives` on every card object.
- **Groups API** (`GET /api/kanji/groups`) — returns `lessonNumber`, `images` (parsed array), `imageCount`, `thumbnail`, and `primitives` on entry kanji.

### Removed
- **RTK Lesson Number input** removed from Add Kanji modal (single entry) — lesson numbering now lives on the folder, not per-kanji.

### Fixed
- **FSRS stability never grew (review doom loop)** — `applyFsrsReview` fed the stored retrievability (always 1.0 right after the previous review) back into the scheduler, zeroing the growth term `exp(w10·(1−R))−1` and freezing stability. Cards then repeated at the same interval forever, and weak cards could never graduate. Retrievability is now recomputed at review time via the FSRS forgetting curve `R(t,S) = (1 + t/(9S))⁻¹` from the actual time elapsed since the last review (`src/lib/fsrs/apply-review.ts`).
- **Same weak cards re-served every session** — the session composer's active pool had no recency guard (the maintenance pool had one), so in `studyMode=all` (App Blocker default) the same weakest cards appeared at the front of every consecutive session. Added a 10-minute active-pool cooldown matched to FSRS's ~10-min "Again" relearn step (`src/lib/session-composer.ts`).
- **Degenerate early review could collapse stability to 0/NaN** — a 0-day-elapsed proportional early review scaled stability to 0, making `S^(−w9)` infinite; now clamped to the minimum stability (`src/lib/fsrs/scheduler.ts`).
- **Intermittent `P1001` "Can't reach database server"** — the Supabase transaction pooler terminates connections idle for ~5 minutes; stale sockets in the local `pg` pool surfaced as P1001 after sleep/wake or network blips. Pool now evicts idle connections after 60s, times out dead connections in 10s, caps at 10 connections, and enables keepalive (`src/lib/prisma.ts`).
- **`/review` ignored the user's early-review strategy** — the grade POST omitted `earlyReviewStrategy`, so the scheduler treated every early review (e.g. in-session relearn after "Again", which returns in ~10 minutes) as on-time and granted full stability growth. Now sends the user's configured strategy, matching the Focus Guard review page (`src/app/(app)/review/ReviewClient.tsx`).
- **FSRS retention setting was dead** — the Settings retention slider (70–98 %) never reached the scheduler: neither `/review` nor the Focus Guard review page sent `desiredRetention` in the grade POST, so all reviews silently used the 90 % default. Both surfaces now pass the user's setting (`src/app/(app)/review/ReviewClient.tsx`, `src/app/app-lock/page.tsx`).

### Technical
- Modified: `src/app/(app)/review/QuestGallery.tsx`, `src/app/(app)/review/ReviewCard.tsx`, `src/app/(app)/kanji/KanjiClient.tsx`, `src/app/(app)/kanji/AddKanjiModal.tsx`, `src/app/(app)/kanji/[character]/KanjiDetailClient.tsx`, `src/app/api/kanji/groups/route.ts`, `src/app/api/kanji/groups/[groupId]/route.ts`, `src/app/api/kanji/review/route.ts`, `prisma/schema.prisma`
- New: `src/lib/image-compress.ts`
- New: `src/lib/fsrs/apply-review.test.ts` (doom-loop regression tests)
- Tests: 589 passing (61 files) — typecheck clean

## [2.1.1] - 2026-09-26

Furigana display fix for Daily Quest / maintenance-pool cards.

### Fixed
- **Furigana setting on Daily Quest & composed sessions** — Removed the v1.7.0 hard-coded maintenance-pool furigana suppression from `ReviewCard`; the Learning-tab furigana mode now wins on every card. Previously, "Always" still hid furigana on maintenance-pool cards (half the Daily Quest deck), and "Smart" behaved inconsistently across composed sessions. New `resolveShowFurigana()` in `lib/review/furigana.ts` (unit-tested matrix) is shared by `/review` and `/app-lock`.

### Technical
- New: `src/lib/review/furigana.ts`, `src/lib/review/furigana.test.ts`
- Modified: `ReviewCard.tsx`, `ReviewClient.tsx`, `app-lock/page.tsx` (suppression logic removed in favor of shared resolver)

## [2.1.0] - 2025-01-19

Chat relationship mood, tokenization consistency, richer memory, in-thread quests, and related UX. See also `documentation/CHAT.md`.

### Added
- **Kai's Room home screen** — Replaced the banner-based dashboard with a pet-style, game-like home where Kai is the room: a full-bleed mood scene at every breakpoint, driven by real app data.
  - Mood engine (`src/lib/kai-mood.ts`, unit-tested): `DashboardStats` + hour → `idle` / `worried` (dueNow > 15) / `proud` (streak ≥ 3 & active today) / `lapsed` (streak broken) / `sleepy` (22:00–05:00), with Japanese greeting by time of day and per-mood speech lines.
  - Portrait scenes: renamed `public/images/kai/portraits/frame_00xx.png` → semantic names (`greeting_wave`, `studying`, `looking_away`, `snack_break`, `sparkling_joy`, `sleeping`) and mapped one scene per mood, crossfaded only when the mood changes — no timer-driven art swaps.
  - Living-room details: breathing bob, ambient sway, sparkle accents, tap = poke and press-hold = pet (with burst animations) anywhere on the room; greeting wave on load; poke/pet speech reactions.
  - Game HUD: level ring (progressLevel + %), streak and due-count pills, daily-quest checklist (review / chat), chunky Duolingo-style action buttons with a pixel-aligned two-column layout, and compact stats footer.
  - Cross-screen celebrations: `queueKaiCelebration()` (`src/lib/kai-mood.ts`) marks a session-complete flag that plays Kai's celebrate scene on the next `/home` mount.
  - New components under `src/app/(app)/home/`: `KaiRoomClient.tsx`, `KaiAvatar.tsx` (backdrop room, tap/pet handling), `KaiSpeechBubble.tsx` (tail bubble with animated line swaps); replaces `HomeClient.tsx`.
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
- **FSRS v4 Scheduling (SM-2 Migration)** — Replaced SM-2 scheduler with FSRS-19-param DSR model across vocabulary and kanji reviews.
  - Core (`src/lib/fsrs/`): scheduler, state (serialize/parse + SM-2 compatible `fsrs_v1` metadata), converter (SM-2 → FSRS deterministic mapping), config (retention 0.7–0.98), fallback handler (SM-2 recovery on malformed FSRS state).
  - New Prisma fields on `UserFlashcard` + `UserKanji`: `difficulty Float`, `stability Float`, `retrievability Float`.
  - Data migration: `scripts/migrate-to-fsrs.ts` (idempotent, 500-row batches, preserves SM-2 originals for rollback), `npm run migrate:fsrs` alias.
  - Review endpoints wired: `api/flashcards/review`, `api/kanji/review`, `api/review/mixed` — unified orchestration via `lib/fsrs/apply-review.ts`.
  - Progress: `0.7·clamp(S/90)+0.3·clamp((10−D)/9)` in `lib/progress/calculator.ts` (with SM-2 fallback).
  - Status: known iff `S > 21 ∧ D < 6` in `lib/status/calculator.ts` (with SM-2 mature fallback ≥3 reps ∧ interval ≥21d).
  - Session composer weights weak cards (`D > 7 ∧ S < 5`).
  - Learning preferences: `lib/learning-config.ts` (desired retention 0.7–0.98, maxDailyReviews/maxNewCards limits, earlyReviewStrategy, direction/furigana/learningRatio defaults), stored in localStorage.
  - Settings UI: `FsrsSettingsCard` (retention slider, max daily reviews / new cards, early review strategy).
  - Debug endpoint: `GET /api/debug/fsrs-state` with 3 modes — `?cardId=uf_xxx` (single-card DSR inspection + per-grade projections + SM-2 vs FSRS interval delta), `?userId=xxx&limit=20` (aggregate + per-card summary), no params (runtime FSRS parameters dump).
  - Correctness properties (100-iteration per-test): P13 migration idempotency / post-conversion bounds in `converter.test.ts`; P14 progress bounds [0,1] in `progress/calculator.test.ts`; P15 status classification rules + P16 status-progress consistency in `status/calculator.test.ts`.

### Changed
- **Furigana setting unified under Learning defaults** — The Always / Smart / Off furigana selector in **Settings → Learning → Review defaults** is now the single source of truth for furigana on flashcards across **all** review surfaces, not just the Focus Guard interceptor:
  - Regular review quests (`/review`) now honor it — previously furigana was always shown regardless of the setting (`ReviewClient` never passed `showFurigana` to `ReviewCard`).
  - Changing the setting mirrors `furiganaMode` (+ legacy `showFurigana`) into the native AppBlocker config (`AppBlocker.setAppBlockerConfig`), so the Android interceptor picks it up without a rebuild; pre-existing native values stay in effect until the user touches the Learning setting.
  - Focus Guard Interception Rules UI no longer edits furigana — the modal row (`FocusGuardStatusCard`), the editor toggle (`InterceptionRulesEditor`), and related props/state were removed; `/app-lock` resolution order is URL param → saved native config → legacy `showFurigana` → Learning config → `'always'`.
- **Chat hub chrome** — URL-synced tabs, personas before quests, slimmer mobile header / nav on `/chat`.
- **Profile entry points** — Name/avatar opens the profile & memory drawer; removed duplicate Profile chip and Profile & Memory header button; ⋯ keeps Open full diary (`/memory`).
- **Memory suggestions UI** — Collapsed pill / durable chips with category cues; pending suggestions cached per conversation.
- **Prompt context** — `/api/chat/context` scoped with `chatId` (recent turns, mood, summary, memories).
- **Relearn grades** — Again + Hard only on relearn (Good/Easy disabled) with unit coverage.
- **Kai avatar** — Restored brand SVG mark in chat (not the `image.png` crop).
- **Review quest card session limits** — Standardized to better single-sitting sizes: Vocabulary preset 5→15 cards; Gauntlet/rescue preset 50→30 (struggling cards are cognitively more tiring). Synced PRESET_DEFAULTS (words=15, rescue=30) in `lib/review/presets.ts`.
- **Focus Guard (`/app-lock`) review-pull limit** — Now reads `maxDailyReviews` from `learning-config.ts` (user's FSRS SRS preferences) instead of hard-coding 50; matches the user's configured SRS workload.
- **FSRS data migration script** — Loads `DATABASE_URL` via `dotenv/config` so `npx tsx scripts/migrate-to-fsrs.ts` works without manual env injection.

### Fixed
- **Furigana setting on Daily Quest & composed sessions** — Removed the v1.7.0 hard-coded maintenance-pool furigana suppression from `ReviewCard`; the Learning-tab furigana mode now wins on every card. Previously, "Always" still hid furigana on maintenance-pool cards (half the Daily Quest deck), and "Smart" behaved inconsistently across composed sessions. New `resolveShowFurigana()` in `lib/review/furigana.ts` (unit-tested matrix) is shared by `/review` and `/app-lock`.
- **PC token range handles** — Hit-testing skips `[data-token-selection-ui]` so ‹ › drag works when chrome sits under the cursor.
- **Outreach / context memory scoping** — Persona-filtered memories; superseded rows excluded from injection.

### Technical
- Migrations: `20260922100000_chat_mood_memory_summary`, `20260922120000_message_reply_to`, `20260924000000_add_fsrs_fields`
- New libs/routes: `mood`, `tokenization`, `memory-normalize`, `memory-upsert`, `dictionary-enrich*`, `lookup-cache`, `reply-preview`, `message-serialize`, `fsrs/*` (scheduler, state, config, converter, fallback, apply-review), `learning-config`, `progress/calculator`, `status/calculator`, `api/dictionary/enrich`, `api/memory/bulk`, `api/groups/[id]/summary`, `api/debug/fsrs-state`, chat `TokenPopup` / `SavedWordsContext` / `SelectionLookupPopup`
- New scripts: `scripts/migrate-to-fsrs.ts` (`npm run migrate:fsrs`)
- Tests: 541 passing (58 test files) — 33 new for FSRS: scheduler (P1–P6), converter (P13), progress/calculator (P14 + units), status/calculator (P15–P16 + units), customSession (2)
- Touched: `GroupChatClient`, `ConvMenu`, `ChatHub`, `QuestLauncher`, `RichText`, `MemorySuggestions`, `MemoryClient`, `gemini`, `group-chat`, message/proactive/memory/context routes, flashcards/kanji/mixed review routes, `prisma/schema.prisma`, `QuestGallery`, `app-lock/page.tsx`, `FsrsSettingsCard`, `presets`, `package.json`

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
