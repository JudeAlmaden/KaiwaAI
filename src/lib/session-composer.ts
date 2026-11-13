interface Card {
  id: string;
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReview: Date;
  createdAt: Date;
  lastReviewedAt?: Date | null;
  difficulty?: number | null;
  stability?: number | null;
  retrievability?: number | null;
}

interface SessionComposition<T extends Card> {
  session: T[];
  activeCards: T[];
  maintenanceCards: T[];
}

export interface ComposeSessionOptions {
  /** Daily ceiling on new cards (Learning settings / request param). */
  maxNewCards?: number;
  /** Fixed per-session intake of new cards (default: unlimited for backwards compatibility). */
  maxNewPerSession?: number;
}

/**
 * Composes a review session from active (focused learning) and maintenance
 * (retention) pools.
 *
 * Active slots: `learningRatio` share of the session. Filled by new cards (up to
 * the per-session intake quota AND the daily ceiling) and then by weak cards.
 *
 * Maintenance slots: the rest of the session. Reviewed cards only, rotated by
 * least-recently-reviewed so consecutive sessions don't replay the same cards.
 *
 * Composition rules:
 *   - New cards are rationed: never more than `maxNewCards`/`maxNewPerSession`,
 *     and never used to pad a session past the active target.
 *   - Reviews fill every remaining slot, so a short active pool means more
 *     maintenance (never more new cards).
 *   - If reviews run short the session is simply shorter; new cards never pad it.
 *   - Cards reviewed in the last 2 minutes are held back from maintenance, and
 *     cards reviewed in the last 10 minutes from active, so a second session
 *     started immediately after the first still gets review cards.
 */
export function composeSession<T extends Card>(
  allCards: T[],
  sessionSize: number = 5,
  ignoreDueDate: boolean = false,
  learningRatio: number = 0.5,
  options?: ComposeSessionOptions
): SessionComposition<T> {
  const now = new Date();
  const MAINTENANCE_COOLDOWN_MS = 2 * 60 * 1000;
  const maintenanceCooldownAgo = new Date(now.getTime() - MAINTENANCE_COOLDOWN_MS);
  // FSRS "Again" cards return after ~10 minutes; shorter would let the same card
  // appear twice in one sitting.
  const ACTIVE_COOLDOWN_MS = 10 * 60 * 1000;
  const activeCooldownAgo = new Date(now.getTime() - ACTIVE_COOLDOWN_MS);

  const safeSize = Math.max(0, Math.floor(sessionSize));
  const ratio = Math.max(
    0,
    Math.min(1.0, typeof learningRatio === "number" && !isNaN(learningRatio) ? learningRatio : 0.5)
  );

  // Target split: active gets round(size * ratio), at least one card when any new
  // cards are allowed; maintenance gets the rest.
  const activeTarget =
    ratio === 0 ? 0 : Math.min(safeSize, Math.max(1, Math.round(safeSize * ratio)));

  // New-card intake: the session quota and the daily ceiling both apply.
  const newQuota = Math.min(
    options?.maxNewCards ?? Number.POSITIVE_INFINITY,
    options?.maxNewPerSession ?? Number.POSITIVE_INFINITY
  );

  const activePool: T[] = [];
  const maintenancePool: T[] = [];
  let newCardsAdded = 0;

  for (const card of allCards) {
    const isNew = (card.repetitions ?? 0) === 0;
    const hasFsrs =
      card.difficulty != null &&
      card.stability != null &&
      !isNaN(card.difficulty) &&
      !isNaN(card.stability);
    const isWeakAndShort = hasFsrs
      ? card.difficulty! > 7 && card.stability! < 5
      : card.easeFactor < 2.2 && card.interval < 3;

    const canAddNew = isNew && newCardsAdded < newQuota;
    const isActive = (canAddNew || isWeakAndShort) && ratio > 0;
    const wasJustReviewed =
      card.lastReviewedAt != null && card.lastReviewedAt >= activeCooldownAgo;

    if (isActive && !wasJustReviewed) {
      activePool.push(card);
      if (isNew) newCardsAdded++;
    } else if (!isNew) {
      const isDue = ignoreDueDate || card.nextReview <= now;
      const wasRecentlyReviewed =
        card.lastReviewedAt != null && card.lastReviewedAt >= maintenanceCooldownAgo;
      if (isDue && !wasRecentlyReviewed) {
        maintenancePool.push(card);
      }
    }
  }

  // Least-recently-reviewed first: rotation, not luck.
  maintenancePool.sort((a, b) => {
    const at = a.lastReviewedAt ? a.lastReviewedAt.getTime() : 0;
    const bt = b.lastReviewedAt ? b.lastReviewedAt.getTime() : 0;
    return at - bt;
  });

  const selectedActive = activePool.slice(0, activeTarget);
  const activeIds = new Set(selectedActive.map((c) => c.id));
  const rotatedMaintenance = maintenancePool.filter((c) => !activeIds.has(c.id));

  const maintenanceTarget = safeSize - activeTarget;
  const selectedMaintenance = rotatedMaintenance.slice(0, maintenanceTarget);
  const maintenanceExtra = rotatedMaintenance.slice(selectedMaintenance.length);
  const activeExtra = activePool.slice(activeTarget);

  // Reviews fill the session; a short active pool donates its slots to reviews.
  const missing = safeSize - selectedActive.length - selectedMaintenance.length;
  if (missing > 0) {
    selectedMaintenance.push(...maintenanceExtra.slice(0, missing));
  }

  // Remaining gaps may only be filled by reviewed cards — never by extra new
  // cards beyond the intake quota.
  const stillMissing = safeSize - selectedActive.length - selectedMaintenance.length;
  if (stillMissing > 0) {
    const reviewedExtras = activeExtra.filter((c) => (c.repetitions ?? 0) > 0);
    selectedActive.push(...reviewedExtras.slice(0, stillMissing));
  }

  // Rotate selection, then shuffle within the chosen set for session order.
  shuffleArray(selectedMaintenance);

  const session = interleave(selectedActive, selectedMaintenance);

  return {
    session,
    activeCards: selectedActive,
    maintenanceCards: selectedMaintenance,
  };
}

/**
 * Spread the two lists across the session: each active card is followed by as
 * many maintenance cards as its share of the session allows, so the mix stays
 * even and the session always opens with an active card when there is one.
 */
function interleave<T>(active: T[], maintenance: T[]): T[] {
  const out: T[] = [];
  if (active.length === 0) return [...maintenance];
  if (maintenance.length === 0) return [...active];

  let placed = 0;
  for (let i = 0; i < active.length; i++) {
    out.push(active[i]);
    const upTo = Math.floor(((i + 1) * maintenance.length) / active.length);
    while (placed < upTo) {
      out.push(maintenance[placed++]);
    }
  }
  while (placed < maintenance.length) out.push(maintenance[placed++]);
  return out;
}

/** Fisher-Yates shuffle (in-place) */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
