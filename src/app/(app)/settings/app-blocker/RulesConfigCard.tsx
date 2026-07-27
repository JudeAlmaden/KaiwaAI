'use client';

import { useState } from 'react';
import { Target, X, Minus, Plus, Sliders } from '@phosphor-icons/react';
import type { BlockerStudyMode, BlockerNoDueAction } from '@/plugins/app-blocker/definitions';

interface RulesConfigCardProps {
  flashcardCount: number;
  blockChance?: number;
  unlockDurationMinutes?: number;
  reviewType?: string;
  direction?: string;
  studyMode?: BlockerStudyMode;
  practice?: boolean;
  noDueAction?: BlockerNoDueAction;
  onUpdateFlashcardCount: (count: number) => void;
  onUpdateAppBlockerConfig?: (updates: {
    count?: number;
    blockChance?: number;
    unlockDurationMinutes?: number;
    reviewType?: 'mixed' | 'vocabulary' | 'kanji';
    direction?: 'jp-to-en' | 'en-to-jp' | 'mixed';
    studyMode?: BlockerStudyMode;
    practice?: boolean;
    noDueAction?: BlockerNoDueAction;
  }) => void;
}

const STUDY_MODES: { id: BlockerStudyMode; label: string; hint: string }[] = [
  { id: 'due', label: 'Due', hint: 'SRS scheduled now' },
  { id: 'all', label: 'All', hint: 'Any card (study ahead)' },
  { id: 'recent', label: 'Recent', hint: 'Added in 7 days' },
  { id: 'struggling', label: 'Struggling', hint: 'Low ease factor' },
  { id: 'leeches', label: 'Leeches', hint: 'Stuck short-interval' },
];

export default function RulesConfigCard({
  flashcardCount,
  blockChance = 100,
  unlockDurationMinutes = 15,
  reviewType = 'mixed',
  direction = 'mixed',
  studyMode = 'due',
  practice = false,
  noDueAction = 'autoOpen',
  onUpdateFlashcardCount,
  onUpdateAppBlockerConfig,
}: RulesConfigCardProps) {
  const [showModal, setShowModal] = useState(false);

  function handleCountChange(newCount: number) {
    onUpdateFlashcardCount(newCount);
    if (onUpdateAppBlockerConfig) {
      onUpdateAppBlockerConfig({ count: newCount });
    }
  }

  return (
    <>
      {/* Summary Card with Modal Trigger Button */}
      <section className="rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-ai/10 text-indigo-ai flex items-center justify-center font-bold shrink-0">
            <Target size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-foreground">Review &amp; Interception Rules</h2>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted font-medium pt-0.5">
              <span className="font-bold text-indigo-ai">{flashcardCount} Flashcards</span>
              <span>•</span>
              <span>{blockChance}% Chance</span>
              <span>•</span>
              <span>{unlockDurationMinutes}m Grace Period</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border-2 border-border bg-background hover:bg-muted/10 text-foreground font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
        >
          <Sliders size={16} className="text-indigo-ai" />
          <span>Edit Rules &amp; Goal</span>
        </button>
      </section>

      {/* Rules & Interception Configuration Modal */}
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
                    Edit Interception Rules
                  </h3>
                  <p className="text-xs text-muted">Customize flashcard goal &amp; grace duration</p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl bg-muted/15 text-muted hover:text-foreground flex items-center justify-center text-xs font-bold transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* 1. Flashcard Goal Stepper & Presets */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Required Flashcard Goal
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

            {/* 2. Probability & Re-lock Grace */}
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

            {/* 3. Study Mode */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Study Mode (Which cards?)
              </span>
              <div className="flex flex-wrap gap-1">
                {STUDY_MODES.map((m) => (
                  <button
                    key={m.id}
                    title={m.hint}
                    onClick={() => onUpdateAppBlockerConfig?.({ studyMode: m.id })}
                    className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
                      studyMode === m.id
                        ? 'bg-indigo-ai text-white'
                        : 'border border-border bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-muted leading-snug">
                {STUDY_MODES.find(m => m.id === studyMode)?.hint}
              </p>
            </div>

            {/* 4. Session Type + Direction */}
            <div className="space-y-3">
              <div className="space-y-2">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Card Type
                </span>
                <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                  {(['mixed', 'vocabulary', 'kanji'] as const).map((type) => (
                    <button
                      key={type}
                      onClick={() => onUpdateAppBlockerConfig?.({ reviewType: type })}
                      className={`px-3 py-1 rounded-xl capitalize transition ${
                        reviewType === type
                          ? 'bg-indigo-ai text-white'
                          : 'border border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Direction
                </span>
                <div className="flex flex-wrap items-center gap-1.5">
                  {(['jp-to-en', 'en-to-jp', 'mixed'] as const).map((dir) => (
                    <button
                      key={dir}
                      onClick={() => onUpdateAppBlockerConfig?.({ direction: dir })}
                      className={`px-2.5 py-1 rounded-xl transition text-[11px] font-bold ${
                        direction === dir
                          ? 'bg-indigo-ai text-white'
                          : 'border border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      {dir === 'jp-to-en'
                        ? 'JP → EN'
                        : dir === 'en-to-jp'
                        ? 'EN → JP'
                        : 'Mixed Dir'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Practice + No Due Action */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button
                  onClick={() => onUpdateAppBlockerConfig?.({ practice: !practice })}
                  className={`flex items-center justify-between gap-2 px-3 py-2 rounded-2xl border-2 text-xs font-bold transition ${
                    practice
                      ? 'border-violet-400 bg-violet-500/10 text-violet-600'
                      : 'border-border bg-card text-muted hover:text-foreground'
                  }`}
                >
                  <span>Practice Mode</span>
                  <span
                    className={`w-9 h-5 rounded-full relative transition ${
                      practice ? 'bg-violet-500' : 'bg-muted/40'
                    }`}
                  >
                    <span
                      className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                        practice ? 'left-4' : 'left-0.5'
                      }`}
                    />
                  </span>
                </button>

                <div className="space-y-1.5">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    If Nothing Due
                  </span>
                  <div className="flex gap-1">
                    <button
                      onClick={() => onUpdateAppBlockerConfig?.({ noDueAction: 'autoOpen' })}
                      className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-bold transition ${
                        noDueAction === 'autoOpen'
                          ? 'bg-emerald-500 text-white'
                          : 'border border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      Auto-Open
                    </button>
                    <button
                      onClick={() => onUpdateAppBlockerConfig?.({ noDueAction: 'studyAny' })}
                      className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-bold transition ${
                        noDueAction === 'studyAny'
                          ? 'bg-sky-500 text-white'
                          : 'border border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      Use Any
                    </button>
                  </div>
                </div>
              </div>

              {(practice || noDueAction === 'studyAny') && (
                <p className="text-[10px] text-muted leading-snug rounded-xl bg-muted/10 p-2">
                  {practice && '🧪 Practice mode: unlock answers still count, but SRS/status in DB is not updated.'}
                  {practice && noDueAction === 'studyAny' && <><br /></>}
                  {noDueAction === 'studyAny' && '📚 If no cards match Study Mode, fall back to "All" cards so the lock is always usable.'}
                </p>
              )}
            </div>

            {/* Done Action */}
            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 bg-indigo-ai border-b-4 border-indigo-deep hover:brightness-105 active:translate-y-[2px] text-white font-bold text-xs rounded-2xl shadow-xs transition"
            >
              Done Editing
            </button>
          </div>
        </div>
      )}
    </>
  );
}
