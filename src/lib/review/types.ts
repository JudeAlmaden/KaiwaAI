/** Shared review session type definitions */

export type ContentType = "vocabulary" | "kanji" | "mixed";
export type StudyPool = "due" | "all" | "recent" | "struggling" | "leeches" | "new" | "custom";
export type ReviewDirection = "jp-to-en" | "en-to-jp" | "mixed";
export type EarlyReviewStrategy = "practice" | "proportional";
export type FuriganaMode = "always" | "learning_only" | "never";

export type SessionPreset =
  | "daily"
  | "words"
  | "kanji"
  | "rescue"
  | "deep"
  | "custom";

/** Params passed from quest gallery → ReviewClient */
export interface ReviewSessionParams {
  preset?: SessionPreset;
  studyMode: StudyPool;
  contentType?: ContentType;
  /** @deprecated use contentType */
  reviewType?: ContentType;
  direction?: ReviewDirection;
  limit?: number;
  activeLimit?: number;
  isContinuous?: boolean;
  groupId?: string;
  groupName?: string;
  customCardIds?: string[];
  practice?: boolean;
}

export function resolveContentType(params: ReviewSessionParams): ContentType {
  return params.contentType ?? params.reviewType ?? "mixed";
}
