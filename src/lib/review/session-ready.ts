import { getLearningConfig } from "@/lib/learning-config";
import { isLearningPoolFull, type IntakePauseReason } from "./intake";
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
  /**
   * Why a quest is short of new cards, in words a card can show. Null unless
   * that deck is at its in-progress learning cap — the reason a quest can read
   * "nothing due" while new cards are sitting right there.
   */
  vocabPauseNote: string | null;
  kanjiPauseNote: string | null;
};

type CompositionPayload = {
  due?: DueCounts;
  vocab?: { new?: number; review?: number };
  kanji?: { new?: number; review?: number };
  intake?: {
    inProgress?: number;
    vocabInProgress?: number;
    kanjiInProgress?: number;
  };
};

/** One line a quest card can show when this deck's intake is paused. */
function pauseNote(
  deck: "vocabulary" | "kanji",
  inProgress: number,
  cap: number,
  reason: IntakePauseReason
): string | null {
  if (reason === "off") return "New cards are off in Settings → Review defaults.";
  if (reason !== "learning-pool") return null;
  return `New ${deck} cards paused — ${inProgress} of ${cap} in progress. Raise the cap in Settings → Review defaults.`;
}

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
  // Per deck: each quest is gated by its own in-progress pile, not the sum.
  const vocabInProgress = data.intake?.vocabInProgress ?? data.intake?.inProgress ?? 0;
  const kanjiInProgress = data.intake?.kanjiInProgress ?? 0;
  const base = {
    maxNewPerSession: cfg.newPerSession,
    maxReviews: QUEST_LIMIT,
    maxLearningPool: cfg.maxLearningPool,
  };

  const vocab = projectQuestDelivery(
    { new: data.vocab?.new ?? 0, review: data.vocab?.review ?? 0 },
    { ...base, inProgress: vocabInProgress }
  );
  const kanji = projectQuestDelivery(
    { new: data.kanji?.new ?? 0, review: data.kanji?.review ?? 0 },
    { ...base, inProgress: kanjiInProgress }
  );

  const vocabPaused = isLearningPoolFull({
    inProgress: vocabInProgress,
    maxLearningPool: cfg.maxLearningPool,
  });
  const kanjiPaused = isLearningPoolFull({
    inProgress: kanjiInProgress,
    maxLearningPool: cfg.maxLearningPool,
  });

  return {
    readyTotal: vocab.total + kanji.total,
    readyNew: vocab.new + kanji.new,
    readyReview: vocab.review + kanji.review,
    dailyDue: vocab.total,
    kanjiDue: kanji.total,
    vocabPauseNote: pauseNote(
      "vocabulary",
      vocabInProgress,
      cfg.maxLearningPool,
      vocabPaused ? "learning-pool" : cfg.newPerSession <= 0 ? "off" : "ready"
    ),
    kanjiPauseNote: pauseNote(
      "kanji",
      kanjiInProgress,
      cfg.maxLearningPool,
      kanjiPaused ? "learning-pool" : cfg.newPerSession <= 0 ? "off" : "ready"
    ),
  };
}
