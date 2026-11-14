"use client";

import { useEffect, useState } from "react";
import {
  getLearningConfig,
  setLearningConfig,
  type LearningConfig,
} from "@/lib/learning-config";
import type { FuriganaMode, ReviewDirection } from "@/lib/review/types";
import { describeIntake } from "@/lib/review/intake";
import { getAutoSaveWords, setAutoSaveWords } from "@/lib/model-config";
import { AppBlocker } from "@/plugins/app-blocker";
import { Chip, Surface, Toggle } from "../ui";

const DIRECTIONS: { id: ReviewDirection; label: string }[] = [
  { id: "jp-to-en", label: "JP → EN" },
  { id: "en-to-jp", label: "EN → JP" },
  { id: "mixed", label: "Mix" },
];

const FURIGANA: { id: FuriganaMode; label: string }[] = [
  { id: "always", label: "Always" },
  { id: "learning_only", label: "Smart" },
  { id: "never", label: "Off" },
];

const LEARNING_POOLS: { value: number; label: string }[] = [
  { value: 10, label: "10" },
  { value: 15, label: "15" },
  { value: 20, label: "20" },
  { value: 30, label: "30" },
  { value: 0, label: "All" },
];

const NEW_PER_SESSION: { value: number; label: string }[] = [
  { value: 0, label: "Off" },
  { value: 1, label: "1" },
  { value: 2, label: "2" },
  { value: 3, label: "3" },
  { value: 5, label: "5" },
];

const LEARNING_RATIOS: { value: number; label: string }[] = [
  { value: 0.0, label: "Reviews only" },
  { value: 0.2, label: "20% new" },
  { value: 0.5, label: "50/50" },
  { value: 0.7, label: "70% new" },
];

type IntakeCounts = { inProgress: number; introducedToday: number };

export default function ReviewDefaultsCard() {
  const [config, setConfig] = useState<LearningConfig>(() => getLearningConfig());
  const [autoSave, setAutoSave] = useState<boolean>(() => getAutoSaveWords());
  const [counts, setCounts] = useState<IntakeCounts | null>(null);

  // Real counts for the "why are new cards paused" line. Best-effort: the card
  // still works when the request fails.
  useEffect(() => {
    let cancelled = false;
    fetch("/api/review/composition")
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (cancelled || !d?.intake) return;
        setCounts({
          inProgress: Number(d.intake.inProgress) || 0,
          introducedToday: Number(d.intake.introducedToday) || 0,
        });
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  function patch(updates: Partial<LearningConfig>) {
    const next = setLearningConfig(updates);
    setConfig(next);

    // Sync review defaults to AppBlocker so Focus Guard inherits them
    const appBlockerUpdates: Record<string, unknown> = {};
    if (updates.defaultFuriganaMode !== undefined) {
      appBlockerUpdates.furiganaMode = updates.defaultFuriganaMode;
      appBlockerUpdates.showFurigana = updates.defaultFuriganaMode !== "never";
    }
    if (updates.defaultDirection !== undefined) {
      appBlockerUpdates.direction = updates.defaultDirection;
    }
    if (updates.defaultLearningRatio !== undefined) {
      appBlockerUpdates.learningRatio = updates.defaultLearningRatio;
    }

    if (Object.keys(appBlockerUpdates).length > 0) {
      AppBlocker.setAppBlockerConfig(appBlockerUpdates).catch(() => {});
    }
  }

  function toggleAutoSave() {
    const next = !autoSave;
    setAutoSaveWords(next);
    setAutoSave(next);
  }

  const intake = counts
    ? describeIntake({
        maxNewCards: config.maxNewCards,
        maxNewPerSession: config.newPerSession,
        introducedToday: counts.introducedToday,
        inProgress: counts.inProgress,
        maxLearningPool: config.maxLearningPool,
      })
    : null;

  function intakeMessage(): string {
    if (!intake || !counts) return "";
    if (intake.reason === "off") {
      return "Right now: new cards are off — set a number above 0 per session to introduce any.";
    }
    if (intake.reason === "learning-pool") {
      return `Right now: new cards are paused — ${counts.inProgress} cards are in progress against a cap of ${config.maxLearningPool}. Raise the cap or choose All.`;
    }
    if (intake.reason === "daily-ceiling") {
      return `Right now: new cards are paused — today's ceiling of ${config.maxNewCards} is already used (${counts.introducedToday} introduced today).`;
    }
    return `Right now: ${intake.allowance} new available (${counts.introducedToday} introduced today, ${counts.inProgress} in progress).`;
  }

  return (
    <Surface>
      <h2 className="font-display text-lg font-bold">Review defaults</h2>
      <p className="mt-1 text-sm text-muted">
        Default settings for review sessions and Focus Guard app blocker.
      </p>

      <div className="mt-5">
        <p className="text-sm font-bold">New cards</p>
        <p className="mb-2 text-xs text-muted">
          One intake, three limits: how many a session may introduce, how many a day, and how
          many unfinished cards you tolerate before intake pauses.
        </p>

        <p className="text-xs font-bold text-muted">Per session</p>
        <div className="mt-1 grid grid-cols-5 gap-2">
          {NEW_PER_SESSION.map((n) => (
            <Chip
              key={n.value}
              active={config.newPerSession === n.value}
              onClick={() => patch({ newPerSession: n.value })}
              className="w-full justify-center"
            >
              {n.label}
            </Chip>
          ))}
        </div>

        <div className="mt-3 flex items-center justify-between gap-3">
          <label htmlFor="max-new-per-day" className="text-xs font-bold text-muted">
            Per day
          </label>
          <input
            id="max-new-per-day"
            type="number"
            min={0}
            max={200}
            value={config.maxNewCards}
            onChange={(e) =>
              patch({
                maxNewCards: Math.max(0, Math.min(200, Number(e.target.value) || 0)),
              })
            }
            className="w-20 rounded-2xl border-2 border-border bg-background px-3 py-1.5 text-center text-sm"
          />
        </div>

        <p className="mt-3 text-xs font-bold text-muted">In-progress learning cap</p>
        <div className="mt-1 grid grid-cols-5 gap-2">
          {LEARNING_POOLS.map((p) => (
            <Chip
              key={p.value}
              active={config.maxLearningPool === p.value}
              onClick={() => patch({ maxLearningPool: p.value })}
              className="w-full justify-center"
            >
              {p.label}
            </Chip>
          ))}
        </div>

        {intake && counts && (
          <p className="mt-3 rounded-2xl border border-border bg-background/60 px-3 py-2 text-xs text-muted">
            {intakeMessage()}
          </p>
        )}
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold">Review mix (new vs reviews)</p>
        <p className="mb-2 text-xs text-muted">
          Proportion of new or struggling cards to mature reviews in sessions and Focus Guard.
        </p>
        <div className="mt-2 grid grid-cols-4 gap-2">
          {LEARNING_RATIOS.map((r) => (
            <Chip
              key={r.value}
              active={Math.abs(config.defaultLearningRatio - r.value) < 0.05}
              onClick={() => patch({ defaultLearningRatio: r.value })}
              className="w-full justify-center"
            >
              {r.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold">Direction</p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {DIRECTIONS.map((d) => (
            <Chip
              key={d.id}
              active={config.defaultDirection === d.id}
              onClick={() => patch({ defaultDirection: d.id })}
              className="w-full justify-center"
            >
              {d.label}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5">
        <p className="text-sm font-bold">Furigana</p>
        <p className="mb-2 text-xs text-muted">
          Reading hints on flashcards — applies to every review session and Focus Guard.
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2">
          {FURIGANA.map((f) => (
            <Chip
              key={f.id}
              active={config.defaultFuriganaMode === f.id}
              title={
                f.id === "learning_only"
                  ? "Show on learning cards, hide on known ones"
                  : f.id === "never"
                    ? "Hide ruby annotations for maximum recall challenge"
                    : "Always show reading hints"
              }
              onClick={() => patch({ defaultFuriganaMode: f.id })}
              className="w-full justify-center"
            >
              {f.label}
            </Chip>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {config.defaultFuriganaMode === "learning_only"
            ? "Smart: furigana shows while you're learning, hides once a card is known."
            : config.defaultFuriganaMode === "never"
              ? "Off: clean kanji — recall readings from memory."
              : "Always: readings shown above kanji."}
        </p>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4 border-t-2 border-border pt-4">
        <div>
          <p className="text-sm font-bold">Auto-save new words from chat</p>
          <p className="text-xs text-muted">
            When on, words Kai introduces are added to your deck automatically.
          </p>
        </div>
        <Toggle on={autoSave} onClick={toggleAutoSave} />
      </div>
    </Surface>
  );
}
