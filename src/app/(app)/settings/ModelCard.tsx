"use client";

import { useEffect, useState } from "react";
import {
  OUTPUT_TOKEN_OPTIONS,
  getMaxOutputTokens,
  setMaxOutputTokens,
  getAutoSaveWords,
  setAutoSaveWords,
  getAutoFallback,
  setAutoFallback,
  getAutoMemory,
  setAutoMemory,
} from "@/lib/model-config";
import { Chip, Toggle, Surface } from "../ui";

export default function ModelCard() {
  const [tokens, setTokensState] = useState<number>(0);
  const [autoSave, setAutoSaveState] = useState(false);
  const [fallback, setFallbackState] = useState(true);
  const [autoMemory, setAutoMemoryState] = useState(false);

  useEffect(() => {
    setTokensState(getMaxOutputTokens());
    setAutoSaveState(getAutoSaveWords());
    setFallbackState(getAutoFallback());
    setAutoMemoryState(getAutoMemory());
  }, []);

  function chooseTokens(n: number) {
    setMaxOutputTokens(n);
    setTokensState(n);
  }

  function toggleAutoSave() {
    const next = !autoSave;
    setAutoSaveWords(next);
    setAutoSaveState(next);
  }

  function toggleFallback() {
    const next = !fallback;
    setAutoFallback(next);
    setFallbackState(next);
  }

  function toggleAutoMemory() {
    const next = !autoMemory;
    setAutoMemory(next);
    setAutoMemoryState(next);
  }

  return (
    <Surface>
      <h2 className="font-display text-lg font-bold">How Kai teaches</h2>
      <p className="mt-1 text-sm text-muted">
        You can switch the Gemini model anytime from the chat header. These are
        the finer controls.
      </p>

      <div className="mt-5">
        <p className="text-sm font-bold">Reply length cap</p>
        <p className="mb-2 text-xs text-muted">
          Max output tokens. Lower = faster and cheaper; higher allows longer
          replies.
        </p>
        <div className="flex flex-wrap gap-2">
          {OUTPUT_TOKEN_OPTIONS.map((n) => (
            <Chip key={n} active={tokens === n} onClick={() => chooseTokens(n)}>
              {n}
            </Chip>
          ))}
        </div>
      </div>

      <div className="mt-5 flex items-start justify-between gap-4 border-t-2 border-border pt-4">
        <div>
          <p className="text-sm font-bold">Auto-switch models</p>
          <p className="text-xs text-muted">
            If your chosen model is rate-limited or unavailable, Kai
            automatically tries another so the chat keeps working.
          </p>
        </div>
        <Toggle on={fallback} onClick={toggleFallback} />
      </div>

      <div className="mt-5 flex items-start justify-between gap-4 border-t-2 border-border pt-4">
        <div>
          <p className="text-sm font-bold">Auto-save new words</p>
          <p className="text-xs text-muted">
            When on, every word Kai introduces is added to your deck. Off
            (default): only words you tap{" "}
            <span className="font-bold">+ Add to vocabulary</span> are saved.
          </p>
        </div>
        <Toggle on={autoSave} onClick={toggleAutoSave} />
      </div>

      <div className="mt-5 flex items-start justify-between gap-4 border-t-2 border-border pt-4">
        <div>
          <p className="text-sm font-bold">Auto-save memories</p>
          <p className="text-xs text-muted">
            When on, durable facts an AI notices about you are saved to its
            memory automatically. Off (default): they appear as{" "}
            <span className="font-bold">Remember this?</span> suggestions you
            tap to keep.
          </p>
        </div>
        <Toggle on={autoMemory} onClick={toggleAutoMemory} />
      </div>
    </Surface>
  );
}
