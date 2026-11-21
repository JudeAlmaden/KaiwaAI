"use client";

import { useEffect } from "react";
import OfflineBanner from "@/components/OfflineBanner";
import ReviewCard from "../ReviewCard";
import { formatComposition, type CompositionCounts } from "@/lib/review/composition";
import { resolveShowFurigana } from "@/lib/review/furigana";
import type { FuriganaMode } from "@/lib/review/types";
import type { ActiveCard, Setup } from "../types";

export type ReviewSessionViewProps = {
  setup: Setup;
  activePool: ActiveCard[];
  incomingQueue: ActiveCard[];
  postedCardIds: Set<string>;
  failedCardIds: Set<string>;
  total: number;
  sessionComposition: CompositionCounts | null;
  tally: { again: number; good: number };
  flipped: boolean;
  setFlipped: React.Dispatch<React.SetStateAction<boolean>>;
  cardEpoch: number;
  showHint: boolean;
  setShowHint: React.Dispatch<React.SetStateAction<boolean>>;
  generatingMnemonic: boolean;
  furiganaMode: FuriganaMode;
  onGrade: (g: number) => void;
  onClose: () => void;
  onShowHint: () => void;
  onGenerateMnemonic: (
    kanjiChar: string,
    meanings: string[],
    radicals: string[],
    isRegenerate: boolean
  ) => void;
};

export function ReviewSessionView({
  setup,
  activePool,
  incomingQueue,
  postedCardIds,
  failedCardIds,
  total,
  sessionComposition,
  flipped,
  setFlipped,
  cardEpoch,
  showHint,
  setShowHint,
  generatingMnemonic,
  furiganaMode,
  onGrade,
  onClose,
  onShowHint,
  onGenerateMnemonic,
}: ReviewSessionViewProps) {
  const card = activePool[0];

  const currentCard = activePool[0];
  const isCardFailed = currentCard ? failedCardIds.has(currentCard.id) : false;

  // Keyboard shortcuts during a session
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        const selectedGrade = Number(e.key) - 1;
        if (isCardFailed && (selectedGrade === 2 || selectedGrade === 3)) {
          return;
        }
        onGrade(selectedGrade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [flipped, onGrade, isCardFailed, setFlipped]);

  // Guard against a transient empty queue between the last grade and phase flip
  if (!card) return null;

  const doneCount = total - (activePool.length + incomingQueue.length);
  const pct = total ? (doneCount / total) * 100 : 0;
  const isAppBlockerSession =
    typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("mode") === "app-blocker";

  return (
    <div className="flex flex-1 flex-col" data-hide-bottom-nav="true">
      <OfflineBanner isAppBlockerMode={isAppBlockerSession} />
      {/* progress */}
      <div className="px-5 pt-4 sm:px-8">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={onClose}
            className="text-sm font-bold text-muted hover:text-indigo-ai"
            title="End session and see summary"
          >
            ✕
          </button>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-indigo-ai transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-muted">
            {setup.isContinuous ? `${doneCount} reviewed` : `${doneCount}/${total}`}
          </span>
        </div>
        {sessionComposition &&
          (sessionComposition.newCount > 0 || sessionComposition.reviewCount > 0) && (
            <p className="mx-auto mt-1.5 max-w-md text-center text-[10px] font-bold uppercase tracking-wide text-muted">
              {formatComposition(sessionComposition)}
            </p>
          )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4 pb-8">
        {/* Active memory pool indicators */}
        {setup.activeLimit !== "all" && (
          <div className="flex items-center justify-center gap-2">
            {activePool.map((c, idx) => {
              const isCurrent = idx === 0;
              const hasBeenAttempted = postedCardIds.has(c.id);
              return (
                <div
                  key={c.id}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? "bg-indigo-ai ring-4 ring-indigo-ai/20 scale-125"
                      : hasBeenAttempted
                        ? "bg-sakura animate-pulse"
                        : "bg-border border border-muted/20"
                  }`}
                  title={isCurrent ? "Current card" : hasBeenAttempted ? "Needs review" : "Up next"}
                />
              );
            })}
          </div>
        )}

        {/* Modular Review Card */}
        <ReviewCard
          key={`${card.id}-${cardEpoch}`}
          card={card}
          reviewType={setup.reviewType}
          flipped={flipped}
          disabledGrades={isCardFailed ? [2, 3] : undefined}
          showFurigana={resolveShowFurigana(furiganaMode, card)}
          onFlip={() => setFlipped((f) => !f)}
          onGrade={onGrade}
          showHint={showHint}
          generatingMnemonic={generatingMnemonic}
          onToggleHint={() => {
            if (showHint && card.mnemonic) {
              setShowHint(false);
            } else {
              onShowHint();
            }
          }}
          onGenerateMnemonic={(isRegen) => {
            onGenerateMnemonic(
              card.character!,
              card.meanings!,
              card.radicals || [],
              isRegen
            );
          }}
        />
      </div>
    </div>
  );
}
