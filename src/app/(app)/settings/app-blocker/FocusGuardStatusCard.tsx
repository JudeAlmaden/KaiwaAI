'use client';

import { useState } from 'react';
import Kai from '@/app/Kai';
import { ShieldWarning, Sliders, X, Minus, Plus } from '@phosphor-icons/react';

interface FocusGuardStatusCardProps {
  isMonitoring: boolean;
  blockedCount: number;
  flashcardCount: number;
  blockChance?: number;
  unlockDurationMinutes?: number;
  reviewType?: string;
  direction?: string;
  hasPermissions: boolean;
  onToggleMonitoring: () => void;
  onRequestPermissions: () => void;
  onUpdateFlashcardCount: (count: number) => void;
  onUpdateAppBlockerConfig?: (updates: {
    count?: number;
    blockChance?: number;
    unlockDurationMinutes?: number;
    reviewType?: 'mixed' | 'vocabulary' | 'kanji';
    direction?: 'jp-to-en' | 'en-to-jp' | 'mixed';
  }) => void;
}

export default function FocusGuardStatusCard({
  isMonitoring,
  blockedCount,
  flashcardCount,
  blockChance = 100,
  unlockDurationMinutes = 15,
  hasPermissions,
  onToggleMonitoring,
  onRequestPermissions,
  onUpdateFlashcardCount,
  onUpdateAppBlockerConfig,
}: FocusGuardStatusCardProps) {
  const [showModal, setShowModal] = useState(false);

  function handleCountChange(newCount: number) {
    onUpdateFlashcardCount(newCount);
    onUpdateAppBlockerConfig?.({ count: newCount });
  }

  return (
    <>
      <section className="rounded-3xl border-2 border-border bg-card p-4 sm:p-5 shadow-xs space-y-3">
        {/* Top Header Row */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <Kai size={36} className="shrink-0" />
            <div className="flex items-center gap-2 min-w-0">
              <h2 className="font-display text-base font-bold text-foreground shrink-0">Focus Guard</h2>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase shrink-0 ${
                  isMonitoring ? 'bg-emerald-500/15 text-emerald-600' : 'bg-muted/20 text-muted'
                }`}
              >
                {isMonitoring ? 'Active' : 'Paused'}
              </span>
            </div>
          </div>

          <button
            onClick={onToggleMonitoring}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 shrink-0 ${
              isMonitoring
                ? 'bg-rose-500 text-white shadow-xs'
                : 'bg-indigo-ai text-white shadow-xs'
            }`}
          >
            {isMonitoring ? 'Pause' : 'Start'}
          </button>
        </div>

        {/* Clean Single Metric & Action Row */}
        <div className="pt-2 border-t border-border flex items-center justify-between gap-1.5 sm:gap-2 text-[10px] sm:text-xs whitespace-nowrap overflow-hidden">
          <div className="flex items-center gap-1 sm:gap-1.5 text-muted font-medium shrink-0">
            <span>{blockedCount} Blocked</span>
            <span>•</span>
            <span className="text-foreground font-bold">{flashcardCount} Cards Goal</span>
          </div>

          <div className="flex items-center gap-2 font-bold shrink-0">
            {!hasPermissions && (
              <button
                onClick={onRequestPermissions}
                className="text-amber-600 flex items-center gap-0.5 text-[10px] sm:text-[11px] whitespace-nowrap"
              >
                <ShieldWarning size={12} className="shrink-0" />
                <span>Permission ⚠️</span>
              </button>
            )}

            <button
              onClick={() => setShowModal(true)}
              className="text-indigo-ai hover:underline text-[10px] sm:text-[11px] flex items-center gap-0.5 whitespace-nowrap"
            >
              <Sliders size={12} className="shrink-0" />
              <span>Edit Rules</span>
            </button>
          </div>
        </div>
      </section>

      {/* Rules Options Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-ai/10 text-indigo-ai flex items-center justify-center font-bold shrink-0">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Interception Rules
                  </h3>
                  <p className="text-xs text-muted">Customize review goal &amp; grace period</p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl bg-muted/15 text-muted hover:text-foreground flex items-center justify-center text-xs font-bold transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Flashcard Goal Stepper */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Required Flashcards
              </span>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCountChange(Math.max(1, flashcardCount - 1))}
                    disabled={flashcardCount <= 1}
                    className="w-8 h-8 rounded-xl border border-border bg-background flex items-center justify-center font-bold text-foreground transition active:scale-95 disabled:opacity-40"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-display font-extrabold text-foreground text-sm">
                    {flashcardCount}
                  </span>
                  <button
                    onClick={() => handleCountChange(Math.min(100, flashcardCount + 1))}
                    disabled={flashcardCount >= 100}
                    className="w-8 h-8 rounded-xl border border-border bg-background flex items-center justify-center font-bold text-foreground transition active:scale-95 disabled:opacity-40"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {[5, 10, 15, 20].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => handleCountChange(preset)}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                        flashcardCount === preset
                          ? 'bg-indigo-ai text-white'
                          : 'border border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Probability & Re-lock Grace */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Probability
                </span>
                <div className="flex flex-wrap gap-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => onUpdateAppBlockerConfig?.({ blockChance: pct })}
                      className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-bold text-center transition ${
                        blockChance === pct
                          ? 'bg-amber-500 text-white'
                          : 'border border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Unlock Grace
                </span>
                <div className="flex flex-wrap gap-1">
                  {[5, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() => onUpdateAppBlockerConfig?.({ unlockDurationMinutes: mins })}
                      className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-bold text-center transition ${
                        unlockDurationMinutes === mins
                          ? 'bg-emerald-500 text-white'
                          : 'border border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Done Action */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-2.5 bg-indigo-ai border-b-4 border-indigo-deep hover:brightness-105 active:translate-y-[2px] text-white font-bold text-xs rounded-2xl shadow-xs transition"
            >
              Save Rules
            </button>
          </div>
        </div>
      )}
    </>
  );
}
