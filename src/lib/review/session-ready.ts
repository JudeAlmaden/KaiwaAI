import { getLearningConfig } from "@/lib/learning-config";
import { projectSessionMix, type CompositionCounts, type DueCounts } from "./composition";

export type ProjectedMix = CompositionCounts & {
  total: number;
  /** Kanji-only due count (new + review), straight from the composition API. */
  kanjiDue: number;
};

type CompositionPayload = {
  due?: DueCounts;
  intake?: { inProgress?: number };
  kanji?: { new: number; review: number };
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
  const mix = projectSessionMix(data.due, {
    learningRatio: cfg.defaultLearningRatio,
    maxNewPerSession: cfg.newPerSession,
    inProgress: data.intake?.inProgress ?? 0,
    maxLearningPool: cfg.maxLearningPool,
  });
  const kanjiDue = (data.kanji?.new ?? 0) + (data.kanji?.review ?? 0);
  return { ...mix, kanjiDue };
}
