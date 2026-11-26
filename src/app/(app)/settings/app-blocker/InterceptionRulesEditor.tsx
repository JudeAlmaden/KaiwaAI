"use client";

import type { ReactNode } from "react";
import type {
  BlockerNoDueAction,
  BlockerStudyMode,
} from "@/plugins/app-blocker/definitions";
import type { ContentType, EarlyReviewStrategy, ReviewDirection } from "@/lib/review/types";
import { getLearningConfig } from "@/lib/learning-config";
import SessionPlanPicker from "./SessionPlanPicker";

export interface InterceptionRulesState {
  count: number;
  blockChance: number;
  unlockDurationMinutes: number;
  reviewType: ContentType;
  direction: ReviewDirection;
  studyMode: BlockerStudyMode;
  practice: boolean;
  noDueAction: BlockerNoDueAction;
  earlyReviewStrategy: EarlyReviewStrategy;
  learningRatio?: number;
  useReviewDefaults?: boolean;
}

type InterceptionRulesEditorProps = {
  values: InterceptionRulesState;
  onChange: (updates: Partial<InterceptionRulesState>) => void;
  showUseDefaultsToggle?: boolean;
  onCountChange?: (count: number) => void;
};

function Segmented({
  active,
  onClick,
  children,
  className = "",
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`px-2.5 py-1 rounded-xl text-[11px] font-bold transition ${
        active
          ? "bg-indigo-ai text-white"
          : "border border-border bg-background text-muted hover:text-foreground"
      } ${className}`}
    >
      {children}
    </button>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <span className="text-[11px] font-bold text-muted uppercase tracking-wider block">
      {children}
    </span>
  );
}

export default function InterceptionRulesEditor({
  values,
  onChange,
  showUseDefaultsToggle = true,
  onCountChange,
}: InterceptionRulesEditorProps) {
  const setCount = (n: number) => {
    onCountChange?.(n);
    onChange({ count: n });
  };

  function applyReviewDefaults() {
    const cfg = getLearningConfig();
    onChange({
      useReviewDefaults: true,
      direction: cfg.defaultDirection,
      earlyReviewStrategy: cfg.earlyReviewStrategy,
      learningRatio: cfg.defaultLearningRatio,
    });
  }

  return (
    <div className="space-y-5">
      {showUseDefaultsToggle && (
        <div className="flex items-center justify-between gap-3 rounded-2xl border-2 border-border bg-background/80 p-3">
          <div>
            <p className="text-xs font-bold text-foreground">Use my review defaults</p>
            <p className="text-[10px] text-muted">
              Direction, mix, and early-review from Learning settings
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              values.useReviewDefaults
                ? onChange({ useReviewDefaults: false })
                : applyReviewDefaults()
            }
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
              values.useReviewDefaults
                ? "bg-indigo-ai text-white"
                : "border border-border text-muted"
            }`}
          >
            {values.useReviewDefaults ? "On" : "Off"}
          </button>
        </div>
      )}

      <div className="space-y-3">
        <SectionTitle>When you&apos;re blocked</SectionTitle>

        <div className="space-y-2">
          <SectionTitle>Cards required</SectionTitle>
          <div className="flex flex-wrap gap-1">
            {[5, 10, 15, 20].map((preset) => (
              <Segmented
                key={preset}
                active={values.count === preset}
                onClick={() => setCount(preset)}
              >
                {preset}
              </Segmented>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <SectionTitle>Block chance</SectionTitle>
            <div className="flex flex-wrap gap-1">
              {[25, 50, 75, 100].map((pct) => (
                <Segmented
                  key={pct}
                  active={values.blockChance === pct}
                  onClick={() => onChange({ blockChance: pct })}
                  className="flex-1 text-center"
                >
                  {pct}%
                </Segmented>
              ))}
            </div>
          </div>
          <div className="space-y-1.5">
            <SectionTitle>Unlock grace</SectionTitle>
            <div className="flex flex-wrap gap-1">
              {[5, 15, 30, 60].map((mins) => (
                <Segmented
                  key={mins}
                  active={values.unlockDurationMinutes === mins}
                  onClick={() => onChange({ unlockDurationMinutes: mins })}
                  className="flex-1 text-center"
                >
                  {mins}m
                </Segmented>
              ))}
            </div>
          </div>
        </div>

      </div>

      <div className="space-y-3 border-t border-border pt-4">
        <SectionTitle>What you study</SectionTitle>

        <div className="space-y-2">
          <SectionTitle>Content</SectionTitle>
          <div className="flex flex-wrap gap-1">
            {(["mixed", "vocabulary", "kanji"] as const).map((type) => (
              <Segmented
                key={type}
                active={values.reviewType === type}
                onClick={() => onChange({ reviewType: type })}
              >
                {type === "vocabulary" ? "Vocab" : type.charAt(0).toUpperCase() + type.slice(1)}
              </Segmented>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <SectionTitle>Direction</SectionTitle>
          <div className="flex flex-wrap gap-1">
            {(["jp-to-en", "en-to-jp", "mixed"] as const).map((dir) => (
              <Segmented
                key={dir}
                active={values.direction === dir}
                onClick={() => onChange({ direction: dir, useReviewDefaults: false })}
              >
                {dir === "jp-to-en" ? "JP → EN" : dir === "en-to-jp" ? "EN → JP" : "Mix"}
              </Segmented>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <SectionTitle>Session</SectionTitle>
          <SessionPlanPicker
            studyMode={values.studyMode}
            learningRatio={values.learningRatio}
            onChange={(updates) => onChange({ ...updates, useReviewDefaults: false })}
          />
        </div>

        <div className="space-y-1.5">
          <SectionTitle>Early review strategy</SectionTitle>
          <div className="flex gap-1.5">
            <Segmented
              active={values.earlyReviewStrategy === "practice"}
              onClick={() =>
                onChange({ earlyReviewStrategy: "practice", useReviewDefaults: false })
              }
              className="flex-1 py-1.5 text-xs"
            >
              Practice
            </Segmented>
            <Segmented
              active={values.earlyReviewStrategy === "proportional"}
              onClick={() =>
                onChange({ earlyReviewStrategy: "proportional", useReviewDefaults: false })
              }
              className="flex-1 py-1.5 text-xs"
            >
              Proportional
            </Segmented>
          </div>
        </div>
      </div>
    </div>
  );
}
