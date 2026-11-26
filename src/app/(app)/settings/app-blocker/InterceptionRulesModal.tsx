'use client';

import { X, Sliders, ArrowRight } from '@phosphor-icons/react';
import Link from 'next/link';
import type {
  AppBlockerConfig,
  BlockerStudyMode,
} from '@/plugins/app-blocker/definitions';
import SessionPlanPicker from './SessionPlanPicker';

export interface InterceptionRulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  count: number;
  unlockDurationMinutes?: number;
  reviewType?: 'mixed' | 'vocabulary' | 'kanji';
  direction?: 'jp-to-en' | 'en-to-jp' | 'mixed';
  studyMode?: BlockerStudyMode;
  practice?: boolean;
  learningRatio?: number;
  onUpdateAppBlockerConfig: (updates: Partial<AppBlockerConfig>) => void;
  showAppManagerLink?: boolean;
  isMonitoring?: boolean;
  onToggleMonitoring?: () => void;
}

export default function InterceptionRulesModal({
  isOpen,
  onClose,
  count,
  unlockDurationMinutes = 45,
  reviewType = 'vocabulary',
  direction = 'mixed',
  studyMode = 'due',
  learningRatio = 0.2,
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

            {/* Cards goal: unified presets + custom input */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1">
                {[3, 5, 10, 15].map((preset) => (
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
              <div className="flex items-center gap-1.5">
                <input
                  type="number"
                  min={1}
                  max={100}
                  value={count}
                  onChange={(e) => {
                    const next = parseInt(e.target.value, 10);
                    handleCountChange(
                      Number.isNaN(next) ? 1 : Math.min(100, Math.max(1, next))
                    );
                  }}
                  aria-label="Cards required to unlock"
                  className="w-14 h-7 rounded-xl border border-border bg-background text-center font-bold text-foreground text-xs focus:outline-none focus:border-indigo-ai"
                />
                <p className="text-[10px] text-muted font-medium">cards</p>
              </div>
            </div>

            {/* Unlock grace: unified presets + custom input */}
            <div className="space-y-2 pt-2 border-t border-border/50">
              <div className="flex items-baseline justify-between">
                <span className="text-[10px] font-semibold text-muted">Unlock for</span>
                <span className="text-[9px] text-muted">Grace before it re-arms</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1">
                  {[15, 30, 45, 60].map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => onUpdateAppBlockerConfig({ unlockDurationMinutes: preset })}
                      className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
                        unlockDurationMinutes === preset
                          ? 'bg-indigo-ai text-white'
                          : 'border border-border bg-background text-muted hover:text-foreground'
                      }`}
                    >
                      {preset}m
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min={1}
                    max={240}
                    value={unlockDurationMinutes}
                    onChange={(e) => {
                      const next = parseInt(e.target.value, 10);
                      onUpdateAppBlockerConfig({
                        unlockDurationMinutes: Number.isNaN(next)
                          ? 1
                          : Math.min(240, Math.max(1, next)),
                      });
                    }}
                    aria-label="Unlock duration in minutes"
                    className="w-14 h-7 rounded-xl border border-border bg-background text-center font-bold text-foreground text-xs focus:outline-none focus:border-indigo-ai"
                  />
                  <p className="text-[10px] text-muted font-medium">min</p>
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

              {/* Session plan: one control for pool + new/review mix */}
              <div className="flex flex-col gap-2 px-3 py-2.5 bg-card">
                <div className="flex flex-col">
                  <span className="text-xs font-semibold text-foreground shrink-0">Session</span>
                  <span className="text-[9px] text-muted">What you study when blocked</span>
                </div>
                <SessionPlanPicker
                  studyMode={studyMode}
                  learningRatio={learningRatio}
                  onChange={(updates) => onUpdateAppBlockerConfig(updates)}
                />
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
