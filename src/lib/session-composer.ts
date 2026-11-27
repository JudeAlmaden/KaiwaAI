import { isNewCard } from "./review/lifecycle";

interface Card {
  id: string;
  repetitions: number;
  timesReviewed?: number | null;
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
  /**
   * Keep the session at its requested size by carrying on past the plan: new
   * cards at any ratio, then studied cards that aren't due yet. Only the blocked
   * app turns this on — a normal study session must respect what it asked for.
   */
  fillSession?: boolean;
  /**
   * Skip any card seen inside this window. Focus Guard passes its lock cooldown
   * so a second blocked session cannot hand back what the first just served;
   * a normal session keeps only its short in-session cooldowns.
   */
  seenCooldownMs?: number;
}

/**
 * Focus Guard's lock window: cards graded inside it stay out of the next
 * blocked-app session, so back-to-back locks never replay the same deck.
 */
export const LOCK_SEEN_COOLDOWN_MS = 4 * 60 * 60 * 1000;

/**
 * Composes a review session from active (focused learning) and maintenance
 * (retention) pools.
 *
 * Active slots: `learningRatio` share of the session, filled by new cards (up to
 * the per-session intake quota AND the daily ceiling) and then weak cards.
 *
 * Maintenance slots: the rest of the session, reviewed cards only, rotated by
 * least-recently-reviewed so consecutive sessions don't replay the same cards.
 *
 * Composition rules:
 *   - New cards are rationed: never more than `maxNewCards`/`maxNewPerSession`,
 *     and never used to pad a session past the active target while reviews exist.
 *   - With `fillSession` (the blocked app) a short pool still reaches the full
 *     card count: due reviews first, then new cards within the intake quota, then
 *     any studied card (study-ahead, nearest due date first). The quota still caps
 *     new cards, so reaching it means the session continues on existing cards.
 *   - Cards reviewed in the last 2 minutes are held back from maintenance, and
 *     cards reviewed in the last 10 minutes from active, so a second session
 *     started immediately after the first still gets review cards.
 */
/**
 * Active share of a session, in cards. Shared with the maintenance-window helper
 * so the two cannot drift apart again.
 */
export function activeTargetFor(sessionSize: number, learningRatio: number): number {
  const safeSize = Math.max(0, Math.floor(sessionSize));
  const ratio = Math.max(
    0,
    Math.min(1.0, typeof learningRatio === "number" && !isNaN(learningRatio) ? learningRatio : 0.5)
  );
  return ratio === 0 ? 0 : Math.min(safeSize, Math.max(1, Math.round(safeSize * ratio)));
}

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
  const seenCooldownSince =
    options?.seenCooldownMs && options.seenCooldownMs > 0
      ? new Date(now.getTime() - options.seenCooldownMs)
      : null;

  const safeSize = Math.max(0, Math.floor(sessionSize));
  const ratio = Math.max(
    0,
    Math.min(1.0, typeof learningRatio === "number" && !isNaN(learningRatio) ? learningRatio : 0.5)
  );

  // Target split: active gets round(size * ratio), at least one card when any new
  // cards are allowed; maintenance gets the rest.
  const activeTarget = activeTargetFor(safeSize, ratio);

  // New-card intake: the session quota and the daily ceiling both apply.
  const newQuota = Math.min(
    options?.maxNewCards ?? Number.POSITIVE_INFINITY,
    options?.maxNewPerSession ?? Number.POSITIVE_INFINITY
  );
  const fillSession = options?.fillSession === true;

  const activePool: T[] = [];
  const maintenancePool: T[] = [];
  const aheadPool: T[] = [];
  let newCardsAdded = 0;

  for (const card of allCards) {
    // Recently served cards are out for this session: last time's deck must not
    // come straight back when nothing else is due.
    if (
      seenCooldownSince &&
      card.lastReviewedAt &&
      card.lastReviewedAt >= seenCooldownSince
    ) {
      continue;
    }

    const isNew = isNewCard(card);

    // A filling session carries new cards even at ratio 0: it still has to reach
    // its card count once the due pool runs out.
    const canAddNew = isNew && newCardsAdded < newQuota;
    const isActive = canAddNew && (ratio > 0 || fillSession);
    const wasJustReviewed =
      card.lastReviewedAt != null && card.lastReviewedAt >= activeCooldownAgo;

    if (isActive && !wasJustReviewed) {
      activePool.push(card);
      if (isNew) newCardsAdded++;
    } else if (!isNew) {
      const wasRecentlyReviewed =
        card.lastReviewedAt != null && card.lastReviewedAt >= maintenanceCooldownAgo;
      if (wasRecentlyReviewed) continue;
      if (ignoreDueDate || card.nextReview <= now) {
        maintenancePool.push(card);
      } else if (fillSession) {
        // Studied but not due yet: the last resort that keeps a session full.
        aheadPool.push(card);
      }
    }
  }

  const selectedActive = activePool.slice(0, activeTarget);
  const activeIds = new Set(selectedActive.map((c) => c.id));
  // Oldest-seen first, random inside the oldest hour: rotation, not luck.
  const rotatedMaintenance = rotateByOldestSeen(
    maintenancePool.filter((c) => !activeIds.has(c.id))
  );

  const maintenanceTarget = safeSize - activeTarget;
  const selectedMaintenance = rotatedMaintenance.slice(0, maintenanceTarget);

  // Cascade: due reviews → new cards inside the quota → any studied card.
  let missing = safeSize - selectedActive.length - selectedMaintenance.length;

  if (missing > 0) {
    const queueable = rotatedMaintenance.slice(
      selectedMaintenance.length,
      selectedMaintenance.length + missing
    );
    selectedMaintenance.push(...queueable);
    missing -= queueable.length;
  }

  const activeExtras = activePool.slice(activeTarget);
  if (fillSession && missing > 0) {
    const extraNew = activeExtras.filter((c) => isNewCard(c)).slice(0, missing);
    selectedActive.push(...extraNew);
    missing -= extraNew.length;
  }

  if (missing > 0) {
    const extraReviewed = activeExtras
      .filter((c) => !isNewCard(c))
      .slice(0, missing);
    selectedActive.push(...extraReviewed);
    missing -= extraReviewed.length;
  }

  if (fillSession && missing > 0) {
    const selectedIds = new Set([
      ...selectedActive.map((c) => c.id),
      ...selectedMaintenance.map((c) => c.id),
    ]);
    // Study-ahead cards rotate the same way: being nearest due is not a reason
    // to serve the same ones every time the due pool is empty.
    const ahead = rotateByOldestSeen(
      aheadPool.filter((c) => !selectedIds.has(c.id))
    ).slice(0, missing);
    selectedMaintenance.push(...ahead);
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

/** One hour of study counts as one sitting for rotation purposes. */
const SEEN_BUCKET_MS = 60 * 60 * 1000;

/**
 * Rotation order for review pools: never-seen cards first, then oldest-seen
 * first, with a random order inside each bucket. Two sessions an hour apart land
 * in different buckets, so the second cannot replay the first, while the pick
 * inside the oldest bucket still varies.
 */
function rotateByOldestSeen<T extends Card>(pool: T[]): T[] {
  const shuffled = [...pool];
  shuffleArray(shuffled);
  const bucketOf = (card: T) =>
    card.lastReviewedAt
      ? Math.floor(card.lastReviewedAt.getTime() / SEEN_BUCKET_MS)
      : 0;
  // Array#sort is stable, so the shuffled order survives inside each bucket.
  return shuffled.sort((a, b) => bucketOf(a) - bucketOf(b));
}

/** Fisher-Yates shuffle (in-place) */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
