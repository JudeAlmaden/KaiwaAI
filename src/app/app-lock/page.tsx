'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Capacitor } from '@capacitor/core';
import { AppBlocker } from '@/plugins/app-blocker';
import type { BlockerStudyMode, BlockerNoDueAction, AppBlockerConfig } from '@/plugins/app-blocker/definitions';
import { getUnlockStatus, grantUnlock } from '@/lib/app-blocker-unlock';
import Kai from '@/app/Kai';
import ReviewCard, { Card } from '@/app/(app)/review/ReviewCard';
import OfflineBanner from '@/components/OfflineBanner';

type InitResult =
  | { kind: 'session' }
  | { kind: 'redirect-home' }
  | { kind: 'auto-unlocked' };

type Direction = 'jp-to-en' | 'en-to-jp' | 'mixed';

export default function StandaloneAppLockPage() {
  const router = useRouter();
  const finishingRef = useRef(false);
  const [blockedPackage, setBlockedPackage] = useState<string | null>(null);
  const [requiredCount, setRequiredCount] = useState(10);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [cardEpoch, setCardEpoch] = useState(0);
  const [loading, setLoading] = useState(true);
  const [initResult, setInitResult] = useState<InitResult | null>(null);
  const [gradedIds, setGradedIds] = useState<Set<string>>(new Set());
  const [practice, setPractice] = useState(false);
  const [earlyReviewStrategy, setEarlyReviewStrategy] = useState<'practice' | 'proportional'>('practice');

  const [showHint, setShowHint] = useState(false);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);

  const isWeb = Capacitor.getPlatform() === 'web';

  const finishUnlock = useCallback(async (pkg: string | null) => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    // Skip native unlock call on web — it would throw
    if (!isWeb) {
      await grantUnlock().catch(() => {});
    }

    if (pkg && !isWeb) {
      setTimeout(() => {
        AppBlocker.launchApp({ packageName: pkg }).catch(() => {});
      }, 300);
    }

    router.replace('/home');
  }, [router, isWeb]);

  const handleGenerateMnemonic = useCallback(async (kanjiChar: string, meanings: string[], radicals: string[], isRegenerate: boolean) => {
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
        character: kanjiChar,
        meanings,
        radicals,
      });

      await fetch(`/api/kanji/${encodeURIComponent(kanjiChar)}/mnemonic`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic }),
      });

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
  ): Promise<Card[] | { offline: true }> => {
    const endpoint = reviewType === 'mixed'
      ? '/api/review/mixed'
      : `/api/${reviewType === 'kanji' ? 'kanji' : 'flashcards'}/review`;

    try {
      const res = await fetch(`${endpoint}?studyMode=${encodeURIComponent(studyMode)}&limit=50`);
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
        if (countParam) {
          setRequiredCount(parseInt(countParam, 10) || 10);
        } else {
          AppBlocker.getFlashcardRequirement()
            .then((res) => { if (res?.count) setRequiredCount(res.count); })
            .catch(() => {});
        }

        // Pull full config (URL params take precedence, then saved native prefs)
        const urlReviewType = params.get('reviewType') as AppBlockerConfig['reviewType'] | null;
        const urlStudyMode = params.get('studyMode') as BlockerStudyMode | null;
        const urlPractice = params.get('practice');
        const urlNoDue = params.get('noDueAction') as BlockerNoDueAction | null;
        const urlDirection = params.get('direction') as Direction | null;

        let savedConfig: AppBlockerConfig | null = null;
        try {
          savedConfig = await AppBlocker.getAppBlockerConfig().catch(() => null);
        } catch {
          savedConfig = null;
        }

        const reviewType: AppBlockerConfig['reviewType'] = urlReviewType ?? savedConfig?.reviewType ?? 'vocabulary';
        const studyMode: BlockerStudyMode = urlStudyMode ?? savedConfig?.studyMode ?? 'all';
        const practiceEnabled: boolean =
          urlPractice !== null ? urlPractice === '1' || urlPractice === 'true' : (savedConfig?.practice ?? false);
        const noDueActionResolved: BlockerNoDueAction =
          urlNoDue ?? savedConfig?.noDueAction ?? 'autoOpen';
        const direction: Direction = urlDirection ?? (savedConfig?.direction as Direction | undefined | null) ?? 'jp-to-en';
        const urlEarlyStrategy = params.get('earlyReviewStrategy') as 'practice' | 'proportional' | null;
        const earlyStrategy = urlEarlyStrategy ?? savedConfig?.earlyReviewStrategy ?? 'practice';

        setPractice(practiceEnabled);
        setEarlyReviewStrategy(earlyStrategy);

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

        let pulledCards = await fetchCards(reviewType, studyMode);
        if (cancelled) return;

        // Offline: network error — let them pass
        if ('offline' in pulledCards && pulledCards.offline) {
          if (!cancelled) {
            setInitResult({ kind: 'auto-unlocked' });
            setLoading(false);
          }
          finishUnlock(pkg);
          return;
        }

        // If no cards returned, honor noDueAction — but on web always try 'all' first
        if ((pulledCards as Card[]).length === 0) {
          if (!isWeb && noDueActionResolved === 'autoOpen') {
            setInitResult({ kind: 'auto-unlocked' });
            setLoading(false);
            finishUnlock(pkg);
            return;
          }
          // On web, or when noDueAction=studyAny: retry with all cards
          const fallbackResult = await fetchCards(reviewType, 'all');
          if (cancelled) return;

          if ('offline' in fallbackResult && fallbackResult.offline) {
            // Offline on retry — let them pass
            setInitResult({ kind: 'auto-unlocked' });
            setLoading(false);
            finishUnlock(pkg);
            return;
          }

          const fallbackCards = fallbackResult as Card[];
          if (!cancelled && fallbackCards.length === 0) {
            // Nothing at all — nothing to review
            setInitResult({ kind: 'session' });
            setLoading(false);
            return;
          }
          pulledCards = fallbackCards;
        }

        setCards(
          (pulledCards as Card[]).map((c) => ({
            ...c,
            _dir:
              direction === 'jp-to-en'
                ? 'jp-to-en'
                : direction === 'en-to-jp'
                ? 'en-to-jp'
                : Math.random() < 0.5
                ? 'jp-to-en'
                : 'en-to-jp',
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

  const handleGrade = useCallback(
    (grade: number) => {
      const card = cards[currentIndex];
      if (!card) return;

      const isFirstAttempt = !gradedIds.has(card.id);

      if (isFirstAttempt && !practice) {
        const cardType = card.type || 'vocabulary';
        const endpoint = cardType === 'kanji' ? '/api/kanji/review' : '/api/flashcards/review';
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: card.id, grade, earlyReviewStrategy }),
        }).catch(() => {});
      }

      if (isFirstAttempt) {
        setGradedIds(prev => { const next = new Set(prev); next.add(card.id); return next; });
      }

      setFlipped(false);
      setCardEpoch((e) => e + 1);

      if (grade > 0) {
        const newCompleted = completedCount + 1;
        setCompletedCount(newCompleted);

        if (newCompleted >= requiredCount) {
          finishUnlock(blockedPackage);
        } else {
          setCurrentIndex((prev) => (prev + 1) % cards.length);
        }
      } else {
        setCards(prev => {
          const next = [...prev];
          const [failed] = next.splice(currentIndex, 1);
          next.push(failed);
          return next;
        });
      }
    },
    [completedCount, requiredCount, cards, currentIndex, blockedPackage, gradedIds, practice, earlyReviewStrategy, finishUnlock]
  );

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (e.key === '1') {
        handleGrade(0);
      } else if (e.key === '2') {
        handleGrade(1);
      } else if (e.key === '3') {
        handleGrade(2);
      } else if (e.key === '4') {
        handleGrade(3);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleGrade]);

  const currentCard = cards[currentIndex];
  const progressPct = Math.min(100, Math.round((completedCount / requiredCount) * 100));

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

  if (!currentCard) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
        <Kai size={64} className="mb-4 opacity-60" />
        <h1 className="font-display text-xl font-bold text-foreground mb-2">No Cards Available</h1>
        <p className="text-sm text-muted max-w-xs leading-relaxed mb-6">
          Add vocabulary or kanji cards to use Focus Guard.
        </p>
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
          </div>
        </div>

        <div className="flex items-center gap-2">
          {practice && (
            <span className="px-2.5 py-1 rounded-full bg-violet-500/15 text-violet-600 font-display text-[10px] font-extrabold border border-violet-500/20">
              PRACTICE
            </span>
          )}
          <div className="px-3.5 py-1.5 rounded-full bg-indigo-ai/10 text-indigo-ai font-display text-xs font-extrabold border border-indigo-ai/20">
            {completedCount} / {requiredCount} Cards
          </div>
        </div>
      </header>

      <div className="w-full h-2 bg-muted/20">
        <div
          className="h-full bg-indigo-ai transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      <div className="flex items-center justify-center gap-2 pt-3">
        {cards.slice(0, 5).map((c, idx) => {
          const isCurrent = idx === currentIndex % 5;
          return (
            <div
              key={c.id || idx}
              className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                isCurrent
                  ? 'bg-indigo-ai ring-4 ring-indigo-ai/20 scale-125'
                  : 'bg-border border border-muted/20'
              }`}
            />
          );
        })}
      </div>

      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4 max-w-md mx-auto w-full">
        <ReviewCard
          key={`${currentCard.id}-${cardEpoch}`}
          card={currentCard}
          reviewType={currentCard.type || "vocabulary"}
          flipped={flipped}
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
                currentCard.character,
                currentCard.meanings || [],
                currentCard.radicals || [],
                isRegen
              );
            }
          }}
        />
      </main>
    </div>
  );
}
