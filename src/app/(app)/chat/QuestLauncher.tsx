"use client";

import { useState, useCallback } from "react";
import Link from "next/link";
import {
  generateQuest,
  bustQuestCache,
  saveQuestForConv,
  QUEST_THEMES,
  type QuestTheme,
  type GeneratedQuest,
} from "@/lib/quests";
import { hasAnyKey } from "@/lib/api-keys";

type QuestContext = {
  level: string;
  knownCount: number;
  reinforce: string[];
};

export default function QuestLauncher({
  onStartQuest,
}: {
  /** Called with the groupId of the conversation to navigate to */
  onStartQuest: (groupId: string) => void;
}) {
  const [selectedTheme, setSelectedTheme] = useState<QuestTheme>("surprise");
  const [customInput, setCustomInput] = useState("");
  const [quest, setQuest] = useState<GeneratedQuest | null>(null);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [starting, setStarting] = useState(false);

  const generate = useCallback(
    async (theme: QuestTheme, forceRefresh = false, customPrompt?: string) => {
      if (!hasAnyKey()) {
        setError("no_key");
        return;
      }
      setGenerating(true);
      setError(null);
      setQuest(null);

      try {
        // 1. Fetch user context from server
        const res = await fetch("/api/quests/generate");
        if (!res.ok) throw new Error("Failed to fetch context");
        const ctx: QuestContext = await res.json();

        // 2. Generate quest client-side (BYOK)
        const generated = await generateQuest(theme, ctx, forceRefresh, customPrompt);
        setQuest(generated);
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Something went wrong.";
        if (msg === "NO_API_KEY") setError("no_key");
        else if (msg === "RATE_LIMIT") setError("rate_limit");
        else if (msg === "BAD_API_KEY") setError("bad_key");
        else setError("generic");
      } finally {
        setGenerating(false);
      }
    },
    []
  );

  const handleThemeClick = (theme: QuestTheme) => {
    setSelectedTheme(theme);
    setCustomInput(""); // Clear custom input when clicking a themed chip
    void generate(theme);
  };

  const handleCustomSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = customInput.trim();
    if (!val) return;
    setSelectedTheme("surprise");
    void generate("surprise", true, val);
  };

  const handleRegenerate = () => {
    if (quest) {
      bustQuestCache(quest.theme as QuestTheme, quest.level);
    }
    const val = customInput.trim();
    void generate(selectedTheme, true, val || undefined);
  };

  const handleStart = async () => {
    if (!quest || starting) return;
    setStarting(true);
    try {
      // Find or create the Kai conversation
      const personasRes = await fetch("/api/personas");
      const { personas } = await personasRes.json();
      const kai = (personas as { id: string; name: string; builtin: boolean }[]).find(
        (p) => p.builtin && p.name.toLowerCase() === "kai"
      );
      if (!kai) throw new Error("Kai persona not found");

      // Create / reuse conversation
      const convRes = await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ personaId: kai.id }),
      });
      const convData = await convRes.json();
      const groupId: string = convData.group?.id ?? convData.id;
      if (!groupId) throw new Error("Could not create conversation");

      // Store quest state for this conversation
      saveQuestForConv(groupId, quest);

      onStartQuest(groupId);
    } catch {
      setError("generic");
    } finally {
      setStarting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Section header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="font-display text-base font-extrabold">🎭 Roleplay Quests</h2>
          <p className="text-xs text-muted">AI-generated scenarios, tailored to your level</p>
        </div>
      </div>

      {/* Theme chips */}
      <div className="flex flex-wrap gap-2">
        {QUEST_THEMES.map((t) => (
          <button
            key={t.id}
            onClick={() => handleThemeClick(t.id)}
            disabled={generating}
            className={`rounded-full border-2 px-3 py-1.5 text-xs font-semibold transition-all active:scale-95 disabled:opacity-50 ${
              selectedTheme === t.id && (quest || generating) && !customInput.trim()
                ? "border-indigo-ai bg-indigo-ai/10 text-indigo-ai"
                : "border-border bg-card text-muted hover:border-indigo-ai hover:text-indigo-ai"
            }`}
          >
            {t.emoji} {t.label}
          </button>
        ))}
      </div>

      {/* Custom Scenario Prompt Form */}
      <form onSubmit={handleCustomSubmit} className="flex gap-2">
        <input
          type="text"
          value={customInput}
          onChange={(e) => setCustomInput(e.target.value)}
          placeholder="Or describe your own custom roleplay idea..."
          disabled={generating}
          className="flex-1 rounded-full border-2 border-border bg-card px-4 py-2 text-xs outline-none placeholder:text-muted/50 focus:border-indigo-ai focus:bg-card transition-all"
        />
        <button
          type="submit"
          disabled={generating || !customInput.trim()}
          className="rounded-full bg-indigo-ai px-4 py-2 text-xs font-bold text-white transition-all hover:scale-105 hover:bg-indigo-ai/90 disabled:opacity-50 disabled:hover:scale-100 cursor-pointer"
        >
          Generate
        </button>
      </form>

      {/* Error states */}
      {error === "no_key" && (
        <div className="rounded-2xl border-2 border-amber/30 bg-amber/5 px-4 py-3 text-sm">
          <p className="font-bold text-amber">API key required</p>
          <p className="mt-0.5 text-xs text-muted">
            Add your Gemini key in{" "}
            <Link href="/settings" className="font-bold text-indigo-ai underline">
              Settings
            </Link>{" "}
            to generate quests.
          </p>
        </div>
      )}
      {error === "rate_limit" && (
        <div className="rounded-2xl border-2 border-amber/30 bg-amber/5 px-4 py-3 text-sm">
          <p className="font-bold text-amber">Rate limit hit</p>
          <p className="mt-0.5 text-xs text-muted">Wait a moment and try again.</p>
        </div>
      )}
      {error === "bad_key" && (
        <div className="rounded-2xl border-2 border-sakura/30 bg-sakura/5 px-4 py-3 text-sm">
          <p className="font-bold text-sakura">Invalid API key</p>
          <p className="mt-0.5 text-xs text-muted">
            Check your key in{" "}
            <Link href="/settings" className="font-bold text-indigo-ai underline">
              Settings
            </Link>
            .
          </p>
        </div>
      )}
      {error === "generic" && (
        <div className="rounded-2xl border-2 border-border bg-card px-4 py-3 text-sm">
          <p className="font-bold text-muted">Quest generation failed</p>
          <button
            onClick={handleRegenerate}
            className="mt-1 text-xs font-bold text-indigo-ai underline"
          >
            Try again
          </button>
        </div>
      )}

      {/* Shimmer skeleton while generating */}
      {generating && (
        <div className="animate-pulse rounded-3xl border-2 border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="h-12 w-12 shrink-0 rounded-2xl bg-border/50" />
            <div className="flex-1 space-y-2.5">
              <span className="block h-4 w-2/3 rounded-full bg-border/50" />
              <span className="block h-3 w-1/3 rounded-full bg-border/40" />
              <span className="block h-3 w-full rounded-full bg-border/30" />
              <span className="block h-3 w-4/5 rounded-full bg-border/30" />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            {[0, 1, 2, 3, 4].map((i) => (
              <span key={i} className="h-5 flex-1 rounded-full bg-border/30" />
            ))}
          </div>
          <p className="mt-3 text-center text-xs text-muted/60">
            ✨ Kai is crafting your quest…
          </p>
        </div>
      )}

      {/* Generated quest card */}
      {quest && !generating && (
        <div className="rounded-3xl border-2 border-indigo-ai/20 bg-gradient-to-br from-indigo-ai/5 to-sakura/3 p-5 shadow-sm">
          {/* Header */}
          <div className="flex items-start gap-3">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-ai/10 text-2xl">
              {quest.emoji}
            </span>
            <div className="min-w-0 flex-1">
              <h3 className="font-display font-extrabold text-foreground">{quest.title}</h3>
              <p className="font-jp text-sm text-indigo-ai/80">{quest.jpTitle}</p>
            </div>
            <span className="shrink-0 rounded-full bg-indigo-ai/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-ai">
              {quest.level}
            </span>
          </div>

          {/* Scene description */}
          <p className="mt-3 text-sm leading-relaxed text-muted">{quest.sceneDescription}</p>

          {/* Objectives preview */}
          <div className="mt-4 space-y-1.5">
            {quest.objectives.map((obj, i) => (
              <div key={obj.id} className="flex items-start gap-2">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-border/50 text-[10px] font-bold text-muted">
                  {i + 1}
                </span>
                <p className="text-xs text-muted">{obj.description}</p>
              </div>
            ))}
          </div>

          {/* Actions */}
          <div className="mt-4 flex items-center justify-between gap-3">
            <button
              onClick={handleRegenerate}
              className="text-xs font-bold text-muted hover:text-indigo-ai"
            >
              🔄 Regenerate
            </button>
            <button
              onClick={() => void handleStart()}
              disabled={starting}
              className="btn-pop flex items-center gap-1.5 rounded-full bg-indigo-ai px-5 py-2 text-sm font-bold text-white shadow-md disabled:opacity-60"
            >
              {starting ? "Starting…" : "Start Quest →"}
            </button>
          </div>
        </div>
      )}

      {/* Prompt to generate when nothing shown yet */}
      {!quest && !generating && !error && (
        <div className="rounded-3xl border-2 border-dashed border-border px-6 py-6 text-center">
          <p className="text-sm text-muted">
            Pick a theme above to generate your personalized quest
          </p>
        </div>
      )}
    </div>
  );
}
