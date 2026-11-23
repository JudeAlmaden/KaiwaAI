import type { Card } from "./card-types";

export type StudyMode =
  | "due"           // Cards with nextReview in the past
  | "all"           // Study ahead (any cards)
  | "recent"        // Recently added (last 7 days)
  | "struggling"    // Low ease factor (<2.0) or many reviews
  | "leeches"       // Cards with 3+ lapses and interval <7 days
  | "new"
  | "custom";

export type CardDirection = "jp-to-en" | "en-to-jp" | "mixed";
export type ReviewType = "vocabulary" | "kanji" | "mixed";

export type Setup = {
  reviewType: ReviewType;
  studyMode: StudyMode;
  direction: CardDirection;
  practice: boolean; // if true, don't update SRS/mastery
  limit: number;
  isContinuous: boolean;
  activeLimit: number | "all";
  customCardIds?: string[];
  heisigLesson?: number;
  groupId?: string;
  groupName?: string;
  learningRatio?: number;
};

export type ActiveCard = Card & { _dir?: "jp-to-en" | "en-to-jp" };
export type { Card };
