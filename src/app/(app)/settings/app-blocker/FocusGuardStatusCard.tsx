'use client';

import { useState, useEffect } from 'react';
import Kai from '@/app/Kai';
import { ShieldWarning, Sliders, X, Minus, Plus, ArrowsClockwise, CheckCircle, XCircle } from '@phosphor-icons/react';
import type { BlockerStudyMode, BlockerNoDueAction, BlockerFuriganaMode } from '@/plugins/app-blocker/definitions';

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
  showFurigana?: boolean;
  furiganaMode?: BlockerFuriganaMode;
  learningRatio?: number;
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
    showFurigana?: boolean;
    furiganaMode?: BlockerFuriganaMode;
    learningRatio?: number;
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
  furiganaMode = 'always',
  learningRatio = 0.5,
  noDueAction = 'autoOpen',
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
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md max-h-[88vh] flex flex-col rounded-3xl border-2 border-border bg-card shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="p-4 sm:p-5 pb-3 flex items-center justify-between border-b border-border bg-card/60 backdrop-blur-sm shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-indigo-ai/10 text-indigo-ai flex items-center justify-center font-bold shrink-0">
                  <Sliders size={18} />
                </div>
                <div>
                  <h3 className="font-display text-sm sm:text-base font-bold text-foreground">
                    Interception Rules
                  </h3>
                  <p className="text-[11px] text-muted">Customize review goal &amp; session behavior</p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl bg-muted/15 text-muted hover:text-foreground flex items-center justify-center text-xs font-bold transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">

              {/* ── SECTION 1: Goal ─────────────────────────────── */}
              <div className="space-y-3">
                {/* Cards goal stepper + presets */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCountChange(Math.max(1, flashcardCount - 1))}
                      disabled={flashcardCount <= 1}
                      className="w-8 h-8 rounded-xl border border-border bg-background flex items-center justify-center font-bold text-foreground transition active:scale-95 disabled:opacity-40"
                    >
                      <Minus size={13} />
                    </button>
                    <div className="text-center w-10">
                      <span className="font-display font-extrabold text-foreground text-xl leading-none">{flashcardCount}</span>
                      <p className="text-[9px] text-muted font-medium mt-0.5">cards</p>
                    </div>
                    <button
                      onClick={() => handleCountChange(Math.min(100, flashcardCount + 1))}
                      disabled={flashcardCount >= 100}
                      className="w-8 h-8 rounded-xl border border-border bg-background flex items-center justify-center font-bold text-foreground transition active:scale-95 disabled:opacity-40"
                    >
                      <Plus size={13} />
                    </button>
                  </div>
                  <div className="flex items-center gap-1">
                    {[5, 10, 15, 20].map((preset) => (
                      <button
                        key={preset}
                        onClick={() => handleCountChange(preset)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
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

                {/* Block chance + Unlock grace — compact 2-col */}
                <div className="grid grid-cols-2 gap-x-3 gap-y-2 pt-2 border-t border-border/50">
                  {/* Block chance */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-muted">Block chance</span>
                    <div className="flex gap-1">
                      {[25, 50, 75, 100].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => onUpdateAppBlockerConfig?.({ blockChance: pct })}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-bold text-center transition ${
                            blockChance === pct
                              ? 'bg-amber-500 text-white'
                              : 'border border-border bg-background text-muted hover:text-foreground'
                          }`}
                        >
                          {pct === 100 ? '100' : `${pct}%`}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Unlock grace */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-semibold text-muted">Unlock grace</span>
                    <div className="flex gap-1">
                      {[5, 15, 30, 60].map((mins) => (
                        <button
                          key={mins}
                          onClick={() => onUpdateAppBlockerConfig?.({ unlockDurationMinutes: mins })}
                          className={`flex-1 py-1 rounded-lg text-[10px] font-bold text-center transition ${
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
              </div>

              {/* ── SECTION 2: Cards ────────────────────────────── */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Cards</span>
                <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border/60">

                  {/* Type */}
                  <div className="flex items-center justify-between px-3 py-2 gap-2 bg-card">
                    <span className="text-xs font-semibold text-foreground shrink-0">Type</span>
                    <div className="flex gap-1">
                      {(['mixed', 'vocabulary', 'kanji'] as const).map((type) => (
                        <button
                          key={type}
                          onClick={() => onUpdateAppBlockerConfig?.({ reviewType: type })}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                            reviewType === type
                              ? 'bg-indigo-ai text-white'
                              : 'text-muted hover:text-foreground'
                          }`}
                        >
                          {type === 'vocabulary' ? 'Vocab' : type.charAt(0).toUpperCase() + type.slice(1)}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Direction */}
                  <div className="flex items-center justify-between px-3 py-2 gap-2 bg-card">
                    <span className="text-xs font-semibold text-foreground shrink-0">Direction</span>
                    <div className="flex gap-1">
                      {(['jp-to-en', 'en-to-jp', 'mixed'] as const).map((dir) => (
                        <button
                          key={dir}
                          onClick={() => onUpdateAppBlockerConfig?.({ direction: dir })}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                            direction === dir
                              ? 'bg-indigo-ai text-white'
                              : 'text-muted hover:text-foreground'
                          }`}
                        >
                          {dir === 'jp-to-en' ? 'JP→EN' : dir === 'en-to-jp' ? 'EN→JP' : 'Mix'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Pool (study mode) */}
                  <div className="flex items-center justify-between px-3 py-2 gap-2 bg-card">
                    <span className="text-xs font-semibold text-foreground shrink-0">Pool</span>
                    <div className="flex gap-1 flex-wrap justify-end">
                      {STUDY_MODES.map((m) => (
                        <button
                          key={m.id}
                          title={m.hint}
                          onClick={() => onUpdateAppBlockerConfig?.({ studyMode: m.id })}
                          className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition ${
                            studyMode === m.id
                              ? 'bg-indigo-ai text-white'
                              : 'text-muted hover:text-foreground'
                          }`}
                        >
                          {m.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Focus (learning ratio) */}
                  <div className="flex items-center justify-between px-3 py-2 gap-2 bg-card">
                    <span className="text-xs font-semibold text-foreground shrink-0">Focus</span>
                    <div className="flex gap-1">
                      {[
                        { ratio: 0.5, label: '50/50' },
                        { ratio: 0.7, label: '70/30' },
                        { ratio: 1.0, label: 'All New' },
                      ].map((opt) => (
                        <button
                          key={opt.ratio}
                          type="button"
                          onClick={() => onUpdateAppBlockerConfig?.({ learningRatio: opt.ratio })}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                            Math.abs((learningRatio ?? 0.5) - opt.ratio) < 0.05
                              ? 'bg-indigo-ai text-white'
                              : 'text-muted hover:text-foreground'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* ── SECTION 3: Options ──────────────────────────── */}
              <div className="space-y-1">
                <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Options</span>
                <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border/60">

                  {/* Furigana */}
                  <div className="flex items-center justify-between px-3 py-2 gap-2 bg-card">
                    <span className="text-xs font-semibold text-foreground shrink-0">Furigana</span>
                    <div className="flex gap-1">
                      {[
                        { id: 'always' as const, label: 'Always' },
                        { id: 'learning_only' as const, label: 'Smart' },
                        { id: 'never' as const, label: 'Off' },
                      ].map((mode) => (
                        <button
                          key={mode.id}
                          type="button"
                          onClick={() => onUpdateAppBlockerConfig?.({
                            furiganaMode: mode.id,
                            showFurigana: mode.id !== 'never',
                          })}
                          className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                            furiganaMode === mode.id
                              ? 'bg-indigo-ai text-white'
                              : 'text-muted hover:text-foreground'
                          }`}
                        >
                          {mode.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Practice mode */}
                  <div className="flex items-center justify-between px-3 py-2.5 gap-2 bg-card">
                    <span className="text-xs font-semibold text-foreground">Practice mode</span>
                    <button
                      type="button"
                      onClick={() => onUpdateAppBlockerConfig?.({ practice: !practice })}
                      className={`w-9 h-5 rounded-full relative transition shrink-0 ${
                        practice ? 'bg-violet-500' : 'bg-muted/40'
                      }`}
                    >
                      <span
                        className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${
                          practice ? 'left-4' : 'left-0.5'
                        }`}
                      />
                    </button>
                  </div>

                  {/* No cards due */}
                  <div className="flex items-center justify-between px-3 py-2 gap-2 bg-card">
                    <span className="text-xs font-semibold text-foreground shrink-0">No cards due</span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => onUpdateAppBlockerConfig?.({ noDueAction: 'autoOpen' })}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                          noDueAction === 'autoOpen'
                            ? 'bg-emerald-500 text-white'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        Skip
                      </button>
                      <button
                        type="button"
                        onClick={() => onUpdateAppBlockerConfig?.({ noDueAction: 'studyAny' })}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition ${
                          noDueAction === 'studyAny'
                            ? 'bg-sky-500 text-white'
                            : 'text-muted hover:text-foreground'
                        }`}
                      >
                        Study any
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Sticky Action Footer */}
            <div className="p-3 sm:p-4 border-t border-border bg-card/90 backdrop-blur-sm shrink-0">
              <button
                onClick={() => setShowModal(false)}
                className="w-full py-2.5 bg-indigo-ai border-b-4 border-indigo-deep hover:brightness-105 active:translate-y-[2px] text-white font-bold text-xs rounded-2xl shadow-xs transition"
              >
                Save Rules
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
