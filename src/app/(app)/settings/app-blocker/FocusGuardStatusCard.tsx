'use client';

import { useState, useEffect } from 'react';
import Kai from '@/app/Kai';
import { ShieldWarning, Sliders, X, Minus, Plus, Question, ArrowsClockwise, CheckCircle, XCircle } from '@phosphor-icons/react';
import type { BlockerStudyMode, BlockerNoDueAction } from '@/plugins/app-blocker/definitions';

interface FocusGuardStatusCardProps {
  isMonitoring: boolean;
  blockedCount: number;
  flashcardCount: number;
  blockChance?: number;
  unlockDurationMinutes?: number;
  reviewType?: string;
  direction?: string;
  studyMode?: BlockerStudyMode;
  practice?: boolean;
  noDueAction?: BlockerNoDueAction;
  earlyReviewStrategy?: 'practice' | 'proportional';
  hasPermissions: boolean;
  usageStatsGranted?: boolean;
  overlayGranted?: boolean;
  onToggleMonitoring: () => void;
  onRequestPermissions: () => void;
  onCheckPermissionStatus?: () => void;
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
    earlyReviewStrategy?: 'practice' | 'proportional';
  }) => void;
}

const STUDY_MODES: { id: BlockerStudyMode; label: string; hint: string }[] = [
  { id: 'due', label: 'Due', hint: 'SRS scheduled now' },
  { id: 'all', label: 'All', hint: 'Any card (study ahead)' },
  { id: 'recent', label: 'Recent', hint: 'Added in 7 days' },
  { id: 'struggling', label: 'Struggling', hint: 'Low ease factor' },
  { id: 'leeches', label: 'Leeches', hint: 'Stuck short-interval' },
];

export default function FocusGuardStatusCard({
  isMonitoring,
  blockedCount,
  flashcardCount,
  blockChance = 100,
  unlockDurationMinutes = 15,
  reviewType = 'mixed',
  direction = 'mixed',
  studyMode = 'all',
  practice = false,
  noDueAction = 'autoOpen',
  earlyReviewStrategy = 'practice',
  hasPermissions,
  usageStatsGranted,
  overlayGranted,
  onToggleMonitoring,
  onRequestPermissions,
  onCheckPermissionStatus,
  onUpdateFlashcardCount,
  onUpdateAppBlockerConfig,
}: FocusGuardStatusCardProps) {
  const [showModal, setShowModal] = useState(false);
  const [isRechecking, setIsRechecking] = useState(false);

  function handleCountChange(newCount: number) {
    onUpdateFlashcardCount(newCount);
    onUpdateAppBlockerConfig?.({ count: newCount });
  }

  async function handleRecheck() {
    if (!onCheckPermissionStatus) return;
    setIsRechecking(true);
    try {
      await onCheckPermissionStatus();
    } finally {
      setIsRechecking(false);
    }
  }

  // Auto-recheck when user returns from Android Settings or app comes into focus
  useEffect(() => {
    const handler = () => {
      if (document.visibilityState === 'visible') {
        onCheckPermissionStatus?.();
      }
    };
    document.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);
    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
    };
  }, [onCheckPermissionStatus]);

  const overlayMissing = overlayGranted === false;
  const usageMissing = usageStatsGranted === false;
  const anyPermissionMissing = overlayMissing || usageMissing;

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
                className="text-amber-600 hover:underline flex items-center gap-0.5 text-[10px] sm:text-[11px] whitespace-nowrap"
              >
                <ShieldWarning size={12} className="shrink-0" />
                <span>Permissions ⚠️</span>
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

        {/* Permission Diagnostic Banner */}
        {anyPermissionMissing && (
          <div className="rounded-2xl border-2 border-rose-500/25 bg-rose-500/8 px-3.5 py-3 space-y-2">
            <p className="text-xs font-bold text-rose-700 dark:text-rose-400 flex items-center gap-1.5">
              <ShieldWarning size={14} className="shrink-0" />
              Permissions Required
            </p>

            <div className="space-y-1.5">
              <div className="flex items-center gap-2 text-[11px]">
                {usageStatsGranted
                  ? <CheckCircle size={13} weight="fill" className="text-emerald-500 shrink-0" />
                  : <XCircle size={13} weight="fill" className="text-rose-500 shrink-0" />}
                <span className={usageStatsGranted ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-foreground font-semibold'}>
                  Usage Access
                </span>
                <span className="text-muted">
                  {usageStatsGranted ? '— Granted' : '— Detects which app is open'}
                </span>
              </div>

              <div className="flex items-center gap-2 text-[11px]">
                {overlayGranted
                  ? <CheckCircle size={13} weight="fill" className="text-emerald-500 shrink-0" />
                  : <XCircle size={13} weight="fill" className="text-rose-500 shrink-0" />}
                <span className={overlayGranted ? 'text-emerald-700 dark:text-emerald-400 font-semibold' : 'text-foreground font-semibold'}>
                  Display Over Apps
                </span>
                <span className="text-muted">
                  {overlayGranted ? '— Granted' : '— Shows flashcard overlay on intercept'}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 pt-0.5">
              <button
                onClick={onRequestPermissions}
                className="flex-1 py-1.5 rounded-xl bg-rose-500 text-white text-[11px] font-bold transition active:scale-95"
              >
                Open Settings
              </button>
              {onCheckPermissionStatus && (
                <button
                  onClick={handleRecheck}
                  disabled={isRechecking}
                  className="flex-1 py-1.5 rounded-xl border border-border bg-card text-foreground text-[11px] font-bold transition active:scale-95 flex items-center justify-center gap-1 disabled:opacity-50"
                >
                  <ArrowsClockwise size={12} className={isRechecking ? 'animate-spin' : ''} />
                  Re-check
                </button>
              )}
            </div>
          </div>
        )}
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

            {/* Study Mode */}
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

            {/* Session Type + Direction + Practice */}
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

              {/* Practice Mode + Early Review Strategy */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                      Practice Mode
                    </span>
                    <div className="group relative cursor-pointer text-muted hover:text-foreground">
                      <Question size={12} weight="bold" />
                      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-48 bg-card border border-border text-[10px] text-muted p-2 rounded-xl shadow-lg z-50 leading-snug pointer-events-none">
                        Disables database/SRS updates for ALL reviews in the session, even if cards are due.
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => onUpdateAppBlockerConfig?.({ practice: !practice })}
                    className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-2xl border-2 text-xs font-bold transition ${
                      practice
                        ? 'border-violet-400 bg-violet-500/10 text-violet-600'
                        : 'border-border bg-card text-muted hover:text-foreground'
                    }`}
                  >
                    <span>{practice ? 'Active' : 'Disabled'}</span>
                    <span
                      className={`w-9 h-5 rounded-full relative transition shrink-0 ${
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
                </div>

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

              {/* Early Review Strategy Section */}
              <div className="space-y-1.5">
                <div className="flex items-center gap-1">
                  <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                    Early Review Strategy
                  </span>
                  <div className="group relative cursor-pointer text-muted hover:text-foreground">
                    <Question size={12} weight="bold" />
                    <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block w-56 bg-card border border-border text-[10px] text-muted p-2 rounded-xl shadow-lg z-50 leading-snug pointer-events-none">
                      How SRS behaves when reviewing cards before they are due (e.g. via &apos;Study Any&apos;).
                    </div>
                  </div>
                </div>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => onUpdateAppBlockerConfig?.({ earlyReviewStrategy: 'practice' })}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition ${
                      earlyReviewStrategy === 'practice'
                        ? 'bg-indigo-ai text-white border-indigo-ai'
                        : 'border-border bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    Skip SRS (Practice)
                  </button>
                  <button
                    onClick={() => onUpdateAppBlockerConfig?.({ earlyReviewStrategy: 'proportional' })}
                    className={`flex-1 py-1.5 px-3 rounded-xl text-xs font-bold border transition ${
                      earlyReviewStrategy === 'proportional'
                        ? 'bg-indigo-ai text-white border-indigo-ai'
                        : 'border-border bg-background text-muted hover:text-foreground'
                    }`}
                  >
                    Proportional (Scale)
                  </button>
                </div>
                <p className="text-[10px] text-muted leading-snug">
                  {earlyReviewStrategy === 'practice'
                    ? '🔒 Early reviews act as practice and do not alter existing intervals/SRS schedules.'
                    : '📈 Intervals are adjusted proportionally based on how early you reviewed the card.'}
                </p>
              </div>

              {(practice || noDueAction === 'studyAny') && (
                <p className="text-[10px] text-muted leading-snug rounded-xl bg-muted/10 p-2">
                  {practice && '🧪 Practice mode: unlock answers still count, but SRS/status in DB is not updated.'}
                  {practice && noDueAction === 'studyAny' && <><br /></>}
                  {noDueAction === 'studyAny' && '📚 If no cards are due (per Study Mode), fall back to pulling from "All" cards so the lock is always usable.'}
                </p>
              )}
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
