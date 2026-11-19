import { setLearningConfig, type LearningConfig } from "@/lib/learning-config";
import type { AppBlockerConfig } from "@/plugins/app-blocker/definitions";

/**
 * Direction, review mix, furigana and early-review strategy are owned by both
 * the Learning tab and Focus Guard. Each surface used to write only its own
 * copy, so changing one left the other showing a stale value that the session
 * might then use. Both writers now mirror into the other store.
 */
export function blockerUpdatesForLearningDefaults(
  updates: Partial<LearningConfig>
): Partial<AppBlockerConfig> {
  const out: Partial<AppBlockerConfig> = {};

  if (updates.defaultFuriganaMode !== undefined) {
    out.furiganaMode = updates.defaultFuriganaMode;
    out.showFurigana = updates.defaultFuriganaMode !== "never";
  }
  if (updates.defaultDirection !== undefined) {
    out.direction = updates.defaultDirection;
  }
  if (updates.defaultLearningRatio !== undefined) {
    out.learningRatio = updates.defaultLearningRatio;
  }
  if (updates.earlyReviewStrategy !== undefined) {
    out.earlyReviewStrategy = updates.earlyReviewStrategy;
  }

  return out;
}

export function learningDefaultsForBlocker(
  update: Partial<AppBlockerConfig>
): Partial<LearningConfig> {
  const out: Partial<LearningConfig> = {};

  if (update.direction !== undefined) out.defaultDirection = update.direction;
  if (update.learningRatio !== undefined) out.defaultLearningRatio = update.learningRatio;
  if (update.earlyReviewStrategy !== undefined) {
    out.earlyReviewStrategy = update.earlyReviewStrategy;
  }
  if (update.furiganaMode !== undefined) out.defaultFuriganaMode = update.furiganaMode;

  return out;
}

/** Focus Guard edit → the Learning config, so the other tab agrees. */
export function mirrorBlockerDefaultsToLearning(update: Partial<AppBlockerConfig>): void {
  const patch = learningDefaultsForBlocker(update);
  if (Object.keys(patch).length > 0) setLearningConfig(patch);
}
