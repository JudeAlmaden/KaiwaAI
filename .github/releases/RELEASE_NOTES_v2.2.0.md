# KaiwaAI v2.2.0 — RTK Lesson Folders overhaul + FSRS doom-loop fix

> **Full Changelog:** [`v2.1.1...v2.2.0`](https://github.com/JudeAlmaden/KaiwaAI/compare/v2.1.1...v2.2.0)

Kanji folders are now self-contained lessons with reference images, primitive buildups, and multi-folder quest sessions — plus a fix for the FSRS scheduler bug that kept serving the same cards at the same interval forever.

## ✨ New Features

### 📁 Folders as lessons
- **Reference image uploads** — attach up to 6 RTK book page screenshots per folder. Images are compressed in-browser (canvas, max 1400px, JPEG 80%, 500 KB cap) before storing, shown as thumbnail strips on folder cards, and viewable full-size in a lightbox.
- **Kanji primitives** — `Kanji.primitives` JSON array (e.g. `["一", "十", "古"]`). Add in the Add Kanji modal (space-separated) or edit on the Kanji Detail page. Displayed as `一 → 十 → 古` chips on the ReviewCard flip side.
- **Lesson numbers on folders** — `KanjiGroup.lessonNumber` with badge display on folder cards and the review picker.
- **Edit Folder modal** — full editor (name, lesson #, description, image gallery) via the ✏️ hover button on folder cards.
- **Sort pills on the folder grid** — by Lesson #, Most Kanji, Completion %, or Recently Added.

### 🔀 Multi-folder Kanji Quest sessions
- Pick **multiple lesson folders at once** via checkboxes in the quest source picker, with a sticky "Study Selected (X Folders · Y Kanji) →" CTA.
- The review API accepts comma-separated `groupId` params and deduplicates kanji across folders.
- Search folders by lesson number (`1`, `L1`, `lesson 1`, `#1`) in both the explorer search bar and the quest picker modal.

## 🐛 Fixed

### FSRS review doom loop
`applyFsrsReview` was feeding the **stored retrievability** (always 1.0 immediately after the previous review) back into the scheduler. That zeroes FSRS's growth term `exp(w10·(1−R))−1`, so **stability never grew** — cards repeated at the same interval forever and weak cards could never graduate out of the active pool.

Retrievability is now recomputed at review time with the FSRS forgetting curve `R(t,S) = (1 + t/(9S))⁻¹` from the actual time elapsed since the last review. Intervals now lengthen normally from the next review onward; no data migration needed.

### Same weak cards re-served every session
The session composer's **active pool had no recency guard** (the maintenance pool did), so in `studyMode=all` — the App Blocker default — the same weakest cards appeared at the front of every consecutive interception session. Added a 10-minute active-pool cooldown, matched to FSRS's ~10-minute "Again" relearn step.

### Scheduler edge case
A 0-day-elapsed proportional early review could scale stability to 0 and poison the result with `NaN` (`S^(−w9)` → ∞). Now clamped to minimum stability.

### Intermittent `P1001` "Can't reach database server"
The Supabase transaction pooler terminates connections idle for ~5 minutes; stale sockets in the local `pg` pool surfaced as P1001 after sleep/wake or network blips. The pool now evicts idle connections after 60s, times out dead connections in 10s, caps at 10 connections, and enables TCP keepalive.

## 🔧 Technical

- **DB**: `Kanji.primitives TEXT`, `KanjiGroup.images TEXT` (migration `20260927000000_kanji_primitives_folder_images`)
- **APIs**: `GET /api/kanji/review` multi-`groupId` + dedup + `primitives` on every card; `GET /api/kanji/groups` returns `lessonNumber`, parsed `images`, `imageCount`, `thumbnail`
- **New libs**: `src/lib/image-compress.ts` (reusable canvas compressor), `src/lib/fsrs/apply-review.test.ts` (doom-loop regression tests)
- **Version**: `2.1.1` → `2.2.0` (`package.json`, Android `versionCode 20200`)
- **Tests**: 589 passing (61 files) · typecheck clean

**Stats**: 24 files changed, +2,714 / −657
