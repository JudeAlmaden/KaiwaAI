# Chat — architecture reference

Durable notes for agents working on `/chat` and persona conversations. Prefer code over this doc when they disagree.

## Surface area

| Area | Entry |
|------|--------|
| Hub (Chats / AI / Friends) | `src/app/(app)/chat/ChatHub.tsx` |
| Active thread | `src/app/(app)/groups/[id]/GroupChatClient.tsx` via `/chat/c/[id]` |
| Memory diary | `src/app/(app)/memory/MemoryClient.tsx` |
| BYOK Gemini | `src/lib/gemini.ts` |
| Server group replies | `src/lib/group-chat.ts` |
| Prompt context | `GET /api/chat/context?personaId=&chatId=` |

## Mood (per-conversation)

- Domain: `src/lib/mood.ts` (shared with outreach ladder helpers).
- Stored on `Chat`: `mood`, `moodScore`, `moodUpdatedAt`.
- Injected into the system prompt each turn; proactive gated by `canBeProactiveForMood`.
- UI: emoji beside persona name in header; idle indicator on hub rows.
- Independent of user-level outreach mood (`User.consecutiveIgnored`).

## Tokenization & lookup

- Shared contract: `src/lib/tokenization.ts` (`validateTokens`, schemas, JP-only prompt fragment).
- Render: `RichText.tsx` → `WordToken` (model tokens) or `LookupToken` (fallback).
- Shared popup: `TokenPopup.tsx`; vocab once via `SavedWordsContext`.
- Range select: `src/lib/token-selection.ts` + ‹ › handles (skip `[data-token-selection-ui]` when hit-testing).
- Enrichment: `src/lib/dictionary-enrich.ts` + `POST /api/dictionary/enrich` on persist.
- Lookup cache: `src/lib/lookup-cache.ts`.

## Memory

- Suggestions: `{ content, category, importance }` via `memory-normalize.ts`.
- Upsert/dedup: `memory-upsert.ts`; bulk: `POST /api/memory/bulk`.
- Soft replace: `Memory.supersededById`; injection touches `lastUsedAt`.
- Long chats: `Chat.summary` / `summaryUpToId` via `POST /api/groups/[id]/summary` (~40+ turns).
- In-chat: name/avatar → `PersonaProfileDrawer`. Full diary: ⋯ → Open full diary (`/memory?persona=`).

## Quests / scenarios

- Hub **AI** tab: `QuestLauncher` (may create/reuse Kai thread).
- In-chat: ⋯ → **Start a quest** → modal with `existingGroupId` (attaches to current thread).
- State: `src/lib/quests.ts` + quest strip in `GroupChatClient`.

## Replies

- Swipe / affordance reply; `Message.replyTo*` + `src/lib/reply-preview.ts` / `message-serialize.ts`.

## Migrations

```
prisma/migrations/20260922100000_chat_mood_memory_summary/
prisma/migrations/20260922120000_message_reply_to/
```

Apply with `npx prisma migrate deploy` (or equivalent) before relying on new columns.

## Deferred (do not assume done)

- `streamGenerateContent` + incremental JSON parse
- Message-list virtualization
- Reply-jump when quoted message is outside the loaded page
