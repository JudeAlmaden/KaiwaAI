import { getLearningConfig } from "@/lib/learning-config";
import { projectSessionMix, type CompositionCounts, type DueCounts } from "./composition";
import { remainingDailyReviews } from "./daily-cap";

export type ProjectedMix = CompositionCounts & { total: number };

type CompositionPayload = {
  due?: DueCounts;
  intake?: { introducedToday?: number; inProgress?: number };
  reviewedToday?: number;
};

/**
 * The session the Daily Quest will actually open, using this device's Learning
 * defaults. Nav badge, home quest, and the review page all show this total so
 * they cannot disagree with the 0/N progress once a session starts.
 */
export async function fetchProjectedMix(): Promise<ProjectedMix | null> {
  const res = await fetch("/api/review/composition");
  if (!res.ok) return null;
  const data = (await res.json()) as CompositionPayload;
  if (!data.due) return null;

  const cfg = getLearningConfig();
  return projectSessionMix(data.due, {
    learningRatio: cfg.defaultLearningRatio,
    maxNewCards: cfg.maxNewCards,
    maxNewPerSession: cfg.newPerSession,
    maxReviews: remainingDailyReviews(cfg.maxDailyReviews, data.reviewedToday ?? 0),
    introducedToday: data.intake?.introducedToday ?? 0,
    inProgress: data.intake?.inProgress ?? 0,
    maxLearningPool: cfg.maxLearningPool,
  });
}
