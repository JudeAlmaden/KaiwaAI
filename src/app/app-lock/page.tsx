'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { AppBlocker } from '@/plugins/app-blocker';
import type { BlockerStudyMode, AppBlockerConfig, BlockerFuriganaMode } from '@/plugins/app-blocker/definitions';
import { getUnlockStatus, grantUnlock } from '@/lib/app-blocker-unlock';
import { FALLBACK_OFFLINE_CARDS, FALLBACK_OFFLINE_KANJI_CARDS } from '@/lib/fallback-cards';
import Kai from '@/app/Kai';
import ReviewCard, { Card } from '@/app/(app)/review/ReviewCard';
import OfflineBanner from '@/components/OfflineBanner';
import { getLearningConfig } from '@/lib/learning-config';
import { resolveShowFurigana } from '@/lib/review/furigana';
import type { ComponentContext } from '@/lib/kanji-mnemonic/types';
import { saveKanjiMnemonicClient } from '@/lib/kanji-mnemonic/save-client';

type InitResult =
  | { kind: 'session' }
  | { kind: 'redirect-home' }
  | { kind: 'auto-unlocked' };

/**
 * Grades made in a blocked session are queued when the request fails (offline,
 * flaky signal) and flushed on the next mount or `online` event. Losing a block
 * session's reviews silently is the fastest way to make reviewing feel pointless.
 */
const PENDING_REVIEWS_KEY = 'kaiwa_app_lock_pending_reviews';

type PendingReview = { endpoint: string; body: string };

function readPendingReviews(): PendingReview[] {
  try {
    const raw = localStorage.getItem(PENDING_REVIEWS_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    return Array.isArray(parsed) ? (parsed as PendingReview[]) : [];
  } catch {
    return [];
  }
}

function writePendingReviews(items: PendingReview[]) {
  try {
    if (items.length === 0) localStorage.removeItem(PENDING_REVIEWS_KEY);
    else localStorage.setItem(PENDING_REVIEWS_KEY, JSON.stringify(items));
  } catch { }
}

/** Resolves true when the review is saved (or rejected outright), false to retry. */
function sendPendingReview(review: PendingReview): Promise<boolean> {
  return fetch(review.endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: review.body,
  })
    .then((res) => res.ok || res.status < 500)
    .catch(() => false);
}

async function flushPendingReviews() {
  const pending = readPendingReviews();
  if (pending.length === 0) return;
  const remaining: PendingReview[] = [];
  for (const review of pending) {
    if (!(await sendPendingReview(review))) remaining.push(review);
  }
  writePendingReviews(remaining);
}

type Direction = 'jp-to-en' | 'en-to-jp' | 'mixed';

export default function StandaloneAppLockPage() {
  const router = useRouter();
  const finishingRef = useRef(false);
  const isGradingRef = useRef(false);
  const [blockedPackage, setBlockedPackage] = useState<string | null>(null);
  // What the learner asked for, before the pool shrank the goal.
  const [requestedCount, setRequestedCount] = useState<number | null>(null);
  const [requiredCount, setRequiredCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      const countParam = new URLSearchParams(window.location.search).get('count');
      if (countParam) {
        const parsed = parseInt(countParam, 10);
        if (!isNaN(parsed) && parsed > 0) return parsed;
      }
      try {
        const raw = localStorage.getItem('kaiwa_app_blocker_config');
        if (raw) {
          const parsed = JSON.parse(raw);
          if (typeof parsed.count === 'number' && parsed.count > 0) return parsed.count;
        }
      } catch { }
    }
    return 10;
  });
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState<number>(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = sessionStorage.getItem('kaiwa_app_lock_completed');
        if (saved) {
          const n = parseInt(saved, 10);
          if (!isNaN(n) && n >= 0) return n;
        }
      } catch { }
    }
    return 0;
  });
  const [flipped, setFlipped] = useState(false);
  // Set when the goal is met: the learner gets a recap instead of being dropped
  // straight into the app, so the session registers as study rather than a toll.
  const [recapCount, setRecapCount] = useState<number | null>(null);
  const [cardEpoch, setCardEpoch] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initResult, setInitResult] = useState<InitResult | null>(null);
  const [gradedIds, setGradedIds] = useState<Set<string>>(new Set());
  const [failedCardIds, setFailedCardIds] = useState<Set<string>>(new Set());
  const [earlyReviewStrategy, setEarlyReviewStrategy] = useState<'practice' | 'proportional'>(
    () => getLearningConfig().earlyReviewStrategy
  );
  const [furiganaMode, setFuriganaMode] = useState<BlockerFuriganaMode>('always');
  const [showHint, setShowHint] = useState(false);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);
  const [emergencyCountdown, setEmergencyCountdown] = useState<number | null>(null);
  const [emergencyUsedToday, setEmergencyUsedToday] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      const today = new Date().toISOString().slice(0, 10);
      return localStorage.getItem('kaiwa_emergency_pass_date') === today;
    } catch {
      return false;
    }
  });

  const isWeb = Capacitor.getPlatform() === 'web';

  const finishUnlock = useCallback(async (pkg: string | null) => {
    if (finishingRef.current) return;
    finishingRef.current = true;
    try {
      sessionStorage.removeItem('kaiwa_app_lock_completed');
    } catch { }

    // Skip native unlock call on web — it would throw
    if (!isWeb) {
      await grantUnlock().catch(() => { });
    }

    let targetPkg = pkg;
    if (!isWeb) {
      try {
        const config = await AppBlocker.getAppBlockerConfig().catch(() => null);
        if (config?.lastBlockedPackage) {
          targetPkg = config.lastBlockedPackage;
        }
      } catch { }
    }

    if (targetPkg && !isWeb) {
      setTimeout(() => {
        AppBlocker.launchApp({ packageName: targetPkg! }).catch(() => { });
      }, 300);
    }

    router.replace('/home');
  }, [router, isWeb]);

  const handleGenerateMnemonic = useCallback(async (
    kanji: {
      character: string;
      meanings: string[];
      primitives?: string[];
      components?: ComponentContext[];
      heisigKeyword?: string | null;
      heisigNumber?: number | null;
    },
    isRegenerate: boolean
  ) => {
    if (isRegenerate) {
      const confirmed = window.confirm(
        "⚠️ Are you sure you want to regenerate the mnemonic?\n\nThis will replace the existing mnemonic with a new one."
      );
      if (!confirmed) return;
    }

    setGeneratingMnemonic(true);
    try {
      const { generateKanjiMnemonicClient } = await import("@/lib/kanji-mnemonic-client");
      const mnemonic = await generateKanjiMnemonicClient({
        character: kanji.character,
        meanings: kanji.meanings,
        primitives: kanji.primitives,
        components: kanji.components,
        heisigKeyword: kanji.heisigKeyword,
        heisigNumber: kanji.heisigNumber,
      });

      await saveKanjiMnemonicClient(kanji.character, mnemonic);

      setCards(prev => {
        const updated = [...prev];
        if (updated[currentIndex]) {
          updated[currentIndex] = { ...updated[currentIndex], mnemonic };
        }
        return updated;
      });
      setShowHint(true);
    } catch (err) {
      console.error(err);
    } finally {
      setGeneratingMnemonic(false);
    }
  }, [currentIndex]);

  const fetchCards = useCallback(async (
    reviewType: 'vocabulary' | 'kanji' | 'mixed',
    studyMode: BlockerStudyMode,
    learningRatio: number = 0.5,
    count: number = 10,
  ): Promise<Card[] | { offline: true }> => {
    const endpoint = reviewType === 'mixed'
      ? '/api/review/mixed'
      : `/api/${reviewType === 'kanji' ? 'kanji' : 'flashcards'}/review`;

    const learningCfg = getLearningConfig();
    const maxLearningPool = learningCfg.maxLearningPool;
    // Same intake rules as the in-app session: the route combines the daily
    // ceiling with the per-session quota.
    const maxNewCards = learningCfg.maxNewCards;
    const newPerSession = learningCfg.newPerSession;

    // `fill=1` lets the session reach its card count (due → new → anything
    // studied). `maxDailyReviews` is deliberately NOT sent: spending the daily
    // review goal must not turn the lock screen into a free unlock.
    try {
      const res = await fetch(
        `${endpoint}?studyMode=${encodeURIComponent(studyMode)}&limit=${count}&learningRatio=${learningRatio}&fill=1&maxNewCards=${maxNewCards}&newPerSession=${newPerSession}&maxLearningPool=${maxLearningPool}`
      );
      if (res.ok) {
        const data = await res.json();
        return data.cards ?? [];
      }
      // Non-OK response but reachable — treat as empty
      return [];
    } catch {
      // Network error — user is offline
      return { offline: true };
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      try {
        const params = new URLSearchParams(window.location.search);
        const pkg = params.get('blocked_package');
        const countParam = params.get('count');
        const isBlockIntercept = isWeb || params.get('mode') === 'app-blocker' || !!pkg;

        // Stale /app-lock URL (e.g. reopening KaiwaAI after unlock expired) — go home
        // On web/PC we skip this guard so the page always works for previewing
        if (!isBlockIntercept) {
          if (!cancelled) {
            setInitResult({ kind: 'redirect-home' });
            setLoading(false);
          }
          return;
        }

        if (pkg) setBlockedPackage(pkg);

        // Pull full config (URL params take precedence, then saved native prefs)
        const urlReviewType = params.get('reviewType') as AppBlockerConfig['reviewType'] | null;
        const urlStudyMode = params.get('studyMode') as BlockerStudyMode | null;
        const urlDirection = params.get('direction') as Direction | null;

        let savedConfig: AppBlockerConfig | null = null;
        try {
          savedConfig = await AppBlocker.getAppBlockerConfig().catch(() => null);
        } catch {
          savedConfig = null;
        }

        let localConfigCount: number | null = null;
        try {
          const raw = localStorage.getItem('kaiwa_app_blocker_config');
          if (raw) {
            const p = JSON.parse(raw);
            if (typeof p.count === 'number' && p.count > 0) localConfigCount = p.count;
          }
        } catch { }

        const targetCount = countParam
          ? parseInt(countParam, 10) || 10
          : (savedConfig?.count ?? localConfigCount ?? 10);
        setRequiredCount(targetCount);
        setRequestedCount(targetCount);

        const reviewType: AppBlockerConfig['reviewType'] = urlReviewType ?? savedConfig?.reviewType ?? 'vocabulary';
        const studyMode: BlockerStudyMode = urlStudyMode ?? savedConfig?.studyMode ?? 'due';
        const direction: Direction = urlDirection ?? (savedConfig?.direction as Direction | undefined | null) ?? 'jp-to-en';
        const urlEarlyStrategy = params.get('earlyReviewStrategy') as 'practice' | 'proportional' | null;
        const earlyStrategy = urlEarlyStrategy ?? savedConfig?.earlyReviewStrategy ?? getLearningConfig().earlyReviewStrategy;

        const urlFuriganaMode = params.get('furiganaMode') as BlockerFuriganaMode | null;
        const urlShowFurigana = params.get('showFurigana');
        // Furigana is owned by Learning settings; the learning config acts as a
        // fallback for the web/preview case where the native plugin config is
        // in-memory and resets on reload.
        const learningFuriganaMode = getLearningConfig().defaultFuriganaMode as BlockerFuriganaMode;
        const resolvedFuriganaMode: BlockerFuriganaMode =
          urlFuriganaMode ??
          savedConfig?.furiganaMode ??
          (urlShowFurigana !== null
            ? (urlShowFurigana === '1' || urlShowFurigana === 'true' ? 'always' : 'never')
            : (savedConfig?.showFurigana === false
              ? 'never'
              : (learningFuriganaMode ?? 'always')));

        const urlLearningRatio = params.get('learningRatio');
        const resolvedLearningRatio: number =
          urlLearningRatio !== null && !isNaN(parseFloat(urlLearningRatio))
            ? parseFloat(urlLearningRatio)
            : (savedConfig?.learningRatio ?? getLearningConfig().defaultLearningRatio ?? 0.2);

        setEarlyReviewStrategy(earlyStrategy);
        setFuriganaMode(resolvedFuriganaMode);

        // On web, skip native unlock check — always start a fresh session
        if (!isWeb) {
          const unlock = await getUnlockStatus();
          if (unlock.active) {
            if (!cancelled) {
              setInitResult({ kind: 'auto-unlocked' });
              setLoading(false);
            }
            finishUnlock(pkg);
            return;
          }
        }

        let pulledCards = await fetchCards(reviewType, studyMode, resolvedLearningRatio, targetCount);
        if (cancelled) return;

        // Nothing for this pool (e.g. no due cards, no leeches): study any card
        // instead of skipping the block — a lock session always has cards to show.
        if (!('offline' in pulledCards) && pulledCards.length === 0 && studyMode !== 'all') {
          pulledCards = await fetchCards(reviewType, 'all', resolvedLearningRatio, targetCount);
          if (cancelled) return;
        }

        // Offline or unvalidated network error — auto-unlock and pass through immediately
        if ('offline' in pulledCards && pulledCards.offline) {
          if (!cancelled) {
            setInitResult({ kind: 'auto-unlocked' });
            setLoading(false);
          }
          finishUnlock(pkg);
          return;
        }

        // If no cards returned (logged out / 0 cards in DB)
        let availableCards = pulledCards as Card[];
        if (availableCards.length === 0) {
          if (!isWeb) {
            // Auto-unlock immediately on native if user is logged out or has no cards
            if (!cancelled) {
              setInitResult({ kind: 'auto-unlocked' });
              setLoading(false);
            }
            finishUnlock(pkg);
            return;
          }
          // On web/preview: use offline fallback cards
          availableCards = reviewType === 'kanji' ? FALLBACK_OFFLINE_KANJI_CARDS : FALLBACK_OFFLINE_CARDS;
        }

        const effectiveRequirement = Math.min(targetCount, availableCards.length);
        setRequiredCount(effectiveRequirement);

        // Slice down to exact requirement count for the session deck
        const slicedCards = availableCards.slice(0, effectiveRequirement);

        // A mixed block picks one direction for the whole session. Rerolling per
        // card showed the same card JP→EN in one block and EN→JP in the next.
        const sessionDirection: 'jp-to-en' | 'en-to-jp' =
          direction === 'mixed' ? (Math.random() < 0.5 ? 'jp-to-en' : 'en-to-jp') : direction;

        setCards(
          slicedCards.map((c) => ({
            ...c,
            _dir: sessionDirection,
          }))
        );
        setInitResult({ kind: 'session' });
        setLoading(false);
      } catch (err) {
        console.error('[app-lock] init error:', err);
        if (!cancelled) {
          // On error, try to show a session rather than infinite loading
          setInitResult({ kind: 'session' });
          setLoading(false);
        }
      }
    }

    init();
    return () => { cancelled = true; };
  }, [fetchCards, finishUnlock, isWeb]);

  useEffect(() => {
    if (initResult?.kind === 'redirect-home') {
      router.replace('/home');
    }
  }, [initResult, router]);

  useEffect(() => {
    void flushPendingReviews();
    const onOnline = () => void flushPendingReviews();
    window.addEventListener('online', onOnline);
    return () => window.removeEventListener('online', onOnline);
  }, []);

  const handleGrade = useCallback(
    (grade: number) => {
      if (isGradingRef.current) return;
      const card = cards[currentIndex];
      if (!card) return;

      const isFirstAttempt = !gradedIds.has(card.id);
      // Only the first attempt is graded for scheduling. A card that comes back
      // after "Again" is a relearning pass you have just seen the answer to, so it
      // can't earn a full pass: Good and Easy stay closed and Hard is the ceiling.
      if (!isFirstAttempt && (grade === 2 || grade === 3)) return;

      isGradingRef.current = true;

      try {
        if (typeof navigator !== 'undefined' && typeof navigator.vibrate === 'function') {
          navigator.vibrate(grade === 0 ? [20, 40, 20] : 12);
        }

        // Enforce async: persist review grade in the background without blocking the UI
        if (isFirstAttempt) {
          const cardType = card.type || 'vocabulary';
          const review: PendingReview = {
            endpoint: cardType === 'kanji' ? '/api/kanji/review' : '/api/flashcards/review',
            body: JSON.stringify({
              cardId: card.id,
              grade,
              // Being interrupted into your hardest cards must not breed leeches.
              fromLock: true,
              earlyReviewStrategy,
              desiredRetention: getLearningConfig().desiredRetention,
            }),
          };
          void sendPendingReview(review).then((saved) => {
            if (!saved) writePendingReviews([...readPendingReviews(), review]);
          });
        }

        if (isFirstAttempt) {
          setGradedIds((prev) => {
            const next = new Set(prev);
            next.add(card.id);
            return next;
          });
        }

        setFlipped(false);
        setCardEpoch((e) => e + 1);

        if (grade > 0) {
          // PASSED: increment completedCount and remove from session deck
          const newCompleted = completedCount + 1;
          setCompletedCount(newCompleted);
          try {
            sessionStorage.setItem('kaiwa_app_lock_completed', String(newCompleted));
          } catch { }

          const nextCards = [...cards];
          nextCards.splice(currentIndex, 1);

          if (newCompleted >= requiredCount || nextCards.length === 0) {
            setRecapCount(newCompleted);
          } else {
            setCards(nextCards);
            setCurrentIndex((prev) => (nextCards.length > 0 ? prev % nextCards.length : 0));
          }
        } else {
          // FAILED ("Again"):
          // Do NOT increment completedCount!
          // Track as failed card so Good & Easy are disabled when it returns
          setFailedCardIds((prev) => new Set(prev).add(card.id));
          // Re-insert the card at least 3 positions ahead (so >= 2 cards intervene)
          // or at the very end when fewer cards remain.
          const nextCards = [...cards];
          const [failedCard] = nextCards.splice(currentIndex, 1);
          const remainingAhead = nextCards.length - currentIndex;
          let targetIndex: number;
          if (remainingAhead < 3) {
            targetIndex = nextCards.length;
          } else {
            const minIndex = currentIndex + 3;
            const maxIndex = nextCards.length;
            targetIndex = minIndex + Math.floor(Math.random() * (maxIndex - minIndex + 1));
          }
          nextCards.splice(targetIndex, 0, failedCard);

          setCards(nextCards);
          setCurrentIndex((prev) => (nextCards.length > 0 ? prev % nextCards.length : 0));
        }
      } finally {
        setTimeout(() => {
          isGradingRef.current = false;
        }, 100);
      }
    },
    [completedCount, requiredCount, cards, currentIndex, gradedIds, earlyReviewStrategy]
  );

  // Move the current card to the back without grading it: the only other way past
  // a card you cannot read is to grade it, which pollutes the schedule.
  const skipCard = useCallback(() => {
    if (cards.length < 2) return;
    const nextCards = [...cards];
    const [card] = nextCards.splice(currentIndex, 1);
    nextCards.push(card);
    setCards(nextCards);
    setCurrentIndex(Math.min(currentIndex, nextCards.length - 1));
    setFlipped(false);
    setCardEpoch((e) => e + 1);
  }, [cards, currentIndex]);

  const currentCard = cards[currentIndex];
  const isCardFailed = currentCard ? failedCardIds.has(currentCard.id) : false;
  const progressPct = Math.min(100, Math.round((completedCount / requiredCount) * 100));

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped) {
        if (e.key === '1') {
          handleGrade(0);
        } else if (e.key === '2') {
          handleGrade(1);
        } else if (e.key === '3') {
          if (!isCardFailed) handleGrade(2);
        } else if (e.key === '4') {
          if (!isCardFailed) handleGrade(3);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGrade, isCardFailed, flipped]);

  // Auto-launch into the blocked app ~1.2s after completing the goal.
  useEffect(() => {
    if (recapCount === null) return;
    const timer = setTimeout(() => {
      void finishUnlock(blockedPackage);
    }, 1200);
    return () => clearTimeout(timer);
  }, [recapCount, blockedPackage, finishUnlock]);

  // 5-second breath countdown for the 1/day emergency pass.
  useEffect(() => {
    if (emergencyCountdown === null) return;
    const timer = setTimeout(() => {
      if (emergencyCountdown <= 1) {
        try {
          localStorage.setItem('kaiwa_emergency_pass_date', new Date().toISOString().slice(0, 10));
        } catch { }
        setEmergencyUsedToday(true);
        setEmergencyCountdown(null);
        void finishUnlock(blockedPackage);
      } else {
        setEmergencyCountdown((c) => (c !== null ? c - 1 : null));
      }
    }, 1000);
    return () => clearTimeout(timer);
  }, [emergencyCountdown, blockedPackage, finishUnlock]);

  if (loading || initResult?.kind === 'redirect-home' || initResult?.kind === 'auto-unlocked') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <Kai size={64} className="animate-bounce" />
        <p className="mt-4 text-sm font-bold text-muted font-display">
          {initResult?.kind === 'auto-unlocked'
            ? 'Unlocking your app...'
            : 'Loading Focus Guard...'}
        </p>
      </div>
    );
  }

  if (recapCount !== null) {
    const target = blockedPackage ? blockedPackage.split('.').pop() || 'app' : null;
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
        <Kai size={64} className="mb-4" />
        <h1 className="font-display text-xl font-bold text-foreground mb-2">
          Session complete
        </h1>
        <p className="text-sm text-muted max-w-xs leading-relaxed mb-1">
          {recapCount} card{recapCount === 1 ? '' : 's'} reviewed.
        </p>
        <p className="text-xs text-muted max-w-xs leading-relaxed mb-6">
          Opening {target ?? 'your app'}…
        </p>
        <button
          type="button"
          onClick={() => void finishUnlock(blockedPackage)}
          className="w-full max-w-xs h-12 rounded-2xl bg-indigo-ai text-white font-bold text-sm shadow-sm hover:brightness-105 transition active:translate-y-[2px] flex items-center justify-center gap-2"
        >
          🚀 {target ? `Open ${target}` : 'Launch app'} now
        </button>
      </div>
    );
  }

  if (!currentCard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
        <Kai size={64} className="mb-4 opacity-60" />
        <h1 className="font-display text-xl font-bold text-foreground mb-2">No Cards Available</h1>
        <p className="text-sm text-muted max-w-xs leading-relaxed mb-6">
          Add vocabulary or kanji cards to use Focus Guard.
        </p>
        <button
          type="button"
          onClick={() => finishUnlock(blockedPackage)}
          className="w-full max-w-xs h-12 rounded-2xl bg-indigo-ai text-white font-bold text-sm shadow-sm hover:brightness-105 transition active:translate-y-[2px] flex items-center justify-center gap-2"
        >
          🚀 Launch App &amp; Unlock
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden select-none">
      <OfflineBanner isAppBlockerMode={true} />

      <header className="p-4 sm:px-8 bg-card/60 backdrop-blur-md border-b-2 border-border flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Kai size={40} />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-card">
              🔒
            </span>
          </div>
          <div>
            <h1 className="font-display text-base font-extrabold text-foreground">
              Focus Guard
            </h1>
            <p className="text-xs text-muted">
              {blockedPackage
                ? `Complete cards to open ${blockedPackage.split('.').pop() || 'app'}`
                : 'Complete cards to unlock'}
            </p>
            {requestedCount !== null && requiredCount < requestedCount && (
              <p className="text-[10px] text-muted/80">
                Only {requiredCount} card{requiredCount === 1 ? '' : 's'} available
                right now, so that&apos;s the goal.
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3.5 py-1.5 rounded-full bg-indigo-ai/10 text-indigo-ai font-display text-xs font-extrabold border border-indigo-ai/20">
            {Math.max(0, requiredCount - completedCount)} Left
          </div>
        </div>
      </header>

      <div className="w-full h-2 bg-muted/20">
        <div
          className="h-full bg-indigo-ai transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4 max-w-md mx-auto w-full">
        <ReviewCard
          key={`${currentCard.id}-${cardEpoch}`}
          card={currentCard}
          reviewType={currentCard.type || "vocabulary"}
          flipped={flipped}
          disabledGrades={isCardFailed ? [2, 3] : undefined}
          showFurigana={resolveShowFurigana(furiganaMode, currentCard)}
          onFlip={() => setFlipped(!flipped)}
          onGrade={(g) => handleGrade(g)}
          showHint={showHint}
          generatingMnemonic={generatingMnemonic}
          onToggleHint={() => {
            if (showHint && currentCard.mnemonic) {
              setShowHint(false);
            } else {
              setShowHint(!showHint);
            }
          }}
          onGenerateMnemonic={(isRegen) => {
            if (currentCard.character) {
              handleGenerateMnemonic(
                {
                  character: currentCard.character,
                  meanings: currentCard.meanings || [],
                  primitives: currentCard.primitives,
                  components: currentCard.components,
                  heisigKeyword: currentCard.heisigKeyword,
                  heisigNumber: currentCard.heisigNumber,
                },
                isRegen
              );
            }
          }}
        />
        <div className="flex flex-col items-center gap-2">
          <button
            type="button"
            onClick={skipCard}
            disabled={cards.length < 2}
            title="Moves this card to the end without grading it"
            className="text-xs font-semibold text-muted underline-offset-2 hover:underline disabled:opacity-40"
          >
            Skip this card
          </button>

          {!emergencyUsedToday && (
            emergencyCountdown !== null ? (
              <div className="flex items-center gap-2 text-[11px] font-semibold text-amber-600">
                <span>Emergency unlock in {emergencyCountdown}s…</span>
                <button
                  type="button"
                  onClick={() => setEmergencyCountdown(null)}
                  className="underline hover:text-foreground cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setEmergencyCountdown(5)}
                className="text-[11px] font-medium text-muted/70 hover:text-foreground underline-offset-2 hover:underline cursor-pointer"
              >
                Emergency pass (1/day)
              </button>
            )
          )}
        </div>
      </main>
    </div>
  );
}
