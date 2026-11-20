# Chat — architecture reference

Durable notes for agents working on `/chat` and persona conversations. Prefer code over this doc when they disagree.

## Surface area

| Area | Entry |
|------|--------|
| Hub (phone) | `src/app/(app)/chat/ChatHub.tsx` |
| Desktop rail | `src/app/(app)/chat/ChatRail.tsx` — Chats header, pinned search, `RequestsRow`, `QueueRow`, `InboxList` |
| People sheet | `src/app/(app)/chat/PeopleSheet.tsx` — management only: requests, friends, add-by-email, persona editing |
| New chat sheet | `src/app/(app)/chat/NewChatSheet.tsx` — writing only: message a friend/persona, message request by email, group creation, quest |
| Shared inbox state | `src/app/(app)/chat/InboxProvider.tsx` (`useInbox`, `usePeople`, `useMatchQueue`) |
| Active thread | `src/app/(app)/groups/[id]/GroupChatClient.tsx` via `/chat/c/[id]` |
| Memory diary | `src/app/(app)/memory/MemoryClient.tsx` |
| BYOK Gemini | `src/lib/gemini.ts` |
| Server group replies | `src/lib/group-chat.ts` |
| Prompt context | `GET /api/chat/context?personaId=&chatId=` |

## People, friends and matching

- One surface: `/chat` holds conversations, friend requests, friends, personas and stranger matching. `/friends` redirects to `/chat?panel=people`.
- The column stays a list: pending requests are one `RequestsRow`, contacts live in `PeopleSheet`, and meeting a stranger is one `MeetRow`.
- The two sheets have disjoint jobs: **People** manages (requests, friends, add-by-email, persona CRUD) and never opens a chat; **New chat** writes (friends, personas, message requests by email, groups, quests). `/chat/personas` redirects into People.
- Message requests: `POST /api/groups { email }` creates a DM whose non-friend member is `pending`, surfacing through `/api/invites` with `kind: "dm"`.
- `usePeople` owns friends/incoming/outgoing/invites plus accept/decline/join/add, so requests are actionable where they appear.
- Matching is `useMatchQueue` + `QueueRow`, not a modal: the provider is mounted by `chat/(inbox)/layout.tsx`, so the queue survives moving between conversations and is cancelled when leaving `/chat`.
- Opening a friend posts `/api/groups { friendIds: [id] }`; the route reuses the existing DM for that pair.
- `/chat/strangers` redirects to `?compose=meet`; the sidebar no longer has a People group.

## Mood (per-conversation)

- Domain: `src/lib/mood.ts` (shared with outreach ladder helpers).
- Stored on `Chat`: `mood`, `moodScore`, `moodUpdatedAt`.
- Injected into the system prompt each turn; proactive gated by `canBeProactiveForMood`.
- UI: emoji beside persona name in header; idle indicator on hub rows.
- Independent of user-level outreach mood (`User.consecutiveIgnored`).

## Tokenization & lookup

- Shared contract: `src/lib/tokenization.ts` (`validateTokens`, schemas, JP-only prompt fragment).
- Render: `RichText.tsx` → `WordToken` (model tokens) or `LookupToken` (fallback).
- Shared popup: `TokenPopup.tsx`; saved vocabulary is a `savedWords` set passed into `RichText` (or fetched locally), refreshed across views by the `kaiwa:vocab-removed` window event.
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
