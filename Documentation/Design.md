# KaiwaAI — Design Philosophy

## North star

KaiwaAI is **a friend, not a tool**. The whole product is framed around **Kai**,
a personal AI companion you chat with in Japanese. Every design decision should
make the app feel warm, encouraging, and personal, like talking to a friend who
happens to be great at Japanese, never like a corporate learning platform.

We take inspiration from Duolingo's friendliness (playful, character-led, never
intimidating) but push it to feel **more personal and one-on-one**. Duolingo is
a fun classroom. KaiwaAI is your one friend, Kai.

## Principles

1. **Show, don't tell.** Don't describe the product — *demonstrate* it. The
   landing page leads with a live, self-playing conversation where Kai actually
   types in Japanese, words are genuinely tappable, and one saves itself as a
   flashcard in front of you. The visitor understands the whole value prop in
   five seconds because they watch it happen. Avoid generic "feature card grid"
   layouts; every section should earn its place with a real idea.
2. **Lead with the character.** Kai (our mascot) shows up to greet, encourage,
   and react. The relationship is the product.
3. **Warm, never clinical.** Cream backgrounds, soft plum text (never pure
   black), rounded everything. No sharp corners, no cold greys.
4. **Playful and tactile.** Chunky "pushable" buttons with a 3D lip that sink
   when pressed. Cards lift on hover. Things feel good to touch.
5. **Atmosphere over decoration.** Subtle motion and depth — drifting sakura
   petals, an oversized ghost kanji bleeding behind the content, a flashcard
   that flies in — create a sense of place without clutter. Respect
   `prefers-reduced-motion`.
6. **Encouraging copy with a point of view.** We speak like a friend with
   opinions, not a marketing team: "Stop studying. Start talking.", "Kai missed
   you", "またね — see you tomorrow, right?". Never "Submit", "Error", or
   generic filler like "the free, fun way to learn".
7. **Celebrate progress.** Streaks, XP, and small wins get warm, colorful
   moments, gently, without the guilt-trip energy.

## Landing page (the reference implementation)

The home page is the canonical expression of the design philosophy. Its key
moves, worth preserving in any redesign:

- **Asymmetric split hero** — bold opinionated copy on the left, the live
  interactive chat demo (`HeroDemo.tsx`) on the right. Not a centered template.
- **The demo IS the pitch** — Kai types two N5 messages with a typing
  indicator, then auto-taps a word to reveal its reading/romaji/meaning popover,
  then a flashcard flies in marked "✓ saved to flashcards". Words stay tappable
  by the visitor.
- **Oversized ghost typography** — a giant 話 kanji at ~4% opacity bleeding off
  the left edge as a structural design element.
- **Drifting sakura petals** (`Petals.tsx`) for ambient life.
- **A tight "why" strip** — three punchy stats (`N5 → ∞`, `1 tap`, `0 cram`)
  instead of verbose feature cards.
- **Headline device** — strike-through on the word we reject ("~~studying~~")
  next to the word we champion ("talking") to stake out a clear point of view.

## Mascot — Kai

Kai's **character** is a gentle classroom-sweetheart: a sweet, innocent anime
schoolgirl with soft violet hair (matching the brand violet), big expressive
eyes, a warm smile, and a little sakura hairpin. She's the patient friend who's
genuinely happy to study with you, never judgmental.

Her **logo mark** (`src/app/Kai.tsx`) is a deliberately minimal, abstract
stand-in used everywhere in the UI:

- A violet **half-circle head** (flat side down) with a vertical gradient and a
  soft glossy sheen across the top.
- A single curvy **ahoge** (the cherry-on-top stray hair strand) tapering to a
  point — Kai's most recognizable silhouette cue.
- A small **sakura hairpin** (5 pink petals + golden center) on the right.
- **No facial features** — it reads as a clean, scalable icon at any size and
  recolors via theme tokens.

The full anime illustration (`public/images/kai/kai-full.png`) exists as
character reference but is **not** used as a hero poster (it carries baked-in
text/decoration that fights the layout). Future: cropped face/expression sprites
(happy, thinking, celebrating) for the chat UI.

## Color palette

| Token | Hex | Use |
|---|---|---|
| `background` | `#FFF9F5` | warm cream base |
| `foreground` | `#3A3247` | soft dark plum text |
| `muted` | `#8B8499` | secondary text |
| `indigo-ai` | `#7C5CFF` | Kai's signature violet, primary actions |
| `indigo-deep` | `#5B3FD6` | 3D button "lip" / pressed states |
| `sakura` | `#FF6B9D` | pink — cheeks, accents, gentle errors |
| `mint` | `#2EC4A6` | success / correct answers |
| `amber` | `#FFB23E` | streaks / XP / highlights |
| `sky` | `#46B3FF` | info |

## Typography

- **Display / headings:** Baloo 2 — rounded, friendly, bold.
- **Body / UI:** Nunito — soft, highly readable, warm.
- **Japanese:** Noto Sans JP — clean and legible at large sizes.

## Components

### Landing-page components
- **Pushable buttons** (`btn-pop`, `PopButton` / `PopLink`): rounded, bold,
  uppercase display font, 4px bottom lip that compresses on `:active`. Sizes:
  `lg` (default), `md`, `sm`; variants: `primary`, `secondary`.
- **Kai logo mark** (`Kai.tsx`): the abstract half-circle + ahoge + sakura icon.
  Also the app favicon (`app/icon.svg`).
- **HeroDemo** (`HeroDemo.tsx`): the self-playing, interactive chat that doubles
  as the product pitch. Scripted in `demo-data.ts`.
- **Petals** (`Petals.tsx`): ambient drifting sakura, hidden under
  `prefers-reduced-motion`.

### Authenticated-app primitives (`app/(app)/ui.tsx`)
Shared so Chat, Review, Vocab, Memory, and Settings stay consistent:
- **`Chip`** — pill toggle for filters and session options (active = filled
  indigo; idle = bordered, hover indigo).
- **`StatusBadge`** + **`STATUS_STYLE`** — flashcard status pill: `new` (sky),
  `learning` (amber), `known` (mint). One source of truth for status colors.
- **`Toggle`** — the pill switch used for settings (auto-save, auto-switch).
- **`Surface`** — the standard card container (`rounded-3xl`, 2px border, padded).
- **`PageHeader`** (`app/(app)/PageHeader.tsx`) — consistent page title + Japanese
  caption + subtitle + optional action, with a bottom border.

### Shared conventions
- **Cards/surfaces:** 2px soft borders, `rounded-3xl`, hover-lift where tappable.
- **Inputs:** 2px borders, `rounded-2xl`, violet focus border.
- **App layout shell:** fixed-height (`h-dvh`), sidebar (desktop) / bottom tabs
  (mobile) stay pinned; only the content `<main>` scrolls (`min-h-0` flex trick).
  Chat pins its header + composer and scrolls only the message stream.
- **Empty states:** centered Kai mark + a friendly line + a primary action.
- **Audio:** `speak.ts` uses the browser's `speechSynthesis` (ja-JP) — free,
  offline; surfaced as a 🔊 button on review cards, vocab detail, and lookup.
- **Animations** (`globals.css`): `floatIn` (flashcard entrance), `petalFall`
  (sakura), `diary-paper` (Memory page lined-paper background).

## PWA

KaiwaAI is an installable PWA so it can live on the phone home screen (a
prerequisite for web push on iOS).

- **Manifest** (`app/manifest.ts` → `/manifest.webmanifest`): standalone display,
  `start_url: /chat`, theme `#7c5cff`, background `#fff9f5`.
- **Icons** (`public/icons/`): 192/512 regular + maskable, plus an Apple touch
  icon. Generated from `scripts/icon-source.svg` via `scripts/gen-icons.mjs`
  (sharp). Re-run that script if the mark changes.
- **Service worker** (`public/sw.js`, registered by `ServiceWorker.tsx`):
  network-first for navigations with an `/offline` fallback, cache-first for
  static assets, and **never caches `/api/`** (always live). Push handling will
  be added in a later phase.
- **Offline page** (`app/offline/page.tsx`): friendly Kai message; reassures the
  user their data is safe.

## Voice & tone

Friendly, casual, second-person, with an actual point of view. Sprinkle light
Japanese where it adds warmth (こんにちは, ようこそ, またね). Encourage, never
scold. Mistakes are okay; Kai is patient. Reject corporate filler — say
something specific and a little bold instead.

## Reference

Duolingo is the friendliness touchstone (character-led, playful, low-pressure),
but KaiwaAI deliberately diverges from the generic SaaS landing template. Where
a typical page *describes* features in a card grid, ours *performs* the product
through a live demo and stakes out an opinion ("Stop studying. Start talking.").
The feel is one intimate companion, not a gamified classroom.
