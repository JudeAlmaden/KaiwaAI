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
 * Active pool: 40% of session
 *   - Priority: All new cards (repetitions === 0) first
 *   - Then: Weak cards (easeFactor < 2.2 AND interval < 3)
 *   - Sorted deterministically: easeFactor → repetitions → createdAt (all asc)
 * 
 * Maintenance pool: 60% of session
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

  // Calculate pool sizes (40% active, 60% maintenance)
  const activeCount = Math.max(1, Math.round(sessionSize * 0.4));
  const maintenanceCount = sessionSize - activeCount;

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

  // Active pool is already sorted by caller
  // (easeFactor asc, repetitions asc, createdAt asc)
  const selectedActive = activePool.slice(0, activeCount);
  const activeIds = new Set(selectedActive.map(c => c.id));

  // Maintenance pool: exclude active cards, then shuffle
  const eligibleMaintenance = maintenancePool.filter(c => !activeIds.has(c.id));
  shuffleArray(eligibleMaintenance);
  const selectedMaintenance = eligibleMaintenance.slice(0, maintenanceCount);

  // Compose session: [A1, M1, A2, M2, M3, ...]
  // Interleave active and maintenance for better spacing
  const session: T[] = [];
  let aIdx = 0, mIdx = 0;

  for (let i = 0; i < sessionSize; i++) {
    // Pattern: A, M, A, M, M, M... (active cards come first when possible)
    if (aIdx < selectedActive.length && (i % 2 === 0 || mIdx >= selectedMaintenance.length)) {
      session.push(selectedActive[aIdx++]);
    } else if (mIdx < selectedMaintenance.length) {
      session.push(selectedMaintenance[mIdx++]);
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
