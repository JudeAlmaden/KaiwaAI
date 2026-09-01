# KaiwaAI — Design Philosophy

## 1. North Star
KaiwaAI is a friend, not a tool. The whole product is framed around **Kai**, a personal AI companion you chat with in Japanese. Every design decision should make the app feel warm, encouraging, and personal, like talking to a friend who happens to be great at Japanese, never like a corporate learning platform.

We take inspiration from Duolingo's friendliness (playful, character-led, never intimidating) but push it to feel more personal and one-on-one. Duolingo is a fun classroom. KaiwaAI is your one friend, Kai.

---

## 2. Core Design Principles

1. **Show, don't tell.** Don't describe the product — demonstrate it. Avoid generic "feature card grid" layouts; every section should earn its place with a real idea.
2. **Lead with the character.** Kai (our mascot) shows up to greet, encourage, and react. The relationship is the product.
3. **Warm, never clinical.** Cream backgrounds (`#FFF9F5`), soft plum text (`#3A3247`, never pure black), rounded everything (`rounded-3xl`, `rounded-2xl`). No sharp corners, no cold greys.
4. **Playful and tactile.** Chunky "pushable" buttons with a 3D lip (`indigo-deep`: `#5B3FD6`) that sink when pressed. Cards lift on hover (`hover:-translate-y-1 transition-all`). Things feel good to touch.
5. **Atmosphere over decoration.** Subtle motion and depth — drifting sakura petals, an oversized ghost kanji bleeding behind the content, a flashcard that flies in — create a sense of place without clutter. Respect `prefers-reduced-motion`.
6. **Encouraging copy with a point of view.** We speak like a friend with opinions, not a marketing team: *"Stop studying. Start talking."*, *"Kai missed you"*, *"またね — see you tomorrow, right?"*. Never *"Submit"*, *"Error"*, or generic filler.
7. **Celebrate progress.** Streaks, XP, and small wins get warm, colorful moments, gently, without guilt-trip energy.

---

## 3. Color Palette & Token Reference

| Token | Hex | Use |
| :--- | :--- | :--- |
| **background** | `#FFF9F5` | Warm cream base |
| **foreground** | `#3A3247` | Soft dark plum text (never pure black) |
| **muted** | `#8B8499` | Secondary text |
| **indigo-ai** | `#7C5CFF` | Kai's signature violet, primary actions |
| **indigo-deep** | `#5B3FD6` | 3D button "lip" / pressed states |
| **sakura** | `#FF6B9D` | Pink — cheeks, accents, gentle errors |
| **mint** | `#2EC4A6` | Success / correct answers |
| **amber** | `#FFB23E` | Streaks / XP / highlights |
| **sky** | `#46B3FF` | Info |

---

## 4. Mobile Responsiveness Standards

- **Mobile First Spacing**: `mx-auto flex w-full max-w-2xl flex-col gap-5 px-4 py-5 sm:px-8`.
- **Chunky Touch Targets**: Minimum `44px x 44px` hit areas for buttons, switches, and list cards.
- **Header Alignment**: Standard `PageHeader` with title, Japanese subtitle (`jp`), and descriptive subtitle.
- **Sticky Mobile Action Bar**: Fixed bottom bar on small devices (`sm:hidden fixed bottom-0 left-0 right-0 p-4 bg-card/95 backdrop-blur-md border-t-2 border-border shadow-lg z-40`).
