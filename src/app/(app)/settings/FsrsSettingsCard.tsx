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
        Controls how often cards come back for review. Applies to new reviews once
        scheduling runs on the server.
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

      <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-4 border-t-2 border-border pt-4">
        <label className="space-y-1">
          <span className="text-sm font-bold">Max daily reviews</span>
          <input
            type="number"
            min={1}
            max={500}
            value={config.maxDailyReviews}
            onChange={(e) =>
              patch({ maxDailyReviews: Math.max(1, Number(e.target.value) || 1) })
            }
            className="w-full rounded-2xl border-2 border-border bg-background px-3 py-2 text-sm"
          />
        </label>
        <label className="space-y-1">
          <span className="text-sm font-bold">Max new cards / day</span>
          <input
            type="number"
            min={0}
            max={200}
            value={config.maxNewCards}
            onChange={(e) =>
              patch({ maxNewCards: Math.max(0, Number(e.target.value) || 0) })
            }
            className="w-full rounded-2xl border-2 border-border bg-background px-3 py-2 text-sm"
          />
        </label>
      </div>

      <div className="mt-5 border-t-2 border-border pt-4 space-y-2">
        <p className="text-sm font-bold">Early review (before due)</p>
        <div className="flex flex-wrap gap-2">
          {(
            [
              { id: "practice" as const, label: "Practice — don’t change intervals" },
              { id: "proportional" as const, label: "Proportional — adjust by how early" },
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              onClick={() => patch({ earlyReviewStrategy: opt.id })}
              className={`rounded-2xl px-3 py-2 text-xs font-bold border-2 transition ${
                config.earlyReviewStrategy === opt.id
                  ? "border-indigo-ai bg-indigo-ai/10 text-indigo-ai"
                  : "border-border text-muted hover:text-foreground"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>
    </Surface>
  );
}
