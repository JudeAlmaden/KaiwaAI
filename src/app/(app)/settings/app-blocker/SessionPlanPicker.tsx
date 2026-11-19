'use client';

import type { BlockerStudyMode } from '@/plugins/app-blocker/definitions';
import {
  CUSTOM_PLAN_ID,
  DEFAULT_LEARNING_RATIO,
  SESSION_PLANS,
  getPlan,
  resolvePlan,
} from '@/lib/review/session-plan';

/** Kept reachable so a legacy `recent` config stays editable. */
const POOL_OPTIONS: { id: BlockerStudyMode; label: string; hint: string }[] = [
  { id: 'due', label: 'Due', hint: 'SRS scheduled now' },
  { id: 'all', label: 'All', hint: 'Any card (study ahead)' },
  { id: 'recent', label: 'Recent', hint: 'Added in 7 days' },
  { id: 'struggling', label: 'Struggling', hint: 'Low ease / hard cards' },
  { id: 'leeches', label: 'Leeches', hint: 'Stuck on short intervals' },
];

const RATIO_OPTIONS: { ratio: number; label: string }[] = [
  { ratio: 0, label: 'Reviews' },
  { ratio: 0.2, label: '20%' },
  { ratio: 0.5, label: '50%' },
  { ratio: 0.7, label: '70%' },
  { ratio: 1, label: 'All new' },
];

function chipClass(active: boolean): string {
  return `px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer ${
    active
      ? 'bg-indigo-ai text-white'
      : 'border border-border bg-background text-muted hover:text-foreground'
  }`;
}

function currentRatio(learningRatio?: number): number {
  return typeof learningRatio === 'number' && !Number.isNaN(learningRatio)
    ? learningRatio
    : DEFAULT_LEARNING_RATIO;
}

/** Same comparison `resolvePlan` uses, so the highlighted chip can't disagree. */
function sameRatio(a: number, b: number): boolean {
  return Math.round(a * 100) === Math.round(b * 100);
}

export interface SessionPlanPickerProps {
  studyMode: BlockerStudyMode;
  learningRatio?: number;
  onChange: (updates: { studyMode: BlockerStudyMode; learningRatio: number }) => void;
}

/**
 * One control for what a review session is: the old Pool + Focus pair folded
 * into named plans. Selecting a plan still writes the same `studyMode` and
 * `learningRatio` the routes already understand.
 */
export default function SessionPlanPicker({
  studyMode,
  learningRatio,
  onChange,
}: SessionPlanPickerProps) {
  const activeId = resolvePlan(studyMode, learningRatio);
  const activePlan = getPlan(activeId);
  const ratio = currentRatio(learningRatio);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-1">
        {SESSION_PLANS.map((plan) => (
          <button
            key={plan.id}
            type="button"
            title={plan.hint}
            aria-pressed={plan.id === activeId}
            onClick={() =>
              onChange({ studyMode: plan.studyMode, learningRatio: plan.learningRatio })
            }
            className={chipClass(plan.id === activeId)}
          >
            {plan.label}
          </button>
        ))}
        {activeId === CUSTOM_PLAN_ID && (
          <span className="px-2.5 py-1 rounded-lg text-[11px] font-bold border border-amber-500/40 bg-amber-500/10 text-amber-600">
            Custom
          </span>
        )}
      </div>

      <p className="text-[10px] text-muted">
        {activePlan
          ? activePlan.hint
          : 'Custom mix — fine-tune the pool and the new-card share below.'}
      </p>

      {activeId === CUSTOM_PLAN_ID && (
        <div className="space-y-2 rounded-2xl border border-border bg-background/60 p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
              Pool
            </span>
            <div className="flex flex-wrap justify-end gap-1">
              {POOL_OPTIONS.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  title={option.hint}
                  aria-pressed={studyMode === option.id}
                  onClick={() => onChange({ studyMode: option.id, learningRatio: ratio })}
                  className={chipClass(studyMode === option.id)}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-2">
            <span className="text-[10px] font-semibold text-muted uppercase tracking-wider">
              New vs review
            </span>
            <div className="flex flex-wrap justify-end gap-1">
              {RATIO_OPTIONS.map((option) => (
                <button
                  key={option.ratio}
                  type="button"
                  aria-pressed={sameRatio(ratio, option.ratio)}
                  onClick={() => onChange({ studyMode, learningRatio: option.ratio })}
                  className={chipClass(sameRatio(ratio, option.ratio))}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
