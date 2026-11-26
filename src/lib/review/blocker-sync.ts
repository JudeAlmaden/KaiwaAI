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
  // defaultLearningRatio is intentionally NOT synced to the app blocker.
  // Focus Guard has its own named session plan picker (Reviews Only, Casual Drip,
  // Active Intake, All New) which owns the learningRatio there. Syncing from the
  // global default would silently overwrite the plan the user chose in Focus Guard.
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
  // learningRatio is intentionally NOT mirrored back: Focus Guard owns that
  // value through its session plan picker, not from the Learning defaults.
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
