"use client";

import { useEffect, useState } from "react";
import {
  getLearningConfig,
  setLearningConfig,
  type LearningConfig,
} from "@/lib/learning-config";
import type { FuriganaMode, ReviewDirection } from "@/lib/review/types";
import { getAutoSaveWords, setAutoSaveWords } from "@/lib/model-config";
import { blockerUpdatesForLearningDefaults } from "@/lib/review/blocker-sync";
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


type IntakeCounts = { vocabInProgress: number; kanjiInProgress: number };

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
          vocabInProgress: Number(d.intake.vocabInProgress ?? 0) || 0,
          kanjiInProgress: Number(d.intake.kanjiInProgress ?? 0) || 0,
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
    // (direction, mix, furigana and early-review strategy, mapped in one place).
    const appBlockerUpdates = blockerUpdatesForLearningDefaults(updates);
    if (Object.keys(appBlockerUpdates).length > 0) {
      AppBlocker.setAppBlockerConfig(appBlockerUpdates).catch(() => {});
    }
  }

  function toggleAutoSave() {
    const next = !autoSave;
    setAutoSaveWords(next);
    setAutoSave(next);
  }

  // The cap is per deck, so the line names the deck that is actually paused
  // instead of one opaque total (a full vocabulary pile no longer reads as a
  // full kanji pile too).
  const cap = config.maxLearningPool;
  const vocabAtCap = cap > 0 && (counts?.vocabInProgress ?? 0) >= cap;
  const kanjiAtCap = cap > 0 && (counts?.kanjiInProgress ?? 0) >= cap;

  function intakeMessage(): string {
    if (!counts) return "";
    const capText = cap > 0 ? ` of ${cap}` : "";
    const decks = `vocabulary ${counts.vocabInProgress}${capText} · kanji ${counts.kanjiInProgress}${capText} in progress`;
    if (config.newPerSession <= 0) {
      return `Right now: new cards are off — set a number above 0 per session to introduce any (${decks}).`;
    }
    if (vocabAtCap && kanjiAtCap) {
      return `Right now: new cards are paused in both decks — ${decks}. Raise the cap or choose All.`;
    }
    if (vocabAtCap || kanjiAtCap) {
      return `Right now: new ${vocabAtCap ? "vocabulary" : "kanji"} cards are paused — ${decks}. Raise the cap or choose All.`;
    }
    return `Right now: ${decks} · ${config.newPerSession} new available per session.`;
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
          Two limits: how many new cards a session may introduce, and how many unfinished cards
          you tolerate before intake pauses. The cap is counted per deck — vocabulary and kanji
          each get their own, so one busy pile never pauses the other.
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

        <p className="mt-3 text-xs font-bold text-muted">In-progress learning cap (per deck)</p>
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

        {counts && (
          <p className="mt-3 rounded-2xl border border-border bg-background/60 px-3 py-2 text-xs text-muted">
            {intakeMessage()}
          </p>
        )}
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
