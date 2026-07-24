'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppBlocker } from '@/plugins/app-blocker';
import { getUnlockStatus, grantUnlock } from '@/lib/app-blocker-unlock';
import Kai from '@/app/Kai';
import ReviewCard, { Card } from '@/app/(app)/review/ReviewCard';
import OfflineBanner from '@/components/OfflineBanner';

type InitResult =
  | { kind: 'session' }
  | { kind: 'redirect-home' }
  | { kind: 'auto-unlocked' };

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

  const [showHint, setShowHint] = useState(false);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);

  const finishUnlock = useCallback(async (pkg: string | null) => {
    if (finishingRef.current) return;
    finishingRef.current = true;

    await grantUnlock();

    if (pkg) {
      setTimeout(() => {
        AppBlocker.launchApp({ packageName: pkg }).catch(() => {});
      }, 300);
    }

    router.replace('/home');
  }, [router]);

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

  const fetchDueCards = useCallback(async (): Promise<Card[]> => {
    const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
    const reviewType = params.get('reviewType') || 'vocabulary';
    const endpoint = reviewType === 'mixed'
      ? '/api/review/mixed'
      : `/api/${reviewType === 'kanji' ? 'kanji' : 'flashcards'}/review`;

    try {
      const res = await fetch(`${endpoint}?studyMode=due&limit=50`);
      if (res.ok) {
        const data = await res.json();
        return data.cards ?? [];
      }
    } catch {
      // Failed to load cards
    }
    return [];
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      const params = new URLSearchParams(window.location.search);
      const pkg = params.get('blocked_package');
      const countParam = params.get('count');
      const isBlockIntercept = params.get('mode') === 'app-blocker' || !!pkg;

      // Stale /app-lock URL (e.g. reopening KaiwaAI after unlock expired) — go home
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

      const unlock = await getUnlockStatus();
      if (unlock.active) {
        if (!cancelled) {
          setInitResult({ kind: 'auto-unlocked' });
          setLoading(false);
        }
        finishUnlock(pkg);
        return;
      }

      const dueCards = await fetchDueCards();
      if (cancelled) return;

      // No due cards — nothing to review, skip the lock entirely
      if (dueCards.length === 0) {
        setInitResult({ kind: 'auto-unlocked' });
        setLoading(false);
        finishUnlock(pkg);
        return;
      }

      setCards(dueCards);
      setInitResult({ kind: 'session' });
      setLoading(false);
    }

    init();
    return () => { cancelled = true; };
  }, [fetchDueCards, finishUnlock]);

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

      if (isFirstAttempt) {
        const cardType = card.type || 'vocabulary';
        const endpoint = cardType === 'kanji' ? '/api/kanji/review' : '/api/flashcards/review';
        fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ cardId: card.id, grade }),
        }).catch(() => {});

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
    [completedCount, requiredCount, cards, currentIndex, blockedPackage, gradedIds, finishUnlock]
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

        <div className="px-3.5 py-1.5 rounded-full bg-indigo-ai/10 text-indigo-ai font-display text-xs font-extrabold border border-indigo-ai/20">
          {completedCount} / {requiredCount} Cards
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
