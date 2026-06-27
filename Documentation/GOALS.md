# KaiwaAI — Goals

## Vision

An AI conversation partner for learning Japanese through **comprehensible input**.
The AI talks to you in Japanese at your level (starting at N5), drip-feeds new
vocabulary a little at a time, and every word is tappable for an instant
translation. New words you encounter are automatically saved as flashcards and
resurfaced for review using spaced repetition.

The method blends two proven ideas:
- **Comprehensible input** (Krashen) — you learn by understanding language
  slightly above your current level.
- **Spaced repetition (SRS)** — review words at increasing intervals so they
  stick in long-term memory.

## Target User

Beginner-to-early-intermediate Japanese learners (JLPT N5 and up) who want
conversational practice without being overwhelmed, and who want vocabulary
capture to happen automatically as a side effect of chatting.

## Core MVP Features

1. **AI chat constrained to N5** — conversation stays within N5 grammar and
   vocabulary, introducing roughly 1–2 new words per exchange.
2. **Known-words tracking (source of truth)** — the user's vocabulary is stored
   in a structured database that the app owns. This list is injected into the
   AI's system prompt every turn so the model builds sentences from words the
   user already knows, instead of relying on the model to "remember" progress.
3. **Tap-to-translate** — tap any word to see a popup with:
   - Romaji
   - Reading (hiragana / katakana)
   - English meaning
4. **Auto-flashcards** — new or tapped words are saved automatically.
5. **SRS review** — flashcards resurface on a spaced-repetition schedule
   (SM-2 algorithm).
6. **Progress tracking** — words learned, streak, and level.

## Known-Words Model (Flashcards as Source of Truth)

The key insight: **don't trust the model to track what the user knows.** Make
the vocabulary database authoritative and feed it to the AI on every request.

We go one step further: **the flashcard table _is_ the vocabulary database.**
There's no separate "known words" list to keep in sync. The known-words view is
simply a query over flashcards (e.g. `status = 'known'` or
`mastery >= threshold`), grouped by `part_of_speech`. The same rows drive both
the SRS review schedule and the AI's vocabulary constraint.

### Flashcard schema

> Conceptual shape below; the authoritative Prisma model is in `SCHEMA.md`.

```
Flashcard
---------
id              unique identifier
word            dictionary/lemma form (e.g. たべる) — dedupe key
reading         hiragana/katakana reading
romaji          romaji
meaning         context-appropriate English
part_of_speech  verb | adjective | noun | particle | ...
status          new | learning | known   (drives usage policy; SM-2 fields below)
ease/interval/repetitions  SM-2 scheduling fields
times_reviewed  formal SRS reviews
exposures       times Kai used it in chat (soft signal; can't graduate alone)
next_review     timestamp for next SRS review
```

There is no stored `mastery` float — a 0–1 progress value is derived on read
from the SM-2 fields. See `SCHEMA.md`.

### Deriving the AI constraint (level + reinforce, not the full list)

The naive approach — enumerate every known word in the prompt — does **not**
scale: a power user with 1,500 words would bloat every request. Instead we send
the **level ceiling** plus the **specific words to push this turn**:

```json
{
  "level": "N5",
  "reinforce": ["たべる", "ねむい", "みず"],
  "newWordBudget": 1,
  "knownCount": 1240,
  "guidance": "Stay within N5 + words the user knows. Use reinforce words on purpose. Introduce at most newWordBudget new words."
}
```

The model doesn't need 1,240 words listed to stay in-level — it needs the level
ceiling and the words to reinforce. Prompt size stays flat regardless of deck
size. (Tradeoff: the model may occasionally use a known word slightly above the
stated level — fine, it's in the user's deck and tap-to-translate catches it.)

### Word states → usage policy (the teaching loop)

A flashcard's `status` doesn't just track progress — it controls how Kai uses
the word, turning SRS into something that happens *inside conversation*:

| State | Meaning | Kai's behavior |
|---|---|---|
| **unknown** | not in deck | only via `newWordBudget` (1–2/turn, deliberate) |
| **learning** | recently met, not solid | **reinforce** — Kai actively reuses it |
| **known** | solid | use freely and naturally |
| **rusty** | known but `nextReview` overdue | **resurface** — added to `reinforce` |

`reinforce` = top ~5 by urgency from `learning` + overdue `known`, capped so Kai
isn't cramming. Most of a sentence is `known` vocabulary (stays comprehensible)
with a small deliberate dose of reinforce/new words — roughly Krashen's "i+1".

### Per-word mastery (two inputs)

Mastery = `status` + SM-2 fields (no stored `mastery` float; derive on read).
It moves from **both** channels:
1. **SRS reviews** (the review screen) — full SM-2 grade; these *graduate* words.
2. **Conversational exposure** — when Kai uses a `learning` word and the user
   follows/reuses it, that's a soft positive nudge (capped, weighted below a
   review). A word **cannot** reach `known` without ≥1 real review.

This is why learning here beats pure flashcards: words graduate partly through
*using them in chat*, which is how real acquisition works.

### Words enter the deck two ways
1. **Kai introduces** a word (the model's `newWords` array) → auto-saved as
   `status: new`.
2. **The user taps** a word and chooses **Add to review** → manual capture.

Both upsert the same flashcard, deduped on dictionary form (`dictForm`).

## Technical Approach

For personal use we go **model-first**: instead of a client-side NLP stack, Kai
returns her reply *and* a per-word token breakdown in a single Gemini
structured-output call.

| Challenge | Solution |
|---|---|
| Segmenting Japanese + readings/romaji/meanings | **Gemini structured output** — reply + `CachedToken[]` (surface, reading, romaji, meaning, pos, dictForm) in one call |
| Keeping AI at the user's level | System prompt with **level + reinforce words + newWordBudget** (not the full list) |
| Knowing what the user already knows | App-owned **flashcard DB**; derives the reinforce/level payload each turn |
| Spaced repetition scheduling | **SM-2 algorithm** |
| (optional, post-MVP) reading accuracy backstop | small deterministic kana dictionary to verify/correct model readings |

Why model-first over kuromoji + kuroshiro + JMdict: it removes the gnarliest
dependency (bundled dictionaries, segmentation/conjugation edge cases), and the
model already knows which words it used — so segmentation matches the sentence
and `dictForm` is correct, eliminating the lemma-mismatch class of bugs. Context-
aware meanings (the sense actually used) are a bonus. Tradeoff: readings can
occasionally be wrong (post-MVP backstop) and it needs a network call (no offline
tap-to-translate). Acceptable for a single online learner.

### API Key: Bring-Your-Own-Key (BYOK)

Each user supplies their **own Gemini API key**. This keeps the app free to run
and avoids overloading any shared quota — every user's requests count against
their own Google AI Studio allowance. There's no billing or request-proxying
infrastructure to maintain.

Key-handling principles (we're holding someone else's credential, so this
matters):

- **Client-side only** — the key lives in the browser (localStorage or
  IndexedDB). It is never sent to or stored on our server.
- **Direct calls** — the browser calls the Gemini API directly with the user's
  key. If a proxy is ever needed, it must never log or persist the key.
- **Transparency** — tell the user plainly that their key stays on their device.
- **Easy removal** — a "remove key" control wipes it from storage anytime.
- **First-run setup** — prompt for the key on first use, with a link to Google
  AI Studio and short instructions for generating one.

Tradeoff (acceptable for BYOK): calling Gemini from the browser exposes the key
in that user's own network requests. Since it's their key on their machine,
this is fine and standard. The hard rule is simply: never handle other users'
keys server-side.

## Stack

- **Next.js** (App Router, TypeScript)
- **Tailwind CSS**
- Japanese tokenization/translation: **Gemini structured output** (model-first;
  no client-side NLP stack). Optional post-MVP: small kana dictionary as a
  reading-accuracy backstop.
- Persistence: **Prisma 7 + SQLite** (see `SCHEMA.md`)
- LLM provider: **Gemini**, **BYOK (bring-your-own-key)** — each user supplies
  their own Google AI Studio API key, so usage hits their quota, not the app's.

## Build Order (Phased)

Each phase is independently usable, so there's something working early.
Status as of the current build:

- **Phase 1 ✅** — Chat UI + bilingual N5 AI conversation (Gemini structured
  output returning reply + English gloss + per-word tokens). Playful persona,
  model switcher, multi-key rotation, auto model-fallback.
- **Phase 2 ✅** — Tap-to-translate popup + tap-to-add flashcards (from model
  tokens). Word lookup (search any word via Gemini and add it).
- **Phase 3 ◐** — Capture done (auto-save opt-in + manual tap-to-add). The
  status-driven reinforcement payload (level + reinforce words) is wired into
  the prompt; exposure-based nudging is still TODO.
- **Phase 4 ✅** — SRS review (SM-2): due sessions, custom sessions (by status /
  count / study-ahead), flip cards, keyboard shortcuts, audio, end summary.
- **Phase 5 ◐** — Vocab deck (search, filters, progress rings, detail sheet with
  reset/mark-known/delete) and Kai's Memory diary are built. Streaks and
  day-summary rollups are still TODO.

Legend: ✅ done · ◐ partial · (unmarked) not started.

## Open Decisions

- **LLM provider**: Gemini selected, BYOK model — each user supplies their own
  key (stored client-side only). No shared app key needed.
- Whether to add persistence/accounts later (local storage is fine for MVP).
