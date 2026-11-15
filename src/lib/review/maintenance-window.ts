/**
 * Review sessions are composed from two pools: active (new / weak cards) and
 * maintenance (previously reviewed cards). The route fetches one window of
 * candidates ordered weakest-first, which means a deck with more new cards than
 * the window holds returns *only* new cards — maintenance is never composed and
 * the session looks like "new cards only", regardless of the 50/50 setting.
 *
 * These helpers detect that starvation and merge in a separate reviewed pool.
 */

import { activeTargetFor } from "../session-composer";

/** How many maintenance cards a session of this size is aiming for. */
export function maintenanceTargetFor(sessionSize: number, learningRatio: number): number {
  return Math.max(0, sessionSize - activeTargetFor(sessionSize, learningRatio));
}

/**
 * True when the fetched window cannot satisfy the maintenance half, so the
 * caller should fetch reviewed cards separately.
 */
export function needsMaintenanceTopUp(
  cards: { repetitions: number }[],
  sessionSize: number,
  learningRatio: number
): boolean {
  const target = maintenanceTargetFor(sessionSize, learningRatio);
  if (target === 0) return false;
  const reviewed = cards.filter((card) => card.repetitions > 0).length;
  return reviewed < target;
}

/** Merge two candidate lists without duplicating a card (window may overlap). */
export function mergeUniqueById<T extends { id: string }>(base: T[], extra: T[]): T[] {
  const seen = new Set(base.map((card) => card.id));
  const merged = [...base];
  for (const card of extra) {
    if (seen.has(card.id)) continue;
    seen.add(card.id);
    merged.push(card);
  }
  return merged;
}
