# KaiwaAI — Persistent Memory Plan

How Kai remembers you across time without blowing the context window or costs.
This is the architecture; the tables live in `SCHEMA.md`.

## The problem

Storing the raw transcript is *history*, not *memory*. Re-reading every past
message each turn would exhaust the context window and run up BYOK cost. We need
to distill the conversation into small, durable, reconciled context that gets
injected each turn — and keep it from growing forever or filling with stale,
duplicate, or contradictory facts.

## Three kinds of memory

| Kind | Stores | Lives in | Nature |
|---|---|---|---|
| **Vocabulary** | what you know | `Flashcard` | already solved (GOALS.md) |
| **Episodic** | what happened, when | message stream + `DaySummary`/`MonthSummary` | timeline, lossy upward |
| **Semantic** | durable facts about you | `Memory` | reconciled global truth |

Key principle: **episodic summaries feed semantic extraction; the `Memory`
table is the single reconciled truth.** Summaries are scoped context (one day /
one month); they never act as the cross-time source of truth. That job is the
`Memory` table's alone, which is how we avoid summaries contradicting each other.

## The temporal hierarchy (episodic)

One continuous, append-only message stream per user, compacted coarse-to-fine as
time passes — like human memory (today in detail, last month as a gist).

```
Messages (raw turns, dayKey-stamped)
    │  roll up when the day closes OR context exhausted mid-day
    ▼
DaySummary   ("2026-06-27: practiced food vocab, learned ねむい, talked about cat Pochi")
    │  roll up when the month closes            [POST-MVP]
    ▼
MonthSummary ("June: daily-life vocab, ~40 new words, prepping for a Japan trip")
    │  (optional)                               [POST-MVP]
    ▼
YearSummary / "era" summaries
```

Each level is shorter and denser than the one below. This bounds prompt size
forever: today detailed, the rest gist.

### Rollup triggers (no always-on server required)

1. **Day close** — when a new day's first message arrives, close out unsummarized
   prior days: summarize each into a `DaySummary`, mark its messages
   `summarized = true`, then run memory extraction on it.
2. **Context exhausted mid-day** — if today's raw turns grow too large, fold the
   older half into a *partial* `DaySummary` (`partial = true`) and continue,
   tracking a watermark of what's already summarized.
3. **Lazy catch-up** — rollups run on session start, not on a cron. If a user
   returns after months, all unsummarized days are closed out in one batched
   pass. Never rely on a scheduler we might not have.

A Kiro agent hook (`agentStop`, or a manual `userTriggered`) is a natural place
to kick off rollup/reflection.

## Prompt assembly (each turn)

```
system prompt =
    persona (Kai, N5, gentle)
  + level + newWordBudget           ← User.level, User.maxNewWords
  + reinforce words (≤5)            ← Flashcard (learning + overdue known)
  + knownCount (ceiling signal)     ← COUNT of known flashcards (NOT the list)
  + semantic memories               ← Memory (top active; MVP: recent, no decay)
  + recent month gist               ← MonthSummary (post-MVP; skip pre-MVP)
  + today's running summary          ← DaySummary(partial) if present
  + last ~6 raw messages             ← Message stream
```

Always bounded, always small. Critically, we send **level + reinforce words**,
**never the full known-words list** — a power user with 1,500 words would bloat
every prompt. The model needs the level ceiling plus the specific words to push;
it doesn't need 1,500 words enumerated. This keeps the prompt flat-sized forever.
See GOALS.md "Vocabulary & Reinforcement" for the full payload.

## Recall / drill-down

Because each level points to the one below (`MonthSummary.dayKeys` →
`DaySummary.dayKey` → `Message.dayKey`), Kai can walk coarse-to-fine on demand.

Example — user says *"remember that trip I went on last month?"*:

```
MonthSummary (last month)   → "trip around the 14th, talked about Kyoto"
        ↓ (dayKeys pointer)
DaySummary (2026-05-14)     → "described the trip: temples, food, got lost"
        ↓ (dayKey lookup, indexed)
Messages WHERE dayKey=2026-05-14  → the actual turns, full detail
```

Two cheap indexed queries, never a full-history scan. Summaries are effectively a
human-readable index over the raw timeline.

### Triggering recall

- **MVP — heuristic pre-fetch:** detect temporal/topical phrases ("last month",
  "yesterday", "that time we…") in the user message, fetch matching summaries,
  inject before calling the model.
- **Later — tool/function calling:** give Kai a `recall(timeRange, topic)`
  function; the model calls it when it needs the past, code does the
  month→day→message walk and returns the slice.

### When summaries miss (graceful degradation)

Compaction is lossy — a detail may never have made it into the summary. Fallback
order: summaries (fast path) → keyword/embedding search over `DaySummary` rows →
raw messages. Embedding search is **post-MVP**.

## Cleanup & compaction of semantic memory

Without a lifecycle, `Memory` grows forever and fills with junk. Defenses, in
order of importance:

1. **Dedupe / merge at write time (most important).** Extraction proposes
   candidates; before inserting, reconcile against existing rows in the same
   category:
   - same fact → skip, bump `lastUsedAt`/`importance`
   - updated fact → supersede the old row (don't add a duplicate)
   - genuinely new → insert
2. **Budget + scored eviction.** Cap memories per user (≈ 50–100). Over budget,
   evict lowest `decayScore = importance × recencyWeight(lastUsedAt)` (recency
   halves ~every 30 days). High-importance facts survive; trivia ages out.
3. **Reflection / summarization (post-MVP).** Periodically fold clusters of
   low-level memories into one higher-level memory ("watched Naruto", "likes One
   Piece" → "Enjoys shounen anime"), deleting the originals. True compaction:
   fewer rows, denser info.
4. **TTL.** Ephemeral facts ("exam next Friday") carry `expiresAt` and
   self-archive after the date.

## Contradiction handling

Three cases:

| Type | Example | Resolution |
|---|---|---|
| **Update/evolution** | Tokyo → Osaka | newer wins; supersede old |
| **Correction** | "Ken… actually Kenji" | newer + high `confidence` wins decisively |
| **True ambiguity** | "love natto" / "natto is gross" | don't auto-pick |

Mechanism: **supersede chain.** A conflicting new memory sets the old row's
`status = "superseded"` and its own `supersedesId` to the old row. Only `active`
rows are injected, so Kai sees one truth, but history is preserved for audit and
"why did Kai forget X" debugging — nothing is ever hard-lost.

- **newer + high confidence** → supersede (overwrite truth)
- **newer + low confidence** → don't overwrite a strong fact; mark `conflicted`
- **true ambiguity** → keep both as `conflicted`; let the *next* conversation
  resolve it (Kai can naturally ask "you mentioned natto before — do you
  actually like it?"). On-brand for an attentive friend.

### Where reconciliation runs

Batch, at the **rollup/extraction step** (day close / idle), **not** per message:

```
On day close:
  1. Summarize the day            → DaySummary
  2. Extract candidate facts from the day's messages
  3. For each candidate, fetch same-category ACTIVE memories
  4. LLM "reconcile" call → NEW | DUPLICATE | UPDATE | CONFLICT
  5. Apply (insert / bump / supersede / mark conflicted)
  6. Recompute decayScore, evict over budget
```

One model call per day handles cross-time conflicts, because step 3 reads the
*global* `Memory` table — not other summaries. That's how a later day's "moved
to Osaka" correctly overrides an earlier day, without the summaries ever talking
to each other.

## Fact completion across days

A close cousin of contradiction: a fact stated **incompletely** one day and
**completed** later. Example:

> **Monday:** "I cooked something nice today."
> **Tuesday:** "What I cooked yesterday was turkey."

This is *not* solved by linking summaries to each other (that would be O(days),
fuzzy, and prose-matching). It's solved the same way as contradictions: **the
`Memory` table is where the two days meet.** Monday creates a fact; Tuesday
updates the *same* fact via normal reconciliation.

```
Monday extraction:
  Memory { content: "Cooked a meal (dish unspecified)",
           category: fact, confidence: 0.5, sourceDayKey: "2026-06-22" }

Tuesday extraction — message: "what I cooked yesterday was turkey":
  1. Resolve "yesterday" → "2026-06-22"  (temporal-reference resolution)
  2. Fetch active memories; find the open "cooked a meal" fact
     (boosted by sourceDayKey == resolved day)
  3. Reconcile → UPDATE
  Memory { content: "Cooked turkey on Monday (2026-06-22)",
           confidence: 0.9, sourceDayKey: "2026-06-23",
           supersedesId: <Monday's memory> }
```

Monday's vague row becomes `superseded`; Tuesday's complete row is the active
truth. **The `Memory` row is the link** — no summary-to-summary edge required.

### Temporal-reference resolution (the one new capability)

Before matching, reconciliation must turn relative time phrases into concrete
`dayKey`s. This is a small **deterministic** step (we know today's `dayKey` and
the user's tz):

```
"yesterday"        → today − 1 day
"the day before"   → today − 2 days
"last Monday"      → most recent Monday before today
"last month"       → previous monthKey
```

The resolved dayKey is passed into the reconcile prompt so the model knows
*which* prior fact is being completed, and into the candidate query to
boost/filter memories with that `sourceDayKey`.

Updated day-close flow:

```
On day close:
  1. Summarize the day                         → DaySummary
  2. Extract candidate facts
  2b. Resolve temporal phrases → dayKeys; record them on
      DaySummary.relatedDayKeys (navigation/drill-down)
  3. Fetch same-category ACTIVE memories (boost by resolved sourceDayKey)
  4. LLM reconcile → NEW | DUPLICATE | UPDATE | CONFLICT
  5. Apply; recompute decayScore; evict over budget
```

### Summaries stay episodic

We do **not** rewrite Monday's summary. Both read naturally and accurately as
records of what was *said that day* ("Mon: cooked dinner"; "Tue: said yesterday's
dinner was turkey"). The *resolved truth* ("cooked turkey Monday") lives only in
`Memory`, which is what gets injected. `DaySummary.relatedDayKeys` is purely for
**navigation** ("show me the day Tuesday referred to") — never for truth.

### Limitation

This fires only when the later reference is explicit enough for temporal
resolution + reconciliation to catch (a clear time cue, and the open fact still
reachable). A vague callback days later ("the turkey was great") with the
original fact already aged out of the injected set may not connect. Backstop:
the detail is recoverable by drilling into the source day's messages, and
embedding search (post-MVP) can find "turkey/cooking" mentions across days.

## Message length limit

A per-message cap on **user input** (`MAX_MESSAGE_CHARS` ≈ 200):

- **Bounds the prompt** — predictable per-turn token budget, easier BYOK cost.
- **Pedagogically correct** — N5 practice; short messages keep the learner
  producing simple, focused Japanese instead of dumping English paragraphs.
- **Cheaper rollups** — shorter turns → smaller days → cheaper, cleaner summaries.
- **Abuse protection** — caps token-flooding / injection on a key.

Rules: enforce client (live counter, disable send) **and** server (reject
oversized — never trust the client); count code points (`[...str].length`), not
bytes. Note: this caps *user* input only — Kai's replies and accumulated history
are still the main context drivers, so the hierarchy is still needed. They
complement each other.

## Known risks & mitigations

| Risk | Mitigation |
|---|---|
| Lossy compaction drift (summaries of summaries) | keep/raw-archive messages + drill-down to recover ground truth |
| Fuzzy day boundary (midnight/DST/travel) | `dayKey` stamped in user's tz at insert; roll up on next session, not strict midnight |
| Rollup never triggers (user vanishes) | lazy catch-up on session start, batched |
| BYOK cost/latency of extra calls | batch (one call summarizes day + extracts); only roll up when needed |
| Mid-day partial-summary bookkeeping | `summarized` watermark + `partial` flag |
| Recency ≠ relevance (old reference missed) | embedding/keyword fallback over summaries (post-MVP) |
| Incomplete fact never completed (vague late callback) | drill-down to source day; embedding search (post-MVP) |
| Bad LLM merge/missed contradiction | supersede audit trail (recoverable) + Settings "view/edit what Kai remembers" |

## Performance & concurrency

Combining reinforcement vocab with the memory hierarchy creates friction. What
actually matters (the local indexed SQLite queries are sub-ms and **not** the
bottleneck):

1. **Prompt bloat — the big one.** Never put the full known-words list in the
   prompt. Send `level` + `reinforce` (≤5) + `newWordBudget` + `knownCount`.
   Keeps prompt size constant regardless of deck size.
2. **Per-turn latency.** The Gemini call dominates. Run all DB reads in
   `Promise.all`. (No local kuromoji load anymore — tokens come from the model,
   so that former cost is gone; the tradeoff is larger model output.)
3. **Rollup is the cost spike, not the turn.** Day-close does summary + extract
   + reconcile + level recompute. Do it as **one batched structured LLM call**,
   run **async/non-blocking** on session start — user chats immediately while it
   finishes behind them. Never block a turn on rollup.
4. **SQLite is single-writer.** Per turn writes user msg + Kai msg + flashcard
   upserts + exposure bumps. Ensure **WAL mode** is on (reads proceed during
   writes); keep write transactions small/batched. Fine for single-user; matters
   more if ever multi-tenant.
5. **Chat ↔ rollup races.** User creates `learning` words while background rollup
   recomputes level/memory. Snapshot rollup inputs at start, or gate rollup to
   "no turn in flight". Treat level/decay as eventually-consistent — a stale
   value for one turn is harmless.
6. **Exposure double-count.** Cap chat-exposure credit (max +1/word/day, weighted
   below a review; never auto-graduate to `known` without a real review), or a
   word Kai repeats gets falsely marked known and drops out of reinforcement.
7. **Token/flashcard match.** Always key on `dictForm` (model-provided), normalize
   identically at capture and match, or known words show as new / exposures miss.
8. **Cold start.** A new user has an empty deck → nothing to build sentences
   from. Seed ~80–100 core N5 words as `known`/`learning` on signup.

## Privacy note (BYOK)

GOALS.md's "your data stays on your device" promise is specifically about the
**Gemini API key** (client-side only). Memory, summaries, flashcards, and the
message stream live server-side in the app's SQLite DB (same as accounts). A
Settings screen to **view, edit, and delete** memories supports both user trust
and that distinction. Word the privacy copy precisely so it isn't misleading.

## MVP scope (build order)

This is a **personal-use app** — build the small version, keep the rest as
roadmap. Don't gate the app on reconciliation infrastructure you, as the single
known user, can replace with "edit the memory row by hand."

1. **Continuous `dayKey` message stream** + frontend day-grouping.
2. **Model-generated tokens** (Gemini structured output: reply + per-word
   `CachedToken[]` + `newWords`) — no local kuromoji/JMdict stack.
3. **Tap-to-add flashcards** + auto-save Kai's `newWords`; dedupe on `dictForm`.
   `status` + SM-2 drive usage (reinforce / free / new); chat exposure nudges.
4. **Plain `Memory` table** — content/category/importance, **manually editable**
   in Settings. Skip the supersede chain, confidence, decay, and full LLM
   reconciliation until contradictions actually bite.
5. **`DaySummary`** with lazy day-close rollup (keeps the prompt cheap).
6. **Message length limit** (client + server).
7. *(post-MVP)* `MonthSummary`/year tiers, full reconciliation + confidence +
   supersede chain, temporal-reference resolution, decay eviction, reflection
   compaction, TTL, function-calling recall, embedding-search fallback,
   deterministic reading backstop.
