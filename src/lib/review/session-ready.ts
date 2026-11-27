import { getLearningConfig } from "@/lib/learning-config";
import { projectQuestDelivery, type DueCounts } from "./composition";

/** Both quests launch due sessions capped at 50 cards. */
const QUEST_LIMIT = 50;

export type ProjectedMix = {
  /**
   * Cards the two review quests can hand over right now — the Daily Quest plus
   * the Kanji Quest. Every global number (nav badge, home "due" pill, Today's
   * Quest line) reads this, so it is always the sum of the two quest cards.
   */
  readyTotal: number;
  /** Deliverable split behind readyTotal, for the "3 new · 2 review" subtitle. */
  readyNew: number;
  readyReview: number;
  /** What the Daily Quest (vocabulary) can serve now. */
  dailyDue: number;
  /** What the Kanji Quest can serve now. */
  kanjiDue: number;
};

type CompositionPayload = {
  due?: DueCounts;
  vocab?: { new?: number; review?: number };
  kanji?: { new?: number; review?: number };
  intake?: { inProgress?: number };
};

/**
 * One rule for every count: it reports cards a session can hand over now.
 * Each quest is projected on its own deck with this device's Learning defaults
 * (per-session new-card drip, in-progress learning cap, quest card limit), and
 * the global total is exactly the sum of the two quest cards — never the raw
 * scheduled due pool, which includes cards a session will withhold.
 */
export async function fetchProjectedMix(): Promise<ProjectedMix | null> {
  const res = await fetch("/api/review/composition");
  if (!res.ok) return null;
  const data = (await res.json()) as CompositionPayload;
  if (!data.due) return null;

  const cfg = getLearningConfig();
  const options = {
    maxNewPerSession: cfg.newPerSession,
    maxReviews: QUEST_LIMIT,
    inProgress: data.intake?.inProgress ?? 0,
    maxLearningPool: cfg.maxLearningPool,
  };

  const vocab = projectQuestDelivery(
    { new: data.vocab?.new ?? 0, review: data.vocab?.review ?? 0 },
    options
  );
  const kanji = projectQuestDelivery(
    { new: data.kanji?.new ?? 0, review: data.kanji?.review ?? 0 },
    options
  );

  return {
    readyTotal: vocab.total + kanji.total,
    readyNew: vocab.new + kanji.new,
    readyReview: vocab.review + kanji.review,
    dailyDue: vocab.total,
    kanjiDue: kanji.total,
  };
}
