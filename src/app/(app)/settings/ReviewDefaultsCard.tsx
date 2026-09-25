"use client";

import { useState } from "react";
import {
  getLearningConfig,
  setLearningConfig,
  type LearningConfig,
} from "@/lib/learning-config";
import type { FuriganaMode, ReviewDirection } from "@/lib/review/types";
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

const LEARNING_MIX: { ratio: number; label: string }[] = [
  { ratio: 0.5, label: "50 / 50" },
  { ratio: 0.7, label: "70 / 30 new" },
  { ratio: 1, label: "All new focus" },
];

export default function ReviewDefaultsCard() {
  const [config, setConfig] = useState<LearningConfig>(() => getLearningConfig());
  const [autoSave, setAutoSave] = useState<boolean>(() => getAutoSaveWords());

  function patch(updates: Partial<LearningConfig>) {
    const next = setLearningConfig(updates);
    setConfig(next);
    // Furigana is the single source of truth here — mirror it into the
    // AppBlocker config so the Focus Guard interceptor (Android
    // SharedPreferences) picks it up without rebuilding the app.
    if (updates.defaultFuriganaMode !== undefined) {
      AppBlocker.setAppBlockerConfig({
        furiganaMode: updates.defaultFuriganaMode,
        showFurigana: updates.defaultFuriganaMode !== "never",
      }).catch(() => {});
    }
  }

  function toggleAutoSave() {
    const next = !autoSave;
    setAutoSaveWords(next);
    setAutoSave(next);
  }

  return (
    <Surface>
      <h2 className="font-display text-lg font-bold">Review defaults</h2>
      <p className="mt-1 text-sm text-muted">
        Used when you start a session from the review page. Focus Guard can inherit
        these with &quot;Use my review defaults.&quot;
      </p>

      <div className="mt-5">
        <p className="text-sm font-bold">Direction</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DIRECTIONS.map((d) => (
            <Chip
              key={d.id}
              active={config.defaultDirection === d.id}
              onClick={() => patch({ defaultDirection: d.id })}
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
        <div className="mt-2 flex flex-wrap gap-2">
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

      <div className="mt-5">
        <p className="text-sm font-bold">New vs review mix</p>
        <p className="mb-2 text-xs text-muted">
          Share of &quot;active learning&quot; cards vs maintenance in mixed sessions.
        </p>
        <div className="flex flex-wrap gap-2">
          {LEARNING_MIX.map((m) => (
            <Chip
              key={m.ratio}
              active={config.defaultLearningRatio === m.ratio}
              onClick={() => patch({ defaultLearningRatio: m.ratio })}
            >
              {m.label}
            </Chip>
          ))}
        </div>
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
