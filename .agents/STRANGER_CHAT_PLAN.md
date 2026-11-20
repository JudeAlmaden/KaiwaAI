# Stranger Chat — Plan (`/chat/strangers`)

Random 1:1 chat with another KaiwaAI learner, launched from the Chat hub.
Ephemeral by design: nothing here appears in the normal conversation list, and
everything expires on its own.

Status: Phase 0 + Phase 1 implemented behind `STRANGER_CHAT_ENABLED`.
Phase 1 ships with a DB-backed cap on new rooms (6 per user / 10 min) and focused
service tests for matchmaking, expiry and leave.
Phase 2 (images/gallery) and Phase 3 (reports/moderation UI) are planned below
but **not** implemented; the UI they need is specified in §6.1, and §6.2 pins that
UI to the app's shipped visual language (Phase 1.5).

---

## 1. Product shape

| Decision | Choice | Why |
| --- | --- | --- |
| Model | 1:1 random pairing, text first | Lowest-risk MVP; rooms are cheap to expire |
| Identity | Per-session alias ("quiet tanuki") | No names, emails or avatars leak between strangers |
| Lifetime | 30 min idle, 2 h hard cap | Long enough to talk, short enough to forget |
| Transport | 2 s polling | Matches the existing 3 s group-chat polling; no JWT/RLS work |
| Real-time | Deferred | Supabase Realtime needs Supabase-compatible JWTs + RLS; this app uses opaque cookie sessions |
| Cleanup | Lazy, on-read | No Vercel cron, no extra infra, idempotent deletes |
| Storage | Not needed in Phase 1 | Text only; Phase 2 adds a private bucket |

Nothing is written to `Chat` / `ChatMember` / `Message`. Those rows require an
owner, invite state, hide flags, mood/summary and feed the persistent
conversation list — all wrong for a room that should vanish.

---

## 2. Data model

Seven tables, all `onDelete: Cascade` from `User` / `StrangerSession`.

### `StrangerQueueEntry`
One row per waiting user (`userId @unique`), so re-joining refreshes instead of
stacking.

- `alias`, `createdAt` (waiting since), `lastSeenAt`, `expiresAt` (+2 min)

### `StrangerSession`
- `status` (`active` | `ended`), `endReason`, `createdAt`, `endedAt`
- `expiresAt` (idle deadline, extended by messages up to the hard cap)
- `lastMessageAt`

### `StrangerParticipant`
- `sessionId`, `userId`, `alias`, `joinedAt`, `lastSeenAt`, `lastReadAt`
- `leftAt`, `leftReason` (`skip` | `leave`)
- `@@unique([sessionId, userId])`
- **Partial unique index** `stranger_participant_one_active` on `(userId)`
  `WHERE "leftAt" IS NULL` — the database guarantee that one account is never in
  two live rooms, even under a double-tap or two devices.
  Prisma cannot express partial indexes, so it lives in the migration SQL. If
  someone later runs `prisma migrate dev`, it will report drift; keep the index.

### `StrangerMessage`
- `sessionId`, `participantId`, `senderUserId`, `body`, `createdAt`
- `@@index([sessionId, createdAt])`, `@@index([senderUserId, createdAt])`

### `StrangerBlock` / `StrangerReport`
Foundation for safety. `StrangerBlock` is already honoured by matchmaking
(pairings never cross a block in either direction). The block/report **UI** is
Phase 3; `StrangerReport` rows are written by the Phase 3 endpoint.

---

## 3. Matchmaking

`POST /api/stranger/queue`

1. Bail out if the caller already has an active room → return that room.
2. Check the new-room cap (§3.1). Over the cap → delete any parked queue row and
   return `{ status: "limited", retryAt }`; the lobby shows the wait instead of a
   search that cannot succeed.
3. Upsert the caller's queue entry (alias generated only on create).
4. Look for candidates: oldest first, not expired, not me, not blocked either way,
   not already in an active room.
5. Claim atomically inside one transaction:
   `deleteMany({ id })` → `count === 1` proves this caller won the row; then
   create the session + both participants; then delete the caller's entry.
   A losing caller's delete returns `count === 0` and it moves to the next
   candidate. A partial-index violation (candidate raced into another room) is
   logged and skipped.
6. Return `{ status: "matched", sessionId }` or `{ status: "waiting", ... }`.

### 3.1 New-room cap (DB-backed)

The in-memory limiter in `rate-limiter.ts` is per process, so on Vercel every
instance would grant its own allowance. The cap counts rows instead:

```ts
// src/lib/stranger/service.ts
const recent = await prisma.strangerParticipant.findMany({
  where: { userId, joinedAt: { gte: new Date(now - STRANGER_ROOM_WINDOW_MS) } },
  orderBy: { joinedAt: "desc" },
  take: STRANGER_ROOM_BURST,          // 6
  select: { joinedAt: true },
});
if (recent.length < STRANGER_ROOM_BURST) allow();
else retryAt = recent.at(-1).joinedAt + STRANGER_ROOM_WINDOW_MS;   // 10 min
```

Why participant rows and not sessions: a room seats exactly one live participant
per user, so one read gives both the count and an exact `retryAt` — the moment
the oldest of those rooms leaves the window. `@@index([userId, leftAt])` plus the
`joinedAt` range keeps it a single cheap index scan.

The cap is checked on `POST /api/stranger/queue` **and** on the `GET` poll:
- over the cap, the caller's queue row is deleted, because leaving them parked
  would let the next waiter's `tryMatch` pair them anyway;
- the API answers `{ status: "limited", retryAt }`, which the lobby renders as a
  cooldown instead of an endless "Looking for someone…".

The 10-minute window equals `STRANGER_ENDED_RETENTION_MS`, so the rows the cap
counts are the rows the reaper keeps for that long regardless. A room that ran
for an hour and is reaped can drop out of the count early — that only makes the
cap more permissive, never stricter, which is the safe direction.

`GET /api/stranger/queue` doubles as the poll: it reports `matched` / `waiting` /
`idle` and, while waiting, retries the match so a caller whose partner arrived
after their last POST still gets paired.

`DELETE /api/stranger/queue` cancels waiting.

---

## 4. Cleanup without a cron

Three layers, no scheduler:

1. **TTL on read.** Queue status drops entries whose `expiresAt` has passed;
   session reads report `ended` when the room is expired or both sides left.
2. **Opportunistic reaper.** `maybeRunStrangerCleanup()` runs (fire-and-forget)
   at the top of the queue and session routes, throttled to once a minute per
   server instance via a module/global timestamp. It deletes expired queue rows,
   expired sessions (cascades participants + messages + reports) and ended
   sessions older than 10 minutes. Deletes are idempotent, so two instances
   racing is harmless — which is why no advisory lock is needed (and avoids
   leaking a session lock through the pgbouncer transaction pooler).
3. **Storage reconciliation (Phase 2).** Supabase Storage lifecycle can only
   expire non-current object versions, so image objects are deleted by the app
   when a session is reaped, plus a sweep of `StrangerImage` rows whose session
   is gone.

Optional later: Supabase `pg_cron` (runs inside Postgres, not Vercel) for a
nightly hard sweep. Not required for correctness.

---

## 5. API surface

| Method | Route | Purpose |
| --- | --- | --- |
| GET | `/api/stranger/queue` | Poll: `idle` / `waiting` / `matched` / `limited` (also retries match) |
| POST | `/api/stranger/queue` | Join queue, match if a partner is waiting |
| DELETE | `/api/stranger/queue` | Leave the queue |
| GET | `/api/stranger/online` | Waiting + in-room counts for the lobby |
| GET | `/api/stranger/sessions/[id]` | Room state + messages (`?after=<messageId>`) |
| POST | `/api/stranger/sessions/[id]/messages` | Send text (200 chars) |
| POST | `/api/stranger/sessions/[id]/leave` | Leave / skip (`{ reason }`) |

Phase 2 adds `POST .../images`, `GET .../media/[id]`, `POST .../report`.
Every route: `404` when the flag is off, `401` without a session, partner-scoped
queries only (never a client-supplied user id).

Rate limits are DB-backed counts (message burst 8 / 10 s, new rooms capped at 6
per user per 10 min — §3.1) because the existing in-memory limiter does not
survive multiple Vercel instances.

---

## 6. UI plan

### Screen map

```
/chat                      ChatHub — tabs: Chats · AI · Friends · Meet (flag only)
  ├─ Meet tab → card → [ queue modal ]    matching happens here (§6.3, planned)
  └─ /chat/strangers/[sessionId]          Room — messages, composer, skip/leave
```

§6.3 replaced the interim lobby page with a queue modal over the hub, removing
one navigation level. `/chat/strangers` now redirects to `/chat?tab=meet`; rooms
stay at `/chat/strangers/[sessionId]`.

The bottom tab bar is hidden inside the room (`isConversationRoute`), like
`/chat/c/`. The lobby keeps the bar and reserves
`pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]` on phones, per DESIGN.md.

### ChatHub "Meet" tab

- A single tall card, not a grid: 🌍 avatar, title **Meet a stranger**, copy
  "Anonymous, one-on-one, skippable." and an indigo pill **Start matching →**.
- The tab never matches on its own: in the current build it links to the lobby,
  and §6.3 replaces that hop with a queue modal that starts only after an explicit
  **Meet someone** tap. Either way the tab stays a static entry point.
- If `STRANGER_CHAT_ENABLED` is off, the tab is not rendered at all and
  `?tab=meet` falls back to Chats — the URL cannot open a dead surface.

### Lobby (`StrangerLobby.tsx`)

Three states, one card:

| State | Card | Actions |
| --- | --- | --- |
| `idle` | Intro + online count | **Meet someone** (primary), safety list |
| `searching` | Pulsing radar dot, elapsed `0:12`, "Looking for someone…" | **Cancel** |
| `error` | Warm error line ("Couldn't reach the queue. Try again.") | **Try again** |

- Online pill: `N waiting now` / `You're the only one here` — honest empty state.
- Safety card: stay anonymous · skip anytime · don't share personal info.
- First search posts once; polling is `GET` every 2 s while searching, and a
  `matched` response replaces the route with the room.
- `?search=1` auto-starts the search (used by **Next** in the room).
- Layout: `PageHeader` (title Meet / 出会い / compact), one column, `max-w-2xl`,
  `gap-4`, 44 px+ touch targets, no nested scroll regions.

### Room (`StrangerRoom.tsx`)

- **Header** — back chevron (leaves + returns to lobby), partner alias +
  `匿名 · anonymous` subtitle, **Next** (shuffle) button, leave via back.
  No profile tap targets: the alias is the only identity.
- **Stream** — day/time dividers reused conceptually, mine right
  (`bg-indigo-ai text-white`), theirs left (`bg-card border-2 border-border`),
  consecutive bubbles grouped, `max-w-[80%]`, timestamps on the group's last
  bubble. Auto-scroll only when already at the bottom.
- **Banners** — "They left the chat" / "This chat has ended" replaces the
  composer with a **Find someone new** button; messages stay readable.
- **Composer** — same shape as group chat: rounded-full bordered input, char
  counter after 80 %, ↑ send, safe-area bottom padding.
- **Next / skip** = `leave({ reason: "skip" })` then `/chat/strangers?search=1`,
  so skipping keeps you in the flow instead of dumping you on the hub.
- **Errors** — inline rose line above the composer; optimistic message is rolled
  back and the text restored on failure.

### Copy

Warm, never clinical, per DESIGN.md: "Say hi — you're both anonymous.",
"Looking for someone…", "They slipped away.", "Find someone new".
No "Submit", no "Error".

### Accessibility / mobile

- `aria-label` on icon-only buttons, `role="status"` for the waiting state.
- Polling pauses when `document.hidden` is true.
- No horizontal scroll: long words break inside bubbles (`break-words`).

### 6.1 Room UI — next pass (planned, **not built**)

Phase 1's room is deliberately the smallest thing that works: a header, a stream,
a composer. The next pass keeps that skeleton and adds the three things a
stranger room needs to feel alive — presence, a clock, and the gallery — without
turning it into the normal chat client.

#### Lobby, refined

```
┌──────────────────────────────────────┐
│  Meet · 出会い                       │
├──────────────────────────────────────┤
│           ( ◜ ◝ )  radar             │
│         Meet a stranger              │
│   One-on-one, text only. 2 people    │
│   around now                         │
│                                      │
│         [ Meet someone → ]           │
├──────────────────────────────────────┤
│  🎭 Alias only     ⏭ Skip anytime    │
│  🤫 No personal details              │
└──────────────────────────────────────┘
```

- The `limited` state replaces the primary button with a warm line and a
  countdown ("the door reopens in 4 min"), so a capped learner never watches a
  search the server will refuse.
- Searching keeps the radar dot pulsing, swaps the button for **Cancel**, and
  shows the elapsed clock under the alias.

#### Room, refined

```
┌────────────────────────────────────────┐
│ ←   brave koi                   Next › │
│     anonymous · here now               │
├────────────────────────────────────────┤
│                 Today                  │
│                    ┌─────────────────┐ │
│                    │ こんにちは！     │ │
│                    └─────────────────┘ │
│  ┌─────────────────┐                   │
│  │ hi! where are   │                   │
│  │ you learning?   │        18:31      │
│  └─────────────────┘                   │
│                    ┌─────────────────┐ │
│                    │ ▓▓ photo ▓▓     │ │
│                    └─────────────────┘ │
├────────────────────────────────────────┤
│ [📷] [ Say hi — both of you anonymous ]↑│
└────────────────────────────────────────┘
```

| Layer | Spec |
| --- | --- |
| Header | 56 px; back chevron = leave; alias 15 px bold; subtitle `anonymous · here now` or `anonymous · left 18:42`; **Next** text button with a 44 px tap target |
| Presence | partner `lastSeenAt` under 45 s → green dot + "here now"; older → "away"; `leftAt` set → "left the chat" and the composer is replaced |
| Stream | `flex-col gap-2 px-4`; mine right, `bg-indigo-ai text-white`; theirs left, `bg-card border-2 border-border`; `max-w-[78%] break-words`; consecutive bubbles grouped; timestamp on the group's last bubble only (exact radius/metrics in §6.2) |
| Dividers | day label (`Today` / `Yesterday` / `Nov 18`) centred between hairlines, 10 px uppercase tracking, `text-muted/60` |
| Gallery entry | a `Photos · 3` chip under the header, hidden until the first image, opens the sheet |
| Composer | rounded-full bordered field, char counter after 80 %, 44 px send, `pb-[env(safe-area-inset-bottom)]`, camera button left of the field (Phase 2) |
| Ended banner | replaces the composer: "They slipped away." + **Find someone new**; the transcript stays readable for the 10 min retention |

#### Gallery sheet (Phase 2)

```
┌────────────────────────────────────────┐
│  Photos · 3                       ✕    │
│  ┌────────┐ ┌────────┐ ┌────────┐      │
│  │  ▓▓▓   │ │  ▓▓▓   │ │  ▓▓▓   │      │
│  └────────┘ └────────┘ └────────┘      │
│  Only the two of you can see these,    │
│  and they vanish with the room.        │
└────────────────────────────────────────┘
```

- Bottom sheet, `max-h-[70vh]`, 3-up grid of 96 px thumbs, tap → full-screen
  viewer with swipe between images and no download button.
- Images are compressed client-side, capped at 3 per person per room, and
  rendered blurred until tapped (Phase 3 adds an opt-out for NSFW).
- Empty state: "No photos yet — you can both send one." with the camera button.

#### Component inventory (planned files)

| File | Responsibility |
| --- | --- |
| `strangers/StrangerRoomHeader.tsx` | Alias, presence line, Next, photos chip |
| `strangers/StrangerStream.tsx` | Day dividers, grouping, auto-scroll only when already at the bottom |
| `strangers/StrangerBubble.tsx` | Mine/theirs bubble, image variant, grouping flags |
| `strangers/StrangerComposer.tsx` | Input, counter, send, camera, inline error |
| `strangers/StrangerEndedBanner.tsx` | Partner-left / ended / capped CTA |
| `strangers/StrangerGallerySheet.tsx` | Gallery grid + viewer (Phase 2) |
| `strangers/useStrangerPoll.ts` | 2 s poll with `document.hidden` pause and cursor, shared by lobby and room |

#### Motion & feel

- Radar dot pulses while searching; the room cross-fades in on match (150 ms).
- New bubbles rise 4 px and fade in; no spring physics, no sound.
- The alias stays the only identity: no avatars, no profile tap targets, and no
  typing indicator (we do not track typing, and faking it would lie).

#### What stays out

- No read receipts, no "seen" ticks, no editing, no reactions.
- No history: the transcript dies with the room, and the lobby says so.

### 6.2 Design alignment — the stranger surfaces in the shipped visual language

Implemented (Phase 1.5). §6.1 fixes the structure; this section fixed
the *look* so nobody invents new colours, radii or metrics. The reference is the
current build — the Chat hub and Home screens as they ship today — not a new
visual direction. The Meet tab, lobby and room should look like they were always
part of the app, and they must not introduce a single new token.

#### Baseline measured from the shipped screens

| Thing | What the app actually does | Where |
| --- | --- | --- |
| Page | cream `#FFF9F5`, plum text `#3A3247`, two fixed radial washes (violet 10 % top-left, sakura 8 % top-right) | `globals.css` `:root` / `body` |
| Page header | `PageHeader` compact: title + Japanese subtitle, one 36 px round action (`h-9 w-9 rounded-full border-2 border-border`) | `ChatHub.tsx` |
| Tab row | pills `rounded-full px-4 py-1.5 text-sm font-bold`; active `bg-indigo-ai text-white shadow-sm`; idle `text-muted hover:bg-indigo-ai/10`; count badge `bg-sakura` pinned `-right-1 -top-1` | `ChatHub.tsx` |
| Column | `mx-auto max-w-2xl flex flex-col gap-4`, tab row `gap-2` | `ChatHub.tsx` |
| Row card | `rounded-2xl border-2 border-border bg-card px-4 py-3`, 44 px `rounded-full` avatar | `ConversationRow` |
| Bottom island | fixed `bottom-3 inset-x-4 max-w-sm`, `rounded-full border-2 border-border/80 bg-card/95 px-3 py-2 shadow-2xl backdrop-blur-xl`; 22 px duotone icons, 10 px labels, active `text-indigo-ai scale-105`; raised 52 px violet Talk button at `-top-4 ring-4 ring-bg` | `AppNav.tsx` |
| Chips | `rounded-full bg-amber/10 px-3 py-1 text-sm font-bold text-amber` (streak), `bg-indigo-ai/10 text-indigo-ai` (due) | `AppNav.tsx`, `KaiRoomClient.tsx` |
| Section divider | `h-px flex-1 bg-border` either side of a `text-xs font-bold uppercase tracking-wider text-muted/60` label | `ChatHub.tsx` (Quests) |
| Type | 13–15 px body, `font-bold` on anything tappable, `tabular-nums` for counters, `font-display` for titles and primary CTAs | throughout |

**Rules:** no new colour tokens, fonts or radius families. New surfaces use
`rounded-2xl` / `rounded-3xl`, `border-2 border-border`, `bg-card`, and the
existing violet / amber / mint / sakura accents only. Primary CTAs are `btn-pop`
violet (or `rounded-full bg-indigo-ai` when they sit inline), secondary actions
are `rounded-full border-2 border-border text-muted`.

#### Meet tab in the hub

The pill row grows to four items, and the tab opens a single card in the same
column as the conversation feed — not a full-bleed hero.

```
┌──────────────────────────────────────┐
│ Chat                          ( ✎ )  │  PageHeader compact
│ You have 1 unread conversation       │
├──────────────────────────────────────┤
│ (Chats)   AI   Friends   Meet        │  active pill = violet fill
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │ (🌍)  Meet a stranger            │ │  rounded-3xl, border-2
│ │       One-on-one, text only.     │ │
│ │       Both anonymous, skip any   │ │
│ │       time.                      │ │
│ │  [ text only ]   [ skip anytime ]│ │  muted chips
│ │  ┌────────────────────────────┐  │ │
│ │  │     Meet someone  →         │  │ │  violet, 48 px, full width
│ │  └────────────────────────────┘  │ │
│ └──────────────────────────────────┘ │
└──────────────────────────────────────┘
```

- Avatar disc: `h-12 w-12 rounded-full bg-indigo-ai/10 ring-2 ring-indigo-ai/20`
  with the 🌍 glyph, matching the 44–48 px avatar rhythm of `ConversationRow`.
- Chips reuse the Home chip shape at 11 px (`bg-muted/10 text-muted` and
  `bg-mint/10 text-mint`) — **no live counts here**; the card stays static so the
  hub does not gain a second poller.
- At 390 px the four pills measure ~262 px inside the 338 px column: they fit on
  one line with `gap-2`, no horizontal scroll and no `flex-1` (which would make
  them uneven, the bug the Settings tabs already hit).

#### Lobby, in the shipped tokens

Same shell as the hub — `PageHeader` compact, `px-4 py-4 sm:px-8 sm:py-5`,
`mx-auto max-w-2xl flex flex-col gap-4` — with the bottom island still visible,
so the column keeps `pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))]`.

```
┌──────────────────────────────────────┐
│ Meet                                 │  PageHeader compact
│ 出会い · Talk to a random learner    │
├──────────────────────────────────────┤
│ ┌──────────────────────────────────┐ │
│ │          ( 🌍 )                  │ │  64 px disc, pulses when searching
│ │       Meet a stranger            │ │  font-display text-lg extrabold
│ │  One-on-one, text only. You're   │ │  text-sm text-muted, max-w-sm
│ │  both anonymous and either of    │ │
│ │  you can skip at any time.       │ │
│ │   [ 2 around now ]               │ │  mint chip (or "you're the only one")
│ │  ┌────────────────────────────┐  │ │
│ │  │      Meet someone          │  │ │  btn-pop violet, 48 px
│ │  └────────────────────────────┘  │ │
│ │  Couldn't reach the queue…       │ │  text-xs font-semibold text-sakura
│ └──────────────────────────────────┘ │
│ ┌──────────────────────────────────┐ │
│ │ Before you say hi                │ │  safety card, rounded-3xl border-2
│ │ 🎭 Alias only   ⏭ Skip anytime    │ │
│ │ 🤫 No personal details           │ │
│ └──────────────────────────────────┘ │
│        ╭────── island nav ──────╮    │
└──────────────────────────────────────┘
```

State deltas, all inside the same card (the card never changes size abruptly):

| State | Headline | Primary action | Extra |
| --- | --- | --- | --- |
| `idle` | Meet a stranger | **Meet someone** (`btn-pop`) | online chip |
| `searching` | Looking for someone… | **Cancel** (bordered pill) | pulsing disc, `tabular-nums` clock, alias line |
| `error` | Meet a stranger | **Try again** | rose line under the button |
| `limited` | Meet a stranger | disabled **Meet someone** | rose-free warm note: "the door reopens in about 4 min" |

#### Room, in the shipped tokens

Header replaces `PageHeader` (the room is a conversation, like `/chat/c/`):

- `sticky top-0 z-20 flex h-14 items-center gap-3 border-b-2 border-border bg-card/90 px-4 backdrop-blur-xl`
- back: `h-9 w-9 rounded-full border-2 border-border text-muted` (same control as
  the hub's pencil button) → leave and return to the lobby;
- alias `text-sm font-extrabold`, presence `text-[11px] font-semibold text-muted`
  with a `h-1.5 w-1.5 rounded-full bg-mint` dot when the partner is here;
- **Next** as `rounded-full border-2 border-border px-3 py-1.5 text-xs font-bold`
  (the same bordered-pill language as Cancel), 44 px tap area;
- bottom island is hidden by `isConversationRoute`; no page bottom nav padding.

Stream sits on the page gradient (no card around it), `px-4 py-4`, `gap-2`:

| Element | Classes |
| --- | --- |
| Day divider | `flex items-center gap-3` + two `h-px flex-1 bg-border` + `text-[10px] font-extrabold uppercase tracking-wider text-muted/60` — the Quests divider pattern |
| Their bubble | `max-w-[78%] rounded-2xl rounded-bl-md border-2 border-border bg-card px-3.5 py-2 text-sm` |
| My bubble | `max-w-[78%] rounded-2xl rounded-br-md bg-indigo-ai px-3.5 py-2 text-sm text-white shadow-sm shadow-indigo-ai/20` |
| Timestamp | `text-[10px] font-semibold text-muted/60` on the last bubble of a group |
| Their image | `rounded-2xl border-2 border-border overflow-hidden` with a `bg-indigo-ai/10` placeholder while loading |

Composer: `flex items-end gap-2 px-4 py-3 pb-[calc(env(safe-area-inset-bottom,0px)+0.75rem)]`,
field `flex-1 rounded-full border-2 border-border bg-card px-4 py-2 text-sm`
(the hub's search-field shape), camera `h-9 w-9 rounded-full border-2 border-border text-muted`,
send `h-9 w-9 rounded-full bg-indigo-ai text-white shadow-sm` with `disabled:opacity-40`.
Errors stay a `text-xs font-semibold text-sakura` line above it — never a toast.

Ended state: the composer is replaced by `rounded-2xl border-2 border-border bg-card px-4 py-3`
with `text-sm text-muted` copy and a violet `btn-pop` **Find someone new**, while
the transcript stays readable.

#### What this pass explicitly does not touch

- Home, the bottom island, the sidebar, the hub's conversation list.
- No new dependency, no icon set change (emoji stays inside discs; Phosphor is used
  only for chevrons/paperclip/camera if one is already imported).
- No dark-mode variant, no animation library — CSS transitions only.

#### Implementation order (each step shippable on its own)

1. `MeetPanel` card + fourth pill in `ChatHub.tsx`. No API change.
2. Lobby re-skin: heading, card, chips, the four state deltas, and the `limited`
   note already wired to `retryAt`.
3. Room header: back / alias / presence / Next, island hidden check.
4. Stream + composer tokens: bubbles, grouping, divider, composer, rose error.
5. Ended banner + **Find someone new**.
6. Split the room into the §6.1 component files once step 4 pushes it past ~400
   lines (not before — splitting early churns props for no benefit).
7. Phase 2 adds the photos chip and the gallery sheet in the same tokens.

Each step: `npm run typecheck`, `npm run lint`, `npm run test`, then the flag on
at 390 px and 1280 px, including the capped lobby state.

#### Open decisions for the owner

- **Meet entry:** fourth pill (planned, cheapest and consistent) vs a card inside
  Chats that survives the flag-off state as a teaser. The pill is the default.
- **Countdown in the room header:** the plan keeps only presence; a "27 min left"
  clock would need another derived value in the header. Recommended: skip it in
  Phase 1.5, revisit with the gallery.
- **Lobby as its own route** (planned, gives the room a back target and a deep
  link) vs matching in place inside the Meet panel. Route stays.
- **Empty-lobby tone:** honest ("you're the only one here right now") vs a warmer
  push toward inviting a friend. Honest stays, per §6.

### 6.3 Hub-native matching — a queue modal, not a lobby page

Implemented (Phase 1.6). The lobby was a full route with its own
`PageHeader`, a scrolling column and a bottom-nav reservation — all for one card
and one button. It costs a navigation level and a "where am I now?" beat before
anything happens. The Meet tab already lives in the hub, so the shortest honest
path is: **tab → Meet someone → queue modal → room**. The room stays a route
because a conversation needs the whole screen; only the *waiting* step becomes a
dialog.

#### Options considered

| Option | Flow | Cost | Verdict |
| --- | --- | --- | --- |
| **A. Modal over `/chat`** | tab → card → dialog appears already searching → room | one modal + one hook, lobby page retired | **recommended** |
| B. Inline searching state in the Meet card | card morphs into radar → room | no dialog, but the tab becomes a functional surface (our tabs are entry points) and the card jumps height | fallback if dialogs feel heavy |
| C. Keep the lobby route | current build | zero work | status quo; one extra step and lots of empty chrome |

#### Flow and states

1. Meet tab → card (visuals unchanged from §6.2) → **Meet someone**.
2. The modal opens straight into `searching` — no idle state inside it. One
   `POST /api/stranger/queue`, then `GET` every 2 s (paused while
   `document.hidden`). No API change.
3. `matched` → show "Found someone" for ~400 ms, close, and
   `router.push('/chat/strangers/<id>')`. No `DELETE` — the queue row was consumed
   by the match.
4. `limited` → stay open, amber note + minute countdown, single **Close**.
5. `error` → rose line + **Try again** (re-`POST`).
6. **Cancel**, Escape, or overlay tap → `DELETE /api/stranger/queue`, close, and
   return focus to the Meet card's CTA.

```
390 px, hub behind a dimmed backdrop
┌──────────────────────────────────┐
│ ▓▓▓ Chat pill row (dimmed) ▓▓▓   │
│ ┌──────────────────────────────┐ │
│ │          ( ◜ ◝ )             │ │  64 px disc + mint pulse
│ │    Looking for someone…      │ │  font-display text-lg
│ │   You're "quiet tanuki"      │ │  text-sm text-muted
│ │          0:12                │ │  tabular-nums
│ │    [     Cancel     ]        │ │  bordered pill, 44 px
│ └──────────────────────────────┘ │
└──────────────────────────────────┘
```

#### Modal spec

- Overlay `fixed inset-0 z-50 bg-foreground/30 backdrop-blur-sm`, tap = cancel.
- Panel `w-[min(92vw,26rem)] rounded-3xl border-2 border-border bg-card p-5
  text-center shadow-2xl` — a centred card on every breakpoint, not a bottom
  sheet (no gesture work, and there is no input, so no keyboard dance).
- Body scroll locks while open; the hub does not shift.
- Reuses the §6.2 disc/chips/tokens exactly; no new visual vocabulary, no copy
  rewrite (the card's copy stays as it renders today).

#### Files and wiring

| File | Change |
| --- | --- |
| `chat/strangers/StrangerQueueModal.tsx` (new) | Dialog shell + `searching` / `matched` / `limited` / `error` states |
| `chat/strangers/useStrangerQueue.ts` (new) | POST/GET/DELETE, 2 s poll, `document.hidden` pause, abort on unmount, one `startedRef` guard, `retry()` |
| `chat/ChatHub.tsx` | `queueOpen` state, render the modal, open it from `?queue=1` then `router.replace('/chat?tab=meet')` so a refresh doesn't reopen it |
| `chat/strangers/[sessionId]/StrangerRoom.tsx` | **Next** targets `/chat?tab=meet&queue=1` instead of `/chat/strangers?search=1` |
| `chat/strangers/page.tsx`, `StrangerLobby.tsx` | retire; optional one-release redirect `/chat/strangers` → `/chat?tab=meet` |

The Meet card, `/api/stranger/*` routes, caps, TTLs and reaper are untouched.

#### Behaviour that must not regress

- **No background matching.** The modal is the only place a queue row exists;
  closing cancels it, a hidden tab stops polling, and the 2 min TTL still reaps
  strays from crashes.
- **One live room per account** (partial unique index) and the 6/10 min cap keep
  working; a `limited` response is shown in the modal, not swallowed.
- **Flag off:** no tab, `?queue=1` ignored, API still 404.
- **Match while closing:** a late `matched` after cancel is ignored via the
  cancelled ref — the user isn't yanked into a room they backed out of.

#### Accessibility

- `role="dialog" aria-modal="true"`, labelled by the title, described by the
  alias line; focus moves to **Cancel** on open and returns to the card CTA on
  close; Tab cycles only the panel's controls; Escape = cancel.
- `role="status" aria-live="polite"` on the searching line and the match moment.
- `prefers-reduced-motion`: no pulse, a 120 ms fade at most.
- Android hardware back leaves `/chat` (no history entry pushed) — documented as a
  limitation of this phase rather than surprising back-stack behaviour.

#### Tests

- Pure transition helper (`nextQueueModalState(current, response)`) with unit
  tests: waiting→matched, waiting→limited, error→retry→waiting, cancelled ignores
  a late match. Server behaviour stays covered by `service.test.ts`.
- Manual at 390 px: cancel while waiting clears the row (`GET` returns `idle`);
  two accounts pair; **Next** from a room reopens the modal and pairs again; six
  rooms in ten minutes shows the capped card.

#### Implementation order

1. Hook + modal (`searching` / `limited` / `error`), opened from the Meet card;
   lobby page still present.
2. `?queue=1` handling in the hub and the room's **Next** retarget.
3. Delete the lobby page/component and its bottom-padding special case.
4. Optional redirect for stale links.

Each step: `npm run typecheck`, `npm run lint`, `npm run test`, then 390 px and
1280 px with the flag on.

#### Decisions taken

- The lobby page and `StrangerLobby.tsx` were retired; `/chat/strangers` is a
  thin redirect to `/chat?tab=meet` so pre-existing links still work.
- Overlay tap, Escape and **Cancel** all leave the queue, and every path sends
  `DELETE /api/stranger/queue` before closing.
- The Meet tab was the only entry at the time; the hub IA reset
  (`.agents/CHAT_HUB_UI_PLAN.md`, P2) moves it into the compose sheet as a tile.
  The queue dialog itself is unaffected.

---

## 7. Phases

- **Phase 0 — schema + flag.** Six/seven tables, partial unique index, flag,
  alias generator, cleanup helper. No UI.
- **Phase 1 — text chat.** Queue/matchmaking, lobby, room, polling, skip/leave,
  lazy cleanup. ✅ implemented.
- **Phase 1.5 — design alignment.** Re-skin the Meet entry, lobby and room in the
  shipped tokens (§6.2). No schema, API or dependency change. ✅ implemented.
- **Phase 1.6 — hub-native matching.** A queue modal over `/chat` replaced the
  lobby route (§6.3). No API, schema or dependency change. ✅ implemented.
- **Phase 2 — images + gallery.** Client canvas compression (reuse
  `src/lib/image-compress.ts`), private Supabase Storage bucket, signed reads,
  blur-by-default, mutual opt-in per session, gallery sheet limited to the
  current session, object deletion on reap.
- **Phase 3 — trust & safety.** Block/report UI, 18+ attestation, report triage,
  per-user matchmaking cooldowns and a shadow-ban flag.

---

## 8. Verification

- `npm run typecheck`, `npm run lint`, `npm run test`.
- Automated: `src/lib/stranger/service.test.ts` covers matchmaking (pairing,
  blocks, busy waiters, lost claims, existing room, cap), expiry (expired queue
  row, late partner, room deadline, 2 h clamp, message burst) and leave
  (both-sides end, idempotent stamp, non-participant 404).
  `src/lib/stranger/cleanup.test.ts` covers the reaper predicates and the 60 s
  per-instance throttle.
- `npx prisma generate` after schema changes; `npx prisma migrate deploy` on the
  target database before the routes run.
- Manual: two accounts, join both, confirm pairing, messages in both directions,
  skip ends one side and requeues the other, cancel while waiting, room expires
  after TTL, flag off returns 404 and hides the tab.

## 9. Risks

- **Room cap is per account, not per person.** Someone with several accounts can
  still open many rooms; Phase 3's attestation and shadow-ban are the real fix.
  The cap is a flood brake, not a moderation tool.
- **Polling cost.** 2 s per client per room; acceptable while rooms are rare.
  Revisit with Realtime once auth can mint Supabase-compatible JWTs.
- **Matchmaking races.** Covered by the delete-then-create transaction and the
  partial unique index; losers fall through to the next candidate.
- **Moderation.** Text-only and ephemeral limits blast radius, but Phase 3
  (report/block UI) should ship before the feature is publicised.
- **Prisma drift on the partial index.** Documented above; never "fix" it by
  dropping the index.
