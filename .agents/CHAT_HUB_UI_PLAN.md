# Chat hub UI reset — plan (`/chat`)

Status: **P1–P5 implemented.** The tab-based hub (Chats · AI · Friends · Meet)
has been retired, and desktop is now a rail + pane split view.

Goal: make `/chat` read like a chat app — one inbox, one compose action — instead
of four tabs that each render a different screen under one header.

---

## 1. What is wrong today

The current hub is four products sharing a header:

| Symptom | Why it hurts |
| --- | --- |
| Four tabs (Chats · AI · Friends · Meet) for one inbox | The user has to remember which "mode" a person lives in; the list is one tap away from being useful. |
| The AI tab duplicates **New chat** | `NewChat.tsx` already starts a persona chat (`mode: "ai"`) and lists the same personas. The tab adds a persona *manager* and the quest launcher, not conversations. |
| The Friends tab is contact management | `FriendsPanel.tsx` is add-by-email, incoming/outgoing requests and group invites. Nothing there is a conversation, yet it occupies a quarter of the primary navigation. |
| Meet is a tab but matching is a modal | After §6.3 the tab only opens a dialog. A permanent tab for a one-shot action is heavy. |
| Two new-chat affordances | The header pencil opens `NewChat`, the raised island button opens `/chat`, and neither is the obvious "start something" control. |
| The list is empty for most accounts | One conversation under four tabs leaves a screen of dead space (see the screenshot this plan came from). |

Principle: **people and personas are contacts, not modes.** Anything that starts a
conversation is an action from the compose sheet; the hub itself is a list.

---

## 2. New information architecture

```
/chat                    one inbox (no tab row)
  FAB ↓                  compose sheet: Talk to AI · Message a friend · Start a group · Meet a stranger
/chat/c/[id]             conversation (unchanged)
/chat/strangers/[id]     stranger room (unchanged, full screen)
/friends                 friends & invites (FriendsPanel, moved out of the hub)
/chat/personas           persona manager (moved out of the hub)
```

- **Inbox**: pinned Kai row when there is no Kai thread, then conversations by
  recency. Human DMs, groups and persona chats sit in one list; identity is shown
  by the avatar (✨ badge on personas, 👥 on groups), not by a tab.
- **FAB** (bottom-right, mobile): the single "start something" control.
- **Compose sheet**: four intents, reusing what already exists.
- **Friends and personas are management screens**, reached from the compose sheet
  and the invites banner — not primary navigation.
- **Desktop entry points:** the FAB is mobile-only, so the sidebar carries a
  **People** group — **Friends** (`/friends`) and **Meet a stranger**
  (`/chat?queue=1`, which opens the queue dialog immediately). Phones use the
  compose sheet and the requests banner instead; the island nav has no free slot.

### 2.1 Mobile layout (390 px)

```
┌──────────────────────────────────┐
│ Chat 会話                  ( ✎ ) │  header unchanged
│ Talk to AI personas, friends     │  dynamic subtitle
├──────────────────────────────────┤
│ ⌕  Search conversations          │  shown when > 3 conversations
├──────────────────────────────────┤
│ ┌────────────────────────────┐   │
│ │ (Kai)  Kai ✨        1w    │   │  pinned only when no Kai thread
│ │        そうですね…          │   │
│ └────────────────────────────┘   │
│ CONVERSATIONS                    │  sticky, 10 px, tracking-wider
│ ┌────────────────────────────┐   │
│ │ (H)   Hana            3m • │   │
│ │       see you tomorrow     │   │
│ └────────────────────────────┘   │
│ ┌────────────────────────────┐   │
│ │ (👥)  Study group      2h  │   │
│ └────────────────────────────┘   │
│                                  │
│                       ╭────╮     │
│                       │ ✎  │     │  FAB 56 px, above the island
│                       ╰────╯     │
│      ╭──── island nav ────╮      │  unchanged
└──────────────────────────────────┘
```

- FAB: `fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom,0px))] h-14 w-14
  rounded-full bg-indigo-ai text-white shadow-xl shadow-indigo-ai/35 ring-4
  ring-bg`, `aria-label="New chat"`, 56 px hit area, hidden on `lg` where the
  header action is enough.
- The header pencil stays on desktop only; on phones the FAB replaces it (the two
  currently compete). If both stay, the FAB is the only one below `sm`.

### 2.2 Compose sheet

An upgrade of `NewChat.tsx` rather than a new component: four mode tiles, same
bodies underneath.

```
┌──────────────────────────────────┐
│ New chat                     ✕   │
│ ┌──────────┐ ┌──────────┐        │
│ │ 🤖 Talk   │ │ 👤 Message│       │  2×2 tiles, rounded-2xl border-2
│ │   to AI  │ │  a friend │       │  selected = border-indigo-ai bg-indigo-ai/10
│ └──────────┘ └──────────┘        │
│ ┌──────────┐ ┌──────────┐        │
│ │ 👥 Start  │ │ 🌍 Meet a │       │
│ │  a group │ │  stranger │       │
│ └──────────┘ └──────────┘        │
│                                  │
│  One-on-one, text only. Both     │  body of the selected tile
│  anonymous, skip any time.       │
│  [      Meet someone →      ]    │  violet, opens the queue modal
└──────────────────────────────────┘
```

Bodies:

| Tile | Body | Reuses |
| --- | --- | --- |
| Talk to AI | Persona rows (tap = open chat), **Manage personas →** (`/chat/personas`), **Roleplay quest →** (quest launcher) | `NewChat` ai mode, `PersonaManager`, `QuestLauncher` |
| Message a friend | Accepted friends with a search field, **Add a friend** (email) | `NewChat` dm mode + `api/friends` |
| Start a group | Name, friend chips (max 4), optional persona, **Create group** | `NewChat` group mode |
| Meet a stranger | Copy + **Meet someone** → closes the sheet, opens `StrangerQueueModal` | §6.3 dialog |

Sheet chrome: mobile bottom sheet `rounded-t-3xl border-2 border-border bg-card`,
drag handle optional, `pb-[calc(1rem+env(safe-area-inset-bottom))]`; centred card
`max-w-md` from `sm` up. Focus moves to the first tile, Escape/backdrop closes,
body scroll locked (same rules as the queue dialog).

### 2.3 Inbox details

- **Search** always visible once there are more than three conversations (today
  it appears at four and looks like an accident).
- **Rows** keep the current anatomy: 48 px avatar, name, mood emoji, one-line
  preview, relative time, unread dot, group badge, hover lift, 3-dot hide menu.
- **Sections**: pinned Kai row (only when no Kai thread), then `CONVERSATIONS`
  ordered by `lastAt`. Sticky labels use the app's uppercase 10 px pattern.
- **Empty state**: the Kai hero card plus three suggestion chips — *Talk to Kai*,
  *Roleplay a quest*, *Meet a stranger*. No "you have no conversations" dead end.
- **Invites banner**: when `pending > 0`, a single row above the list —
  "2 requests waiting →" — linking to `/friends`. It replaces the Friends tab and
  its sakura badge.
- **Unread**: the sakura dot and bold name stay; the island's Talk-to-Kai pulse is
  unchanged.

### 2.4 Desktop split view — Messenger-style, one page (phase 5)

The reference is Messenger on the web: a fixed left rail that holds search and
every way to start or find a conversation, and a right pane for whatever is
selected. Friends and stranger matching live **inside the rail**, so the whole
feature set is one URL rather than three.

```
┌────────────────┬─────────────────────────────────────┐
│ Chat  ✎        │                                     │
│ ⌕ Search       │            💬                       │
│ [Chats][Friends│        No chat selected             │
│  [Meet]        │   Pick a conversation, or start     │
│ ───────────────│   one with ✎                        │
│ Kai         1w │                                     │
│ Hana        3m │                                     │
│ Study group 2h │                                     │
└────────────────┴─────────────────────────────────────┘
```

Rail sections (segmented chips, not route tabs):

| Section | Rail content | Right pane |
| --- | --- | --- |
| **Chats** | search + conversation rows (same anatomy as today) | the open conversation, or the empty state |
| **Friends** | compact friends list, requests and group invites, **Manage friends** → `/friends` | unchanged (the open chat stays put) |
| **Meet** | the meeting card: online count, **Meet someone** (opens the queue dialog) | unchanged |

The right pane is the existing conversation page; selecting another row swaps
only the pane. On a phone the split is never used — the mobile flow stays exactly
as built (list → conversation, FAB → compose sheet, header People icon).

#### How it has to be built

1. **Route group** so the rail wraps the inbox but not the stranger room:
   ```
   app/(app)/chat/(inbox)/layout.tsx     ← rail + <children/>
   app/(app)/chat/(inbox)/page.tsx       ← /chat (empty state on desktop)
   app/(app)/chat/(inbox)/c/[id]/page.tsx← /chat/c/[id] (pane on desktop)
   app/(app)/chat/strangers/[sessionId]/… ← untouched, full screen
   ```
   Parentheses keep every URL identical.
2. **Extract the list** from `ChatHub.tsx` into `chat/InboxList.tsx` plus a
   `useInbox()` hook (built: `chat/useInbox.ts`), so the rail (desktop) and the
   mobile page render the same component and share the same fetch/cache rules.
3. **Rail-only sections** (`RailFriendsSection`, `RailMeetSection`) summarise
   friends/requests and matching in a 360 px column and hand off to `/friends`
   and the existing queue dialog; no new endpoints. The full `FriendsPanel` is
   too wide for the rail, so it stays on `/friends`.
4. **Active row** highlight from `usePathname()` against `/chat/c/[id]`.
5. **Mobile**: the layout renders `children` only (`lg:hidden` rail), so nothing
   about the phone build changes.

#### Risks

- Two mounted surfaces on desktop (rail + page) each call `useInbox`, so
  `/api/groups` goes out twice on a cold desktop load. Both paint from the
  existing `chat-cache` first, so it is invisible, but a shared store would
  remove the duplicate request.
- Conversation pages currently assume the full viewport; inside the pane they
  need `h-full min-h-0` rather than `h-dvh` (check `GroupChatClient`'s wrapper).
- The move into `(inbox)/` is a path change on disk only; run the
  `nav.test.ts`/route checks afterwards.
- `FriendsPanel` in a 360 px rail drops its two-column bits; the full page stays
  for phones and for "Manage friends".

---

## 3. What happens to each current surface

| Today | Becomes | Notes |
| --- | --- | --- |
| Chats tab | The inbox itself | No tab row at all. |
| AI tab | Compose → **Talk to AI**, plus `/chat/personas` and the quest entry | `PersonaManager` and `QuestLauncher` are still reachable, just not primary nav. |
| Friends tab | `/friends` page + invites banner | `FriendsPanel.tsx` moves unchanged into its own route. |
| Meet tab | Compose → **Meet a stranger** | Queue modal (§6.3) unchanged. |
| Header pencil | Mobile: FAB. Desktop: stays | One control per breakpoint. |
| `?tab=ai` / `?tab=friends` | Redirect to `/chat` (`ai` may open compose on `ai`) | Only one internal link uses it (`GroupChatClient` line 864). |
| `?tab=meet&queue=1` | Maps to `?compose=meet` + queue modal | Stranger room's **Next** and redirect update. |
| Bottom island | Unchanged | Home / Review / Talk / Study / You. |

---

## 4. Phases

Each phase is shippable on its own, with `npm run typecheck`, `npm run lint` and
`npm run test` at the end, and a 390 px + 1280 px look with the stranger flag on.

### P1 — FAB + compose sheet ✅
- Extract the sheet chrome from `NewChat` (`ComposeSheet.tsx`) and add the fourth
  tile, `Meet`.
- Add the FAB in `ChatHub`; keep the tabs for now.
- Meet tile closes the sheet and opens `StrangerQueueModal`.
- Deletes nothing yet.

### P2 — remove AI and Meet tabs ✅
- Delete `tab === "ai"` and `tab === "meet"` bodies from `ChatHub`.
- Add `/chat/personas` hosting `PersonaManager`; add **Roleplay quest** to the AI
  body (reuse `QuestLauncher` in a sheet).
- `?tab=ai` → `/chat?compose=ai`, `?tab=meet` → `/chat?compose=meet` (one
  release of compatibility), then drop the params.
- Fix `GroupChatClient`'s link to the hub.

### P3 — remove the Friends tab ✅
- Move `FriendsPanel` to `/friends` (same component, its own page header).
- Add the invites banner to the inbox.
- `/chat?tab=friends` → `/friends`.
- Compose **Message a friend** keeps the inline list; **Add a friend** links to
  `/friends`.

### P4 — inbox polish ✅
- Always-on search when `> 3`, section labels, suggestion chips in the empty
  state, row hover/active states, loading skeletons for the first paint.
- Optional: sort pinned Kai by recency once a Kai thread exists (already true).

### P5 — desktop split view ✅

The layout the owner asked for after comparing with Messenger.

- **P5a — shell ✅** `chat/(inbox)/layout.tsx` wraps `page.tsx` and
  `c/[id]/page.tsx` in `flex` (rail fixed at 360 px, pane `min-w-0 flex-1`).
  `/chat` renders the "No chat selected" pane on desktop and the untouched inbox
  on phones; `/chat/strangers/[id]` stays outside the group and full screen.
- **P5b — the rail ✅** `ChatRail.tsx` holds the header (People + compose), the
  section chips, search and the conversation list. The list itself moved out of
  `ChatHub` into `InboxList.tsx`, and its data/loading into `useInbox.ts`; the
  open row is highlighted from `usePathname()`. The phone hub renders the same
  `InboxList` and keeps its PageHeader, FAB and compose sheet.
- **P5c — Friends and Meet in the rail ✅** `RailFriendsSection.tsx` shows the
  waiting count, the accepted friends and **Manage friends**, and
  `RailMeetSection.tsx` shows the online chip with **Meet someone** opening the
  queue dialog. The `STRANGER_CHAT_ENABLED` flag still gates the Meet chip.

Checks: `npm run typecheck`, `npm run lint`, `npm run test`. Visual pass
(1280 px rail + empty pane, rail + open chat, 390 px regression) is the owner's.

---

## 5. Risks and mitigations

| Risk | Mitigation |
| --- | --- |
| Personas become hard to find once the AI tab is gone | Compose opens with **Talk to AI** selected by default; Kai stays a pinned row; the AI body lists every persona. |
| Quests lose their hub entry | Explicit **Roleplay quest** row in the AI body, plus the existing entry inside group chats. |
| Friend requests go unnoticed | Invites banner above the list whenever `pending > 0`, with the sakura count. |
| Old links (`?tab=ai`, `?tab=friends`, `/chat/strangers`) break | One release of redirects: `?tab=` normalised, `/chat/strangers` already redirects. |
| Two compose surfaces during migration (pencil + FAB + tab bodies) | P1 ships the FAB and leaves the pencil only on `lg`; P2 deletes the redundant bodies so nothing is duplicated for long. |
| The 4-tile sheet feels like the old tabs again | Tiles select a body inside one sheet; there is no URL state and no navigation — the difference is that nothing is reachable only through them. |

---

## 6. Open decisions

- **Friends as `/friends` route** (recommended — `FriendsPanel` is a full page of
  management UI) vs a sheet from the compose flow. The route is deep-linkable and
  keeps the component unchanged.
- **Meet as a fourth tile** (recommended) vs a separate violet row under the
  tiles; a tile keeps the 2×2 grid even and makes matching feel first-class.
- **Personas at `/chat/personas`** (recommended) vs folding the manager into the
  compose sheet vs Settings → AI. A route is the only option that doesn't make
  the sheet enormous.
- **Drop the header pencil on phones** (recommended) vs keeping both pencil and
  FAB.
- **Desktop split view**: built as P5.

---

## 7. Out of scope

- No API, schema, or dependency changes.
- No change to conversation screens, the stranger room, review, or Home.
- No new visual tokens: the sheet, FAB, banner and section labels all use the
  palette and radii already in `globals.css`.
