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
  | "reviews-only"
  | "casual-drip"
  | "active-intake"
  | "all-new"
  | "trouble-spots"
  | "custom";

export interface SessionPlan {
  id: SessionPlanId;
  label: string;
  badge: string;
  hint: string;
  studyMode: BlockerStudyMode;
  learningRatio: number;
}

export const SESSION_PLANS: SessionPlan[] = [
  {
    id: "reviews-only",
    label: "Reviews Only",
    badge: "100% Reviews",
    hint: "Keep what you know fresh. Only due reviews are shown; no new words are introduced.",
    studyMode: "due",
    learningRatio: 0,
  },
  {
    id: "casual-drip",
    label: "Casual Drip",
    badge: "80% Reviews · 20% New",
    hint: "Mostly due reviews, with 1–2 new words mixed in for effortless passive learning.",
    studyMode: "due",
    learningRatio: 0.2,
  },
  {
    id: "active-intake",
    label: "Active Intake",
    badge: "50% Reviews · 50% New",
    hint: "An even split of due reviews and brand-new words to expand your vocabulary faster.",
    studyMode: "due",
    learningRatio: 0.5,
  },
  {
    id: "all-new",
    label: "All New",
    badge: "100% New",
    hint: "Focus purely on unstudied cards from your deck (falls back to reviews if quota is met).",
    studyMode: "due",
    learningRatio: 1,
  },
  {
    id: "trouble-spots",
    label: "Trouble Spots",
    badge: "Missed 3+ times",
    hint: "Targets stubborn cards you've stumbled on 3 or more times with short intervals.",
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

  // The trouble-spots (leeches) route ignores the ratio entirely (it takes a
  // plain ordered slice), so every ratio means the same session there.
  if (studyMode === "leeches") return "trouble-spots";

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
