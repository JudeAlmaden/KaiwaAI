import type { FuriganaMode } from "./types";

/** Minimal card shape needed to resolve furigana visibility. */
export type FuriganaCard = {
  status?: "new" | "learning" | "known";
  _pool?: "active" | "maintenance";
};

/**
 * Resolve whether furigana (ruby readings) should render on a flashcard.
 *
 * `FuriganaMode` comes from Learning settings (`defaultFuriganaMode`) and is the
 * single source of truth for every review surface (`/review` quests, custom
 * sessions, and the Focus Guard interceptor):
 *
 * - "always"        → show everywhere, including maintenance-pool cards
 *                     (supersedes the legacy per-pool suppression from v1.7.0)
 * - "never"         → hide everywhere (clean kanji, maximum recall challenge)
 * - "learning_only" → show while the card is still being learned; hide once
 *                     known, and on maintenance (retention) pool cards
 */
export function resolveShowFurigana(mode: FuriganaMode, card: FuriganaCard): boolean {
  if (mode === "never") return false;
  if (mode === "always") return true;
  // learning_only ("Smart"): hide on known cards and maintenance pool cards.
  return card.status !== "known" && card._pool !== "maintenance";
}
