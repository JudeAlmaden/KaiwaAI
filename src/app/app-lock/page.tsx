'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { AppBlocker } from '@/plugins/app-blocker';
import Kai from '@/app/Kai';
import { ShieldCheck, House } from '@phosphor-icons/react';
import ReviewCard, { Card } from '@/app/(app)/review/ReviewCard';
import OfflineBanner from '@/components/OfflineBanner';



export default function StandaloneAppLockPage() {
  const router = useRouter();
  const [blockedPackage, setBlockedPackage] = useState<string | null>(null);
  const [requiredCount, setRequiredCount] = useState(10);
  const [cards, setCards] = useState<Card[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [completedCount, setCompletedCount] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gradedIds, setGradedIds] = useState<Set<string>>(new Set()); // tracks first-attempt grades

  // Mnemonic & hint state
  const [showHint, setShowHint] = useState(false);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);

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

  const fetchCards = useCallback(async () => {
    try {
      const params = new URLSearchParams(typeof window !== 'undefined' ? window.location.search : '');
      const reviewType = params.get('reviewType') || 'vocabulary';
      const endpoint = reviewType === 'mixed'
        ? '/api/review/mixed'
        : `/api/${reviewType === 'kanji' ? 'kanji' : 'flashcards'}/review`;

      // Prefer due cards for real SRS; fall back to all if nothing is due
      const resDue = await fetch(`${endpoint}?studyMode=due&limit=50`);
      if (resDue.ok) {
        const data = await resDue.json();
        if (data.cards && data.cards.length > 0) {
          setCards(data.cards);
          setLoading(false);
          return;
        }
      }

      // No due cards — fetch from all
      const resAll = await fetch(`${endpoint}?studyMode=all&limit=30`);
      if (resAll.ok) {
        const data = await resAll.json();
        if (data.cards && data.cards.length > 0) {
          setCards(data.cards);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Failed to load cards
    }

    setLoading(false);
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pkg = params.get('blocked_package');
      const countParam = params.get('count');
      if (pkg) setBlockedPackage(pkg);

      if (countParam) {
        const cnt = parseInt(countParam) || 10;
        setRequiredCount(cnt);
      } else {
        AppBlocker.getFlashcardRequirement()
          .then((res) => {
            if (res?.count) setRequiredCount(res.count);
          })
          .catch(() => {});
      }
    }

    fetchCards();
  }, [fetchCards]);

  const handleGrade = useCallback(
    (grade: number) => {
      const card = cards[currentIndex];
      if (!card) return;

      const isFirstAttempt = !gradedIds.has(card.id);

      // Submit SRS update on first attempt only
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

      if (grade > 0) {
        // Passed — count toward unlock
        const newCompleted = completedCount + 1;
        setCompletedCount(newCompleted);

        if (newCompleted >= requiredCount) {
          const unlock = () => {
            setIsUnlocked(true);
            if (blockedPackage) {
              setTimeout(() => {
                AppBlocker.launchApp({ packageName: blockedPackage }).catch(() => {});
              }, 800);
            }
          };
          AppBlocker.markFlashcardsCompleted().then(unlock).catch((e) => {
            console.error(e);
            unlock();
          });
        } else {
          // Move to next card
          setCurrentIndex((prev) => (prev + 1) % cards.length);
        }
      } else {
        // Again — cycle card to end of queue without counting progress
        setCards(prev => {
          const next = [...prev];
          const [failed] = next.splice(currentIndex, 1);
          next.push(failed);
          return next;
        });
        // Keep currentIndex pointing at the same position (which is now a different card)
      }
    },
    [completedCount, requiredCount, cards, currentIndex, blockedPackage, gradedIds]
  );

  // Keyboard shortcut listener (Space to flip, 1-4 for grades)
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

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-background p-6">
        <Kai size={64} className="animate-bounce" />
        <p className="mt-4 text-sm font-bold text-muted font-display">
          Kai is preparing your Focus Guard review...
        </p>
      </div>
    );
  }

  // No cards available
  if (cards.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-background text-center">
        <Kai size={64} className="mb-4 opacity-60" />
        <h1 className="font-display text-xl font-bold text-foreground mb-2">No Cards Available</h1>
        <p className="text-sm text-muted max-w-xs leading-relaxed mb-6">
          You need to add vocabulary or kanji cards before Focus Guard can quiz you. Add some cards and try again!
        </p>
        <button
          onClick={() => router.push('/home')}
          className="px-6 py-3 rounded-2xl bg-indigo-ai border-b-4 border-indigo-deep text-white font-bold text-sm flex items-center gap-2"
        >
          <House size={18} />
          Go to App Home
        </button>
      </div>
    );
  }

  // Completion View
  if (isUnlocked) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-b from-emerald-500/10 via-background to-background text-center animate-in fade-in duration-300">
        <div className="w-20 h-20 rounded-3xl bg-mint/20 text-mint flex items-center justify-center mb-5 border-2 border-mint/40 shadow-xs animate-bounce">
          <ShieldCheck size={48} />
        </div>

        <h1 className="font-display text-2xl sm:text-3xl font-extrabold text-foreground mb-2">
          Focus Guard Unlocked! 🎉
        </h1>

        <p className="text-sm text-muted max-w-md leading-relaxed mb-8">
          Awesome job! You completed <strong className="text-foreground">{completedCount}</strong> flashcards. Kai has unlocked your app for the next 15 minutes!
        </p>

        <div className="flex flex-col sm:flex-row gap-3 w-full max-w-xs">
          {blockedPackage && (
            <button
              onClick={() => AppBlocker.launchApp({ packageName: blockedPackage }).catch(() => {})}
              className="w-full min-h-[48px] px-6 py-3 rounded-2xl bg-emerald-500 border-b-4 border-emerald-600 text-white font-bold text-sm shadow-sm hover:brightness-105 transition active:translate-y-[2px] flex items-center justify-center gap-2"
            >
              🚀 Launch App Now
            </button>
          )}
          <button
            onClick={() => router.push('/home')}
            className="w-full min-h-[48px] px-6 py-3 rounded-2xl bg-indigo-ai border-b-4 border-indigo-deep text-white font-bold text-sm shadow-sm hover:brightness-105 transition active:translate-y-[2px] flex items-center justify-center gap-2"
          >
            <House size={18} />
            Go to App Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background relative overflow-hidden select-none">
      <OfflineBanner isAppBlockerMode={true} />

      {/* Standalone Focus Guard Header */}
      <header className="p-4 sm:px-8 bg-card/60 backdrop-blur-md border-b-2 border-border flex items-center justify-between gap-3 shadow-xs">
        <div className="flex items-center gap-3">
          <div className="relative shrink-0">
            <Kai size={40} />
            <span className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white flex items-center justify-center text-[10px] font-bold border-2 border-card">
              🔒
            </span>
          </div>
          <div>
            <h1 className="font-display text-base font-extrabold text-foreground flex items-center gap-1.5">
              Focus Guard
            </h1>
            <p className="text-xs text-muted">
              {blockedPackage ? `Complete cards to open ${blockedPackage.split('.').pop() || 'app'}` : 'Complete cards to unlock'}
            </p>
          </div>
        </div>

        <div className="px-3.5 py-1.5 rounded-full bg-indigo-ai/10 text-indigo-ai font-display text-xs font-extrabold border border-indigo-ai/20">
          {completedCount} / {requiredCount} Cards
        </div>
      </header>

      {/* Progress Bar */}
      <div className="w-full h-2 bg-muted/20">
        <div
          className="h-full bg-indigo-ai transition-all duration-300 ease-out"
          style={{ width: `${progressPct}%` }}
        />
      </div>

      {/* Active Pool Indicators */}
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

      {/* Standalone 3D Flip Card Container */}
      <main className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4 max-w-md mx-auto w-full">
        <ReviewCard
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
