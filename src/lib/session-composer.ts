interface Card {
  id: string;
  repetitions: number;
  easeFactor: number;
  interval: number;
  nextReview: Date;
  createdAt: Date;
  lastReviewedAt?: Date | null;
}

interface SessionComposition<T extends Card> {
  session: T[];
  activeCards: T[];
  maintenanceCards: T[];
}

/**
 * Composes a review session from active (focused learning) and maintenance (retention) pools.
 * 
 * Active pool: 50% of session
 *   - Priority: All new cards (repetitions === 0) first
 *   - Then: Weak cards (easeFactor < 2.2 AND interval < 3)
 *   - Sorted deterministically: easeFactor → repetitions → createdAt (all asc)
 * 
 * Maintenance pool: 50% of session
 *   - Criteria: nextReview <= now AND lastReviewedAt < now - 1 hour
 *   - Avoids recently seen cards to prevent immediate repetition
 *   - Sorted by nextReview asc, then shuffled for variety
 *   - When ignoreDueDate=true: includes ALL non-active cards regardless of nextReview
 * 
 * Pattern: [A1, M1, A2, M2, M3, ...]
 *   - Active cards appear early and close together for reinforcement
 *   - Maintenance cards fill remaining slots with variety
 * 
 * @param allCards - Pre-sorted cards from database
 * @param sessionSize - Total cards in session (default: 5)
 * @param ignoreDueDate - If true, maintenance pool includes all cards regardless of due date (for studyMode=all)
 * @returns Session composition with interleaved active and maintenance cards
 */
export function composeSession<T extends Card>(
  allCards: T[],
  sessionSize: number = 5,
  ignoreDueDate: boolean = false
): SessionComposition<T> {
  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  // Calculate pool sizes (50% active, 50% maintenance — target, not a hard cap)
  const activeTarget = Math.max(1, Math.round(sessionSize * 0.5));
  const maintenanceTarget = sessionSize - activeTarget;

  // Split cards into pools
  const activePool: T[] = [];
  const maintenancePool: T[] = [];

  for (const card of allCards) {
    // Active pool criteria: prioritize new cards, then weak short-interval cards
    const isNew = card.repetitions === 0;
    const isWeakAndShort = card.easeFactor < 2.2 && card.interval < 3;
    const isActive = isNew || isWeakAndShort;

    if (isActive) {
      activePool.push(card);
    } else {
      // Maintenance pool: check due date unless ignoreDueDate=true
      const isDue = ignoreDueDate || card.nextReview <= now;
      
      if (isDue) {
        // Avoid recently reviewed cards (within last hour)
        const wasRecentlyReviewed = 
          card.lastReviewedAt && card.lastReviewedAt >= oneHourAgo;
        
        if (!wasRecentlyReviewed) {
          maintenancePool.push(card);
        }
      }
    }
  }

  // Take up to each target from its pool (still honoring 50/50 split when pools are large)
  const selectedActive = activePool.slice(0, activeTarget);
  const activeIds = new Set(selectedActive.map(c => c.id));

  // Maintenance pool: exclude active cards, then shuffle
  const eligibleMaintenance = maintenancePool.filter(c => !activeIds.has(c.id));
  shuffleArray(eligibleMaintenance);
  const selectedMaintenance = eligibleMaintenance.slice(0, maintenanceTarget);

  // Build pools of "overflow" cards beyond the 50/50 targets, still eligible for use
  // to fill the session up to sessionSize (so the user doesn't get a truncated queue
  // when sufficient cards exist but the 50/50 split isn't perfectly achievable).
  const overflowActive = activePool
    .slice(activeTarget)
    .filter(c => !activeIds.has(c.id));
  const overflowMaintenance = eligibleMaintenance.slice(maintenanceTarget);

  // Compose session: [A1, M1, A2, M2, M3, ...]
  // Interleave active and maintenance for better spacing.
  // When the primary selections run out, draw from overflow pools (active first, then
  // maintenance) until sessionSize is reached or no more cards are available.
  const session: T[] = [];
  let aIdx = 0, mIdx = 0;
  let aOverIdx = 0, mOverIdx = 0;

  for (let i = 0; i < sessionSize; i++) {
    const primaryA = aIdx < selectedActive.length;
    const primaryM = mIdx < selectedMaintenance.length;
    const overA = aOverIdx < overflowActive.length;
    const overM = mOverIdx < overflowMaintenance.length;

    if (!primaryA && !primaryM && !overA && !overM) break;

    const wantActive = i % 2 === 0 || (!primaryM && !overM);

    if (wantActive) {
      if (primaryA) {
        session.push(selectedActive[aIdx++]);
      } else if (overA) {
        session.push(overflowActive[aOverIdx++]);
      } else if (primaryM) {
        session.push(selectedMaintenance[mIdx++]);
      } else if (overM) {
        session.push(overflowMaintenance[mOverIdx++]);
      }
    } else {
      if (primaryM) {
        session.push(selectedMaintenance[mIdx++]);
      } else if (overM) {
        session.push(overflowMaintenance[mOverIdx++]);
      } else if (primaryA) {
        session.push(selectedActive[aIdx++]);
      } else if (overA) {
        session.push(overflowActive[aOverIdx++]);
      }
    }
  }

  return {
    session,
    activeCards: selectedActive,
    maintenanceCards: selectedMaintenance,
  };
}

/**
 * Fisher-Yates shuffle (in-place)
 */
function shuffleArray<T>(array: T[]): void {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}
