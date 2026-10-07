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



export default function ReviewDefaultsCard() {
  const [config, setConfig] = useState<LearningConfig>(() => getLearningConfig());
  const [autoSave, setAutoSave] = useState<boolean>(() => getAutoSaveWords());

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

    if (Object.keys(appBlockerUpdates).length > 0) {
      AppBlocker.setAppBlockerConfig(appBlockerUpdates).catch(() => {});
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
        Default settings for review sessions and Focus Guard app blocker.
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
