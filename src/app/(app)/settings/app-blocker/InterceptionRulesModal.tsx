'use client';

import { X, Minus, Plus, Sliders, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';
import type {
  AppBlockerConfig,
  BlockerStudyMode,
  BlockerNoDueAction,
} from '@/plugins/app-blocker/definitions';

export interface InterceptionRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  blockChance?: number;
  unlockDurationMinutes?: number;
  reviewType?: 'mixed' | 'vocabulary' | 'kanji';
  direction?: 'jp-to-en' | 'en-to-jp' | 'mixed';
  studyMode?: BlockerStudyMode;
  practice?: boolean;
  learningRatio?: number;
  noDueAction?: BlockerNoDueAction;
  onUpdateAppBlockerConfig: (updates: Partial<AppBlockerConfig>) => void;
  showAppManagerLink?: boolean;
  isMonitoring?: boolean;
  onToggleMonitoring?: () => void;
}

const STUDY_MODES: { id: BlockerStudyMode; label: string; hint: string }[] = [
  { id: 'due', label: 'Due', hint: 'SRS scheduled now' },
  { id: 'all', label: 'All', hint: 'Any card (study ahead)' },
  { id: 'recent', label: 'Recent', hint: 'Added in 7 days' },
  { id: 'struggling', label: 'Struggling', hint: 'Low ease factor' },
  { id: 'leeches', label: 'Leeches', hint: 'Stuck short-interval' },
];

export default function InterceptionRulesModal({
  isOpen,
  onClose,
  count,
  blockChance = 100,
  unlockDurationMinutes = 15,
  reviewType = 'vocabulary',
  direction = 'jp-to-en',
  studyMode = 'all',
  practice = false,
  learningRatio = 0.5,
  noDueAction = 'autoOpen',
  onUpdateAppBlockerConfig,
  showAppManagerLink = false,
  isMonitoring,
  onToggleMonitoring,
}: InterceptionRulesModalProps) {
  if (!isOpen) return null;

  function handleCountChange(newCount: number) {
    onUpdateAppBlockerConfig({ count: newCount });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-md max-h-[90vh] flex flex-col rounded-3xl border-2 border-border bg-card shadow-2xl overflow-hidden"
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
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-muted/15 text-muted hover:text-foreground flex items-center justify-center text-xs font-bold transition cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Master Switch Bar (Optional) */}
          {onToggleMonitoring && (
            <div className="flex items-center justify-between p-3 rounded-2xl border-2 border-border bg-background">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isMonitoring ? "bg-emerald-500 animate-pulse" : "bg-muted"
                  }`}
                />
                <span>App Blocker Guard: {isMonitoring ? "Active" : "Paused"}</span>
              </div>

              <button
                type="button"
                onClick={onToggleMonitoring}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer ${
                  isMonitoring
                    ? "bg-rose-500 text-white"
                    : "bg-indigo-ai text-white"
                }`}
              >
                {isMonitoring ? "Pause Guard" : "Start Guard"}
              </button>
            </div>
          )}
          {/* ── SECTION 1: Goal ─────────────────────────────── */}
          <div className="space-y-3">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Goal</span>

            {/* Cards goal stepper + presets */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCountChange(Math.max(1, count - 1))}
                  disabled={count <= 1}
                  className="w-8 h-8 rounded-xl border border-border bg-background flex items-center justify-center font-bold text-foreground transition active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Minus size={13} />
                </button>
                <div className="text-center w-10">
                  <span className="font-display font-extrabold text-foreground text-xl leading-none">
                    {count}
                  </span>
                  <p className="text-[9px] text-muted font-medium mt-0.5">cards</p>
                </div>
                <button
                  type="button"
                  onClick={() => handleCountChange(Math.min(100, count + 1))}
                  disabled={count >= 100}
                  className="w-8 h-8 rounded-xl border border-border bg-background flex items-center justify-center font-bold text-foreground transition active:scale-95 disabled:opacity-40 cursor-pointer"
                >
                  <Plus size={13} />
                </button>
              </div>
              <div className="flex items-center gap-1">
                {[5, 10, 15, 20].map((preset) => (
                  <button
                    key={preset}
                    type="button"
                    onClick={() => handleCountChange(preset)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      count === preset
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
                      type="button"
                      onClick={() => onUpdateAppBlockerConfig({ blockChance: pct })}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold text-center transition cursor-pointer ${
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
                      type="button"
                      onClick={() => onUpdateAppBlockerConfig({ unlockDurationMinutes: mins })}
                      className={`flex-1 py-1 rounded-lg text-[10px] font-bold text-center transition cursor-pointer ${
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
                  {(['vocabulary', 'kanji', 'mixed'] as const).map((type) => (
                    <button
                      key={type}
                      type="button"
                      onClick={() => onUpdateAppBlockerConfig({ reviewType: type })}
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
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
                      type="button"
                      onClick={() => onUpdateAppBlockerConfig({ direction: dir })}
                      className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
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
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground shrink-0">Pool</span>
                  <span className="text-[9px] text-muted">Card selection</span>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {STUDY_MODES.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      title={m.hint}
                      onClick={() => onUpdateAppBlockerConfig({ studyMode: m.id })}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-bold transition cursor-pointer ${
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

              {/* Focus (learning ratio) — only meaningful when pool is 'all' */}
              {studyMode === 'all' && (
                <div className="flex items-center justify-between px-3 py-2 gap-2 bg-card">
                  <div className="flex flex-col">
                    <span className="text-xs font-semibold text-foreground shrink-0">Focus</span>
                    <span className="text-[9px] text-muted">New vs review mix</span>
                  </div>
                  <div className="flex gap-1">
                    {[
                      { ratio: 0.5, label: '50/50' },
                      { ratio: 0.7, label: '70/30' },
                      { ratio: 1.0, label: 'All New' },
                    ].map((opt) => (
                      <button
                        key={opt.ratio}
                        type="button"
                        onClick={() => onUpdateAppBlockerConfig({ learningRatio: opt.ratio })}
                        className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
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
              )}
            </div>
          </div>

          {/* ── SECTION 3: Options ──────────────────────────── */}
          <div className="space-y-1">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">Options</span>
            <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border/60">
              {/* Practice mode */}
              <div className="flex items-center justify-between px-3 py-2.5 gap-2 bg-card">
                <div>
                  <span className="text-xs font-semibold text-foreground block">Practice mode</span>
                  <span className="text-[9px] text-muted">No SRS or interval updates</span>
                </div>
                <button
                  type="button"
                  onClick={() => onUpdateAppBlockerConfig({ practice: !practice })}
                  className={`w-9 h-5 rounded-full relative transition shrink-0 cursor-pointer ${
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
                <div>
                  <span className="text-xs font-semibold text-foreground block">When nothing due</span>
                  <span className="text-[9px] text-muted">Behavior when pool is empty</span>
                </div>
                <div className="flex gap-1">
                  <button
                    type="button"
                    onClick={() => onUpdateAppBlockerConfig({ noDueAction: 'autoOpen' })}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                      noDueAction === 'autoOpen'
                        ? 'bg-emerald-500 text-white'
                        : 'text-muted hover:text-foreground'
                    }`}
                  >
                    Skip
                  </button>
                  <button
                    type="button"
                    onClick={() => onUpdateAppBlockerConfig({ noDueAction: 'studyAny' })}
                    className={`px-2.5 py-0.5 rounded-lg text-[11px] font-bold transition cursor-pointer ${
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

        {/* Footer */}
        <div className="p-3 sm:p-4 border-t border-border bg-card/90 backdrop-blur-sm shrink-0 flex flex-col gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 bg-indigo-ai border-b-4 border-indigo-deep hover:brightness-105 active:translate-y-[2px] text-white font-bold text-xs rounded-2xl shadow-xs transition cursor-pointer"
          >
            Save Rules
          </button>

          {showAppManagerLink && (
            <Link
              href="/settings/app-blocker"
              className="text-center font-bold text-indigo-ai hover:underline flex items-center justify-center gap-1 text-[11px] pt-1"
              onClick={onClose}
            >
              <span>Full App Manager &amp; App Selection</span>
              <ArrowRight size={12} />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
