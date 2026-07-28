export type CustomSessionFormValues = {
  reviewType: "mixed" | "vocabulary" | "kanji";
  studyMode: "all" | "struggling" | "due" | "new" | "custom";
  direction: "jp-to-en" | "en-to-jp" | "mixed";
  limit: number;
  isContinuous: boolean;
  activeLimit: number;
};

export function buildCustomSessionStartParams(values: CustomSessionFormValues) {
  const safeLimit = Math.max(1, Math.min(200, values.limit || 1));
  const safeActiveLimit = Math.max(1, Math.min(20, values.activeLimit || 1));

  return {
    studyMode: values.studyMode,
    limit: safeLimit,
    isContinuous: values.isContinuous,
    reviewType: values.reviewType,
    direction: values.direction,
    activeLimit: safeActiveLimit,
  };
}
