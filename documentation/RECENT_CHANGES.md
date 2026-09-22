# Recent changes — `dev` vs `main`

**Version:** **2.1.0** (Unreleased — developing on `dev`; `main` remains **2.0.0**)  
**As of:** 22 Sep 2026  
**Compare:** working tree on local `dev` ↔ `origin/main` (`2713c1b`)

Changelog entry: root [`CHANGELOG.md`](../CHANGELOG.md) → `[2.1.0]`. Architecture: [CHAT.md](./CHAT.md).

## Branch picture

| Ref | Tip |
|-----|-----|
| `origin/main` | `2713c1b` (v2.0.0 released) |
| Local `dev` HEAD | Same commit as `main`; **2.1.0 WIP in working tree** |
| `origin/dev` | Behind (`2285800`) — remote not updated |

**Committed history:** no unique commits on `dev` vs `main` yet.  
**Actual delta:** uncommitted 2.1.0 work on local `dev`. Not a prerelease tag — ship as **2.1.0** when merged/released from `dev` → `main`.

---

## What `dev` has that `main` does not

### Schema / migrations

| Model | New fields |
|-------|------------|
| `Chat` | `mood`, `moodScore`, `moodUpdatedAt`, `summary`, `summaryUpToId` |
| `Message` | `replyToId` + denormalized reply preview columns |
| `Memory` | `lastUsedAt`, `supersededById` |

```
prisma/migrations/20260922100000_chat_mood_memory_summary/
prisma/migrations/20260922120000_message_reply_to/
```

Apply before relying on the new columns: `npx prisma migrate deploy`

### Mood (per-conversation)

- `src/lib/mood.ts` (+ tests)
- Prompt injection via `/api/chat/context`, gemini, group-chat
- Header emoji + hub row indicators; proactive gated by mood
- Independent of outreach ladder on `User.consecutiveIgnored`

### Tokenization & lookup

- Shared contract: `src/lib/tokenization.ts` (`validateTokens`, JP-only)
- `SavedWordsContext`, `TokenPopup`, `SelectionLookupPopup`, `lookup-cache`
- Dictionary enrich on persist: `dictionary-enrich*` + `POST /api/dictionary/enrich`
- RichText PC range-handle fix (hit-test skips selection chrome)

### Memory

- Suggestions as `{ content, category, importance }` (`memory-normalize`)
- Upsert/dedup (`memory-upsert`) + `POST /api/memory/bulk`
- Soft supersede + `lastUsedAt` on context inject
- Rolling summary: `POST /api/groups/[id]/summary` (~40+ turns)

### Replies

- Messenger-style quote fields + `reply-preview` / `message-serialize`
- Swipe / affordance wiring in `GroupChatClient`

### Chat / hub UX

- Slimmer hub chrome, URL-synced tabs, personas before quests
- Profile: name/avatar → drawer only (no duplicate Profile & Memory button)
- ⋯ menu: Open full diary; **Start a quest** in this chat (`QuestLauncher` + `existingGroupId`)
- Kai SVG avatar restored (not `image.png` crop)
- Memory suggestions collapsed pill
- Review relearn: Again + Hard only (`ReviewCard` + test)

### Docs restored / cleaned under `documentation/`

Lean Markdown set: `CHAT.md`, `DESIGN.md`, `MOBILE_SETUP.md`, `APP_BLOCKER.md`, `AUTO_SYNC.md`, flashcard session-composer README, this file. (These paths are absent on current `main` tip.)

---

## New paths (not on `main`)

```
src/lib/mood.ts (+ test)
src/lib/tokenization.ts (+ test)
src/lib/memory-normalize.ts (+ test)
src/lib/memory-upsert.ts
src/lib/dictionary-enrich.ts (+ db helper + test)
src/lib/lookup-cache.ts
src/lib/reply-preview.ts (+ test)
src/lib/message-serialize.ts
src/app/(app)/chat/SavedWordsContext.tsx
src/app/(app)/chat/TokenPopup.tsx
src/app/(app)/chat/SelectionLookupPopup.tsx
src/app/api/dictionary/enrich/
src/app/api/memory/bulk/
src/app/api/groups/[id]/summary/
src/app/(app)/review/ReviewCard.relearn.test.ts
prisma/migrations/20260922100000_chat_mood_memory_summary/
prisma/migrations/20260922120000_message_reply_to/
documentation/{CHAT,AUTO_SYNC,README,RECENT_CHANGES}.md
(+ restored DESIGN, MOBILE_SETUP, APP_BLOCKER, flashcard-session-composer)
```

### Notable modified paths

`GroupChatClient`, `ConvMenu`, `ChatHub`, `QuestLauncher`, `RichText`, `MemorySuggestions`, `MemoryClient`, `gemini` / `group-chat`, message + proactive + memory + chat context routes, `prisma/schema.prisma`

---

## Still missing on both (deferred)

- Gemini streaming / incremental JSON
- Message-list virtualization
- Jump to quoted message outside the loaded page

---

## How to refresh this doc

```bash
git fetch origin
git diff --stat origin/main
git ls-files --others --exclude-standard -- src prisma documentation
```
