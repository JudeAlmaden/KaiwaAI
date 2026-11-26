'use client';

import { CaretDown } from '@phosphor-icons/react';
import type { BlockerStudyMode } from '@/plugins/app-blocker/definitions';
import {
  CUSTOM_PLAN_ID,
  SESSION_PLANS,
  getPlan,
  resolvePlan,
  type SessionPlanId,
} from '@/lib/review/session-plan';

export interface SessionPlanPickerProps {
  studyMode: BlockerStudyMode;
  learningRatio?: number;
  onChange: (updates: { studyMode: BlockerStudyMode; learningRatio: number }) => void;
}

/**
 * Dropdown selector for Focus Guard session plans. Keeps the control on one
 * clean line and displays the selected plan's ratio badge and definition below.
 */
export default function SessionPlanPicker({
  studyMode,
  learningRatio,
  onChange,
}: SessionPlanPickerProps) {
  const activeId = resolvePlan(studyMode, learningRatio);
  const activePlan = getPlan(activeId);

  function handleSelect(id: SessionPlanId) {
    const plan = getPlan(id);
    if (plan) {
      onChange({ studyMode: plan.studyMode, learningRatio: plan.learningRatio });
    }
  }

  return (
    <div className="space-y-2.5">
      <div className="relative">
        <select
          value={activeId}
          onChange={(e) => handleSelect(e.target.value as SessionPlanId)}
          aria-label="Session plan"
          className="w-full appearance-none rounded-xl border border-border bg-background px-3 py-2 pr-8 text-xs font-bold text-foreground focus:border-indigo-ai focus:outline-none cursor-pointer"
        >
          {activeId === CUSTOM_PLAN_ID && (
            <option value={CUSTOM_PLAN_ID} disabled>
              Custom (legacy) — choose a plan
            </option>
          )}
          {SESSION_PLANS.map((plan) => (
            <option key={plan.id} value={plan.id}>
              {plan.label} ({plan.badge})
            </option>
          ))}
        </select>
        <CaretDown
          size={14}
          weight="bold"
          className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-muted"
        />
      </div>

      {activePlan ? (
        <div className="rounded-xl border border-indigo-ai/20 bg-indigo-ai/5 px-3 py-2 space-y-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-foreground">
              {activePlan.label}
            </span>
            <span className="px-2 py-0.5 rounded-md bg-indigo-ai/15 text-indigo-ai text-[10px] font-extrabold">
              {activePlan.badge}
            </span>
          </div>
          <p className="text-[11px] text-muted leading-relaxed">
            {activePlan.hint}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border bg-background/60 px-3 py-2 space-y-1">
          <p className="text-[11px] font-semibold text-foreground">
            Select a plan from the dropdown above
          </p>
          <p className="text-[10px] text-muted leading-relaxed">
            Currently using a legacy custom mix. Choosing any plan updates your Focus Guard deck.
          </p>
        </div>
      )}
    </div>
  );
}
