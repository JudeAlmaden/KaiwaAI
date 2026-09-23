import type { ReviewSessionParams, SessionPreset } from "./types";

export interface PresetContext {
  dueCount?: number;
  groupId?: string;
  groupName?: string;
}

export const PRESET_DEFAULTS: Record<
  SessionPreset,
  (ctx?: PresetContext) => ReviewSessionParams
> = {
  daily: (ctx) => ({
    preset: "daily",
    studyMode: "due",
    contentType: "mixed",
    reviewType: "mixed",
    limit: Math.max(10, ctx?.dueCount ?? 10),
    activeLimit: 5,
    isContinuous: false,
  }),

  words: () => ({
    preset: "words",
    studyMode: "all",
    contentType: "vocabulary",
    reviewType: "vocabulary",
    direction: "mixed",
    limit: 15,
    activeLimit: 5,
    isContinuous: false,
  }),

  kanji: (ctx) => ({
    preset: "kanji",
    studyMode: "all",
    contentType: "kanji",
    reviewType: "kanji",
    limit: 50,
    activeLimit: 5,
    isContinuous: false,
    groupId: ctx?.groupId,
    groupName: ctx?.groupName,
  }),

  rescue: () => ({
    preset: "rescue",
    studyMode: "struggling",
    contentType: "mixed",
    reviewType: "mixed",
    limit: 30,
    activeLimit: 5,
    isContinuous: false,
  }),

  deep: () => ({
    preset: "deep",
    studyMode: "all",
    contentType: "mixed",
    reviewType: "mixed",
    limit: 200,
    activeLimit: 5,
    isContinuous: true,
  }),

  custom: () => ({
    preset: "custom",
    studyMode: "all",
    contentType: "mixed",
    reviewType: "mixed",
    direction: "mixed",
    limit: 20,
    activeLimit: 5,
    isContinuous: false,
  }),
};

export function buildPresetParams(
  preset: SessionPreset,
  ctx?: PresetContext,
  overrides?: Partial<ReviewSessionParams>
): ReviewSessionParams {
  return { ...PRESET_DEFAULTS[preset](ctx), ...overrides };
}
