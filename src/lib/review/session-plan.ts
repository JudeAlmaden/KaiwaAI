import type { BlockerStudyMode } from "@/plugins/app-blocker/definitions";

/**
 * User-facing review plans for Focus Guard (app interception).
 *
 * "Pool" (which cards) and "Focus" (new vs review share) used to be two
 * independent controls: 5 × 5 combinations, most of which nobody can describe
 * and several of which the session composer makes indistinguishable anyway
 * (`Due` + `All New` degrades into `Due` + `50/50` once the new-card quota runs
 * out, because the spare slots are filled with reviews).
 *
 * A plan names one intent and pins both values. The underlying config
 * (`studyMode` + `learningRatio`) is unchanged, so saved settings, the native
 * plugin config and the review API keep working as-is; `resolvePlan` maps any
 * legacy pair back to a plan, or to `custom`.
 */
export type SessionPlanId =
  | "due-reviews"
  | "gentle"
  | "due-new"
  | "ahead"
  | "weak"
  | "leeches"
  | "custom";

export interface SessionPlan {
  id: SessionPlanId;
  label: string;
  hint: string;
  studyMode: BlockerStudyMode;
  learningRatio: number;
}

export const SESSION_PLANS: SessionPlan[] = [
  {
    id: "due-reviews",
    label: "Due reviews",
    hint: "Only cards the SRS says are due now — no new words.",
    studyMode: "due",
    learningRatio: 0,
  },
  {
    id: "gentle",
    label: "Gentle",
    hint: "Due reviews plus 1–2 new words.",
    studyMode: "due",
    learningRatio: 0.2,
  },
  {
    id: "due-new",
    label: "Due + new",
    hint: "Half due reviews, half new or weak cards.",
    studyMode: "due",
    learningRatio: 0.5,
  },
  {
    id: "ahead",
    label: "Study ahead",
    hint: "Half reviews taken before their due date, half new cards.",
    studyMode: "all",
    learningRatio: 0.5,
  },
  {
    id: "weak",
    label: "Weak cards",
    hint: "High-difficulty cards — repair them before they lapse.",
    studyMode: "struggling",
    learningRatio: 0,
  },
  {
    id: "leeches",
    label: "Leeches",
    hint: "Reviewed 8+ times but still back within a week.",
    studyMode: "leeches",
    learningRatio: 0,
  },
];

/** Shown when a saved config matches no plan (legacy or hand-tuned values). */
export const CUSTOM_PLAN_ID: SessionPlanId = "custom";

/** Matches the composer's own default when `learningRatio` is missing. */
export const DEFAULT_LEARNING_RATIO = 0.5;

export function getPlan(id: SessionPlanId): SessionPlan | undefined {
  return SESSION_PLANS.find((plan) => plan.id === id);
}

export function resolvePlan(
  studyMode: BlockerStudyMode | undefined | null,
  learningRatio?: number | null
): SessionPlanId {
  if (!studyMode) return CUSTOM_PLAN_ID;

  // Struggling/leeches review routes ignore the ratio entirely (they take a
  // plain ordered slice), so every ratio means the same session there.
  if (studyMode === "struggling") return "weak";
  if (studyMode === "leeches") return "leeches";

  const ratio =
    typeof learningRatio === "number" && !Number.isNaN(learningRatio)
      ? learningRatio
      : DEFAULT_LEARNING_RATIO;

  // Percent comparison, not an epsilon: 0.5 - 0.45 is 0.049999… in floating
  // point, so a tolerance silently swallowed neighbouring values.
  const ratioPercent = Math.round(ratio * 100);
  const match = SESSION_PLANS.find(
    (plan) =>
      plan.studyMode === studyMode && Math.round(plan.learningRatio * 100) === ratioPercent
  );

  // Anything else (due 0.7, all 0, recent 0.5, …) is a hand-tuned custom mix.
  return match ? match.id : CUSTOM_PLAN_ID;
}

/** The config pair a plan writes; `null` for the custom pseudo-plan. */
export function planConfig(
  id: SessionPlanId
): { studyMode: BlockerStudyMode; learningRatio: number } | null {
  const plan = getPlan(id);
  return plan ? { studyMode: plan.studyMode, learningRatio: plan.learningRatio } : null;
}
