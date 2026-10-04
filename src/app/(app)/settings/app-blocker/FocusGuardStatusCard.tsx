'use client';

import { useState, useEffect } from 'react';
import Kai from '@/app/Kai';
import { ShieldWarning, Sliders, ArrowsClockwise, CheckCircle, XCircle } from '@phosphor-icons/react';
import type { BlockerStudyMode, BlockerNoDueAction } from '@/plugins/app-blocker/definitions';
import InterceptionRulesModal from './InterceptionRulesModal';

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
    learningRatio?: number;
    noDueAction?: BlockerNoDueAction;
    earlyReviewStrategy?: 'practice' | 'proportional';
  }) => void;
}

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
      <InterceptionRulesModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        count={flashcardCount}
        blockChance={blockChance}
        unlockDurationMinutes={unlockDurationMinutes}
        reviewType={reviewType as 'mixed' | 'vocabulary' | 'kanji'}
        direction={direction as 'jp-to-en' | 'en-to-jp' | 'mixed'}
        studyMode={studyMode}
        practice={practice}
        learningRatio={learningRatio}
        noDueAction={noDueAction}
        onUpdateAppBlockerConfig={(updates) => {
          if (updates.count !== undefined) {
            onUpdateFlashcardCount(updates.count);
          }
          onUpdateAppBlockerConfig?.(updates);
        }}
      />
    </>
  );
}
