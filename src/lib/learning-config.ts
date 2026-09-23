/**
 * User learning preferences (SRS/FSRS, review defaults).
 * Stored in localStorage; server endpoints may read via request headers or future profile sync.
 */

import type { EarlyReviewStrategy, FuriganaMode, ReviewDirection } from "./review/types";

export interface LearningConfig {
  desiredRetention: number;
  maxDailyReviews: number;
  maxNewCards: number;
  earlyReviewStrategy: EarlyReviewStrategy;
  defaultDirection: ReviewDirection;
  defaultFuriganaMode: FuriganaMode;
  defaultLearningRatio: number;
}

const STORAGE_KEY = "kaiwa.learning-config";

export const DEFAULT_LEARNING_CONFIG: LearningConfig = {
  desiredRetention: 0.9,
  maxDailyReviews: 50,
  maxNewCards: 20,
  earlyReviewStrategy: "proportional",
  defaultDirection: "mixed",
  defaultFuriganaMode: "always",
  defaultLearningRatio: 0.5,
};

function clampRetention(n: number): number {
  return Math.max(0.7, Math.min(0.98, n));
}

export function getLearningConfig(): LearningConfig {
  if (typeof window === "undefined") return DEFAULT_LEARNING_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_LEARNING_CONFIG;
    const parsed = JSON.parse(raw) as Partial<LearningConfig>;
    return {
      ...DEFAULT_LEARNING_CONFIG,
      ...parsed,
      desiredRetention: clampRetention(
        parsed.desiredRetention ?? DEFAULT_LEARNING_CONFIG.desiredRetention
      ),
      maxDailyReviews: Math.max(
        1,
        Math.min(500, parsed.maxDailyReviews ?? DEFAULT_LEARNING_CONFIG.maxDailyReviews)
      ),
      maxNewCards: Math.max(
        0,
        Math.min(200, parsed.maxNewCards ?? DEFAULT_LEARNING_CONFIG.maxNewCards)
      ),
      defaultLearningRatio: Math.max(
        0.1,
        Math.min(1, parsed.defaultLearningRatio ?? DEFAULT_LEARNING_CONFIG.defaultLearningRatio)
      ),
    };
  } catch {
    return DEFAULT_LEARNING_CONFIG;
  }
}

export function setLearningConfig(updates: Partial<LearningConfig>): LearningConfig {
  const next = { ...getLearningConfig(), ...updates };
  if (updates.desiredRetention !== undefined) {
    next.desiredRetention = clampRetention(updates.desiredRetention);
  }
  if (typeof window !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  }
  return next;
}

/** Server-side: read retention from env, falling back to default */
export function getServerDesiredRetention(): number {
  const env = process.env.FSRS_DESIRED_RETENTION;
  if (env) {
    const n = parseFloat(env);
    if (!isNaN(n)) return clampRetention(n);
  }
  return DEFAULT_LEARNING_CONFIG.desiredRetention;
}

/** Parse optional retention from review request query/body */
export function parseDesiredRetention(value: unknown): number | undefined {
  if (value === undefined || value === null) return undefined;
  const n = typeof value === "number" ? value : parseFloat(String(value));
  if (isNaN(n)) return undefined;
  return clampRetention(n);
}
