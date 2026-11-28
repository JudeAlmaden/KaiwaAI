"use client";

import { useState } from "react";
import {
  getLearningConfig,
  setLearningConfig,
  type LearningConfig,
} from "@/lib/learning-config";
import { Surface } from "../ui";

export default function FsrsSettingsCard() {
  const [config, setConfig] = useState<LearningConfig>(() => getLearningConfig());

  function patch(updates: Partial<LearningConfig>) {
    const next = setLearningConfig(updates);
    setConfig(next);
  }

  const retentionPct = Math.round(config.desiredRetention * 100);

  return (
    <Surface>
      <h2 className="font-display text-lg font-bold">Spaced repetition (FSRS)</h2>
      <p className="mt-1 text-sm text-muted">
        Controls how often cards come back for review. Applies to every graded
        review — retention and how early passes are credited.
      </p>

      <div className="mt-5 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <p className="text-sm font-bold">Retention target</p>
          <span className="text-sm font-bold text-indigo-ai tabular-nums">{retentionPct}%</span>
        </div>
        <input
          type="range"
          min={70}
          max={98}
          value={retentionPct}
          onChange={(e) => patch({ desiredRetention: Number(e.target.value) / 100 })}
          className="w-full accent-indigo-ai"
        />
        <p className="text-xs text-muted">
          Higher = more reviews and stronger recall. Lower = fewer reviews, more forgetting.
        </p>
      </div>

      <p className="mt-4 border-t-2 border-border pt-4 text-xs text-muted">
        Early reviews earn reduced credit but never shorten a card&apos;s interval.
      </p>
    </Surface>
  );
}
