"use client";

import { useState, useEffect } from "react";
import {
  DailyQuestCard,
  GauntletCard,
  VocabularyCard,
  KanjiQuestCard,
  EndlessZenCard,
  AppBlockerCard,
  CustomSessionCard,
} from "./quest-cards";
import {
  ShieldCheck,
  Minus,
  Plus,
  ArrowRight,
  FolderOpen,
  Books,
  ClockCountdown,
} from "@phosphor-icons/react";
import Link from "next/link";
import { buildCustomSessionStartParams, type CustomSessionFormValues } from "./customSession";

export type QuestStartParams = {
  studyMode: "all" | "struggling" | "due" | "new" | "custom";
  limit?: number;
  isContinuous?: boolean;
  reviewType?: "mixed" | "vocabulary" | "kanji";
  direction?: "jp-to-en" | "en-to-jp" | "mixed";
  customCardIds?: string[];
  activeLimit?: number;
  groupId?: string;
  groupName?: string;
};

export type AppBlockerConfig = {
  count: number;
  blockChance: number;
  unlockDurationMinutes: number;
  reviewType: "mixed" | "vocabulary" | "kanji";
  direction: "jp-to-en" | "en-to-jp" | "mixed";
};

type QuestGalleryProps = {
  dueCount: number;
  strugglingCount?: number;
  totalCards?: number;
  isMonitoring: boolean;
  isAndroid?: boolean;
  appBlockerConfig: AppBlockerConfig;
  onStartQuest: (params: QuestStartParams) => void;
  onToggleMonitoring: () => void;
  onUpdateAppBlockerConfig: (updates: Partial<AppBlockerConfig>) => void;
};

export default function QuestGallery({
  dueCount,
  isMonitoring,
  isAndroid = true,
  appBlockerConfig,
  onStartQuest,
  onToggleMonitoring,
  onUpdateAppBlockerConfig,
}: QuestGalleryProps) {
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [showAppBlockerModal, setShowAppBlockerModal] = useState(false);
  const [showKanjiSourceModal, setShowKanjiSourceModal] = useState(false);
  const [customDraft, setCustomDraft] = useState<CustomSessionFormValues>({
    reviewType: "mixed",
    studyMode: "all",
    direction: "mixed",
    limit: 20,
    isContinuous: false,
    activeLimit: 5,
  });

  // Folders for kanji source picker
  type Folder = { id: string; name: string; total: number };
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoaded, setFoldersLoaded] = useState(false);

  useEffect(() => {
    if (!showKanjiSourceModal || foldersLoaded) return;
    fetch("/api/kanji/groups")
      .then((r) => r.json())
      .then((d) => {
        setFolders(
          (d.groups || []).map((g: { id: string; name: string; entries: unknown[] }) => ({
            id: g.id,
            name: g.name,
            total: g.entries?.length ?? 0,
          }))
        );
        setFoldersLoaded(true);
      })
      .catch(() => {});
  }, [showKanjiSourceModal, foldersLoaded]);

  const handleStartCustomSession = () => {
    onStartQuest(buildCustomSessionStartParams(customDraft));
    setShowCustomModal(false);
  };

  return (
    <div className="w-full space-y-6">
      {/* 3-Column Structured Collage Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-5">
        {/* Row 1: Daily Quest Hero (Span 3 columns) */}
        <div className="col-span-1 md:col-span-3">
          <DailyQuestCard
            dueCount={dueCount}
            onStart={() =>
              onStartQuest({
                studyMode: "due",
                limit: Math.max(10, dueCount),
                isContinuous: false,
                reviewType: "mixed",
                activeLimit: 5,
              })
            }
          />
        </div>

        {/* Row 2: 3 Equal Columns */}
        <div className="col-span-1">
          <GauntletCard
            onStart={() =>
              onStartQuest({
                studyMode: "struggling",
                limit: 30,
                isContinuous: false,
                reviewType: "mixed",
                activeLimit: 5,
              })
            }
          />
        </div>

        <div className="col-span-1">
          <VocabularyCard
            onStart={() =>
              onStartQuest({
                studyMode: "all",
                limit: 15,
                isContinuous: false,
                reviewType: "vocabulary",
                direction: "mixed",
                activeLimit: 5,
              })
            }
          />
        </div>

        <div className="col-span-1">
          <KanjiQuestCard
            onStart={() => setShowKanjiSourceModal(true)}
          />
        </div>

        {/* Row 3: Focus Guard (Android only, 1 col) or Custom Session (1 col) + Endless Zen (2 cols) */}
        {isAndroid ? (
          <>
            <div className="col-span-1 md:col-span-1">
              <AppBlockerCard
                isMonitoring={isMonitoring}
                requirementCount={appBlockerConfig.count}
                onClick={() => setShowAppBlockerModal(true)}
              />
            </div>

            <div className="col-span-1 md:col-span-2">
              <EndlessZenCard
                onStart={() =>
                  onStartQuest({
                    studyMode: "all",
                    limit: 200,
                    isContinuous: true,
                    reviewType: "mixed",
                    activeLimit: 5,
                  })
                }
              />
            </div>

            <div className="col-span-1 md:col-span-3">
              <CustomSessionCard onClick={() => setShowCustomModal(true)} />
            </div>
          </>
        ) : (
          <>
            <div className="col-span-1 md:col-span-2 order-1 md:order-2">
              <EndlessZenCard
                onStart={() =>
                  onStartQuest({
                    studyMode: "all",
                    limit: 200,
                    isContinuous: true,
                    reviewType: "mixed",
                    activeLimit: 5,
                  })
                }
              />
            </div>

            <div className="col-span-1 md:col-span-1 order-2 md:order-1">
              <CustomSessionCard onClick={() => setShowCustomModal(true)} />
            </div>
          </>
        )}
      </div>

      {/* Kanji Source Picker Modal */}
      {showKanjiSourceModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowKanjiSourceModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-foreground flex items-center gap-2">
                  <span className="text-lg font-jp">漢</span> Kanji Quest
                </h2>
                <p className="text-xs text-muted">Choose which kanji to study</p>
              </div>
              <button
                onClick={() => setShowKanjiSourceModal(false)}
                className="w-8 h-8 rounded-xl bg-muted/15 text-muted hover:text-foreground flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Source options */}
            <div className="space-y-2">
              {/* All lesson folders */}
              <button
                onClick={() => {
                  onStartQuest({ studyMode: "all", reviewType: "kanji", groupId: "all", groupName: "All Lesson Folders", limit: 50, activeLimit: 5 });
                  setShowKanjiSourceModal(false);
                }}
                className="w-full flex items-center gap-3 rounded-2xl border-2 border-amber/30 bg-amber/5 px-4 py-3.5 text-left transition hover:border-amber/50 hover:bg-amber/10"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-amber/15 text-amber">
                  <Books size={18} weight="bold" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-foreground">All My Lessons</p>
                  <p className="text-[11px] text-muted">
                    {folders.length > 0 ? `${folders.length} folder${folders.length !== 1 ? "s" : ""} · ${folders.reduce((a, f) => a + f.total, 0)} kanji` : "Study all kanji across every folder"}
                  </p>
                </div>
                <ArrowRight size={14} className="ml-auto text-amber shrink-0" />
              </button>

              {/* Specific folder */}
              {folders.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted px-1">Pick a folder</p>
                  <div className="max-h-48 overflow-y-auto space-y-1.5">
                    {folders.map((folder) => (
                      <button
                        key={folder.id}
                        onClick={() => {
                          onStartQuest({ studyMode: "all", reviewType: "kanji", groupId: folder.id, groupName: folder.name, limit: 50, activeLimit: 5 });
                          setShowKanjiSourceModal(false);
                        }}
                        className="w-full flex items-center justify-between rounded-xl border-2 border-border bg-card px-3 py-2.5 text-left text-xs font-bold transition hover:border-indigo-ai/40 hover:bg-indigo-ai/5"
                      >
                        <span className="flex items-center gap-2">
                          <FolderOpen size={14} className="text-indigo-ai shrink-0" />
                          <span className="truncate">{folder.name}</span>
                        </span>
                        <span className="text-[10px] font-semibold text-muted shrink-0 ml-2">{folder.total} kanji</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SRS Due */}
              <button
                onClick={() => {
                  onStartQuest({ studyMode: "due", reviewType: "kanji", limit: 50, activeLimit: 5 });
                  setShowKanjiSourceModal(false);
                }}
                className="w-full flex items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3.5 text-left transition hover:border-indigo-ai/40 hover:bg-indigo-ai/5"
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-ai/10 text-indigo-ai">
                  <ClockCountdown size={18} weight="bold" />
                </span>
                <div>
                  <p className="text-sm font-extrabold text-foreground">SRS Review (Due)</p>
                  <p className="text-[11px] text-muted">Cards the spaced-repetition system has scheduled for today</p>
                </div>
                <ArrowRight size={14} className="ml-auto text-muted shrink-0" />
              </button>

              {folders.length === 0 && (
                <div className="rounded-2xl border border-dashed border-border bg-bg/50 p-4 text-center space-y-2">
                  <p className="text-xs text-muted">No lesson folders yet.</p>
                  <Link
                    href="/study?tab=kanji"
                    onClick={() => setShowKanjiSourceModal(false)}
                    className="text-xs font-bold text-indigo-ai underline underline-offset-2 hover:opacity-80"
                  >
                    Create your first lesson folder →
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Custom Session Modal */}
      {showCustomModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowCustomModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-base font-bold text-foreground">
                  Build a custom session
                </h2>
                <p className="text-xs text-muted">
                  Pick the cards and pace that fit your current focus.
                </p>
              </div>
              <button
                onClick={() => setShowCustomModal(false)}
                className="w-8 h-8 rounded-xl bg-muted/15 text-muted hover:text-foreground flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                <span>Review type</span>
                <select
                  value={customDraft.reviewType}
                  onChange={(e) =>
                    setCustomDraft((prev) => ({
                      ...prev,
                      reviewType: e.target.value as CustomSessionFormValues["reviewType"],
                    }))
                  }
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="mixed">Mixed</option>
                  <option value="vocabulary">Vocabulary</option>
                  <option value="kanji">Kanji</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                <span>Study mode</span>
                <select
                  value={customDraft.studyMode}
                  onChange={(e) =>
                    setCustomDraft((prev) => ({
                      ...prev,
                      studyMode: e.target.value as CustomSessionFormValues["studyMode"],
                    }))
                  }
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="all">All cards</option>
                  <option value="due">Due now</option>
                  <option value="new">New cards</option>
                  <option value="struggling">Struggling</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                <span>Direction</span>
                <select
                  value={customDraft.direction}
                  onChange={(e) =>
                    setCustomDraft((prev) => ({
                      ...prev,
                      direction: e.target.value as CustomSessionFormValues["direction"],
                    }))
                  }
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                >
                  <option value="mixed">Mixed</option>
                  <option value="jp-to-en">Japanese → English</option>
                  <option value="en-to-jp">English → Japanese</option>
                </select>
              </label>

              <label className="space-y-1.5 text-sm font-semibold text-foreground">
                <span>Card limit</span>
                <input
                  type="number"
                  min="1"
                  max="200"
                  value={customDraft.limit}
                  onChange={(e) =>
                    setCustomDraft((prev) => ({
                      ...prev,
                      limit: Number(e.target.value || 1),
                    }))
                  }
                  className="w-full rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border bg-background/70 p-3">
              <label className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <input
                  type="checkbox"
                  checked={customDraft.isContinuous}
                  onChange={(e) =>
                    setCustomDraft((prev) => ({
                      ...prev,
                      isContinuous: e.target.checked,
                    }))
                  }
                  className="h-4 w-4 rounded border-border"
                />
                Continuous mode
              </label>

              <label className="space-y-1 text-sm font-semibold text-foreground">
                <span className="block text-xs uppercase tracking-wide text-muted">Active pool</span>
                <input
                  type="number"
                  min="1"
                  max="20"
                  value={customDraft.activeLimit}
                  onChange={(e) =>
                    setCustomDraft((prev) => ({
                      ...prev,
                      activeLimit: Number(e.target.value || 1),
                    }))
                  }
                  className="w-24 rounded-2xl border border-border bg-background px-3 py-2 text-sm text-foreground"
                />
              </label>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setShowCustomModal(false)}
                className="rounded-2xl border border-border bg-card/60 px-4 py-2 text-sm font-bold text-muted transition hover:text-foreground"
              >
                Cancel
              </button>
              <button
                onClick={handleStartCustomSession}
                className="inline-flex items-center gap-2 rounded-2xl bg-indigo-ai px-4 py-2 text-sm font-bold text-white transition hover:brightness-105"
              >
                Start session
                <ArrowRight size={14} />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Focus Guard Simplified Minimal Modal */}
      {showAppBlockerModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowAppBlockerModal(false)}
        >
          <div
            className="relative w-full max-w-lg rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-ai/10 text-indigo-ai flex items-center justify-center font-bold shrink-0">
                  <ShieldCheck size={22} />
                </div>
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">
                    Focus Guard Options
                  </h2>
                  <p className="text-xs text-muted">
                    Quick interception rules &amp; flashcard goal
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowAppBlockerModal(false)}
                className="w-8 h-8 rounded-xl bg-muted/15 text-muted hover:text-foreground flex items-center justify-center text-xs font-bold transition"
              >
                ✕
              </button>
            </div>

            {/* Master Switch Bar */}
            <div className="flex items-center justify-between p-3 rounded-2xl border-2 border-border bg-background">
              <div className="flex items-center gap-2 text-xs font-bold text-foreground">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    isMonitoring ? "bg-emerald-500 animate-pulse" : "bg-muted"
                  }`}
                />
                <span>App Blocker Guard: {isMonitoring ? "Active" : "Paused"}</span>
              </div>

              <button
                onClick={onToggleMonitoring}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition active:scale-95 ${
                  isMonitoring
                    ? "bg-rose-500 text-white"
                    : "bg-indigo-ai text-white"
                }`}
              >
                {isMonitoring ? "Pause Guard" : "Start Guard"}
              </button>
            </div>

            {/* Required Goal Stepper */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Target Cards per Interception
              </span>
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() =>
                      onUpdateAppBlockerConfig({
                        count: Math.max(1, appBlockerConfig.count - 1),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-border bg-background flex items-center justify-center font-bold text-foreground transition active:scale-95"
                  >
                    <Minus size={14} />
                  </button>
                  <span className="w-8 text-center font-display font-extrabold text-foreground text-sm">
                    {appBlockerConfig.count}
                  </span>
                  <button
                    onClick={() =>
                      onUpdateAppBlockerConfig({
                        count: Math.min(100, appBlockerConfig.count + 1),
                      })
                    }
                    className="w-8 h-8 rounded-xl border border-border bg-background flex items-center justify-center font-bold text-foreground transition active:scale-95"
                  >
                    <Plus size={14} />
                  </button>
                </div>

                <div className="flex items-center gap-1">
                  {[5, 10, 15, 20].map((preset) => (
                    <button
                      key={preset}
                      onClick={() => onUpdateAppBlockerConfig({ count: preset })}
                      className={`px-2.5 py-1 rounded-xl text-xs font-bold transition ${
                        appBlockerConfig.count === preset
                          ? "bg-indigo-ai text-white"
                          : "border border-border bg-background text-muted hover:text-foreground"
                      }`}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Probability & Re-lock Grace Period */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Probability
                </span>
                <div className="flex flex-wrap gap-1">
                  {[25, 50, 75, 100].map((pct) => (
                    <button
                      key={pct}
                      onClick={() => onUpdateAppBlockerConfig({ blockChance: pct })}
                      className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-bold text-center transition ${
                        appBlockerConfig.blockChance === pct
                          ? "bg-amber-500 text-white"
                          : "border border-border bg-background text-muted hover:text-foreground"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                  Unlock Grace
                </span>
                <div className="flex flex-wrap gap-1">
                  {[5, 15, 30, 60].map((mins) => (
                    <button
                      key={mins}
                      onClick={() =>
                        onUpdateAppBlockerConfig({ unlockDurationMinutes: mins })
                      }
                      className={`flex-1 py-1 px-2 rounded-xl text-[11px] font-bold text-center transition ${
                        appBlockerConfig.unlockDurationMinutes === mins
                          ? "bg-emerald-500 text-white"
                          : "border border-border bg-background text-muted hover:text-foreground"
                      }`}
                    >
                      {mins}m
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Review Type & Direction */}
            <div className="space-y-2">
              <span className="text-[11px] font-bold text-muted uppercase tracking-wider">
                Flashcard Settings
              </span>
              <div className="flex flex-wrap items-center gap-1.5 text-xs font-bold">
                {(["mixed", "vocabulary", "kanji"] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => onUpdateAppBlockerConfig({ reviewType: type })}
                    className={`px-3 py-1 rounded-xl capitalize transition ${
                      appBlockerConfig.reviewType === type
                        ? "bg-indigo-ai text-white"
                        : "border border-border bg-background text-muted hover:text-foreground"
                    }`}
                  >
                    {type}
                  </button>
                ))}

                <span className="text-muted text-[10px] mx-1">•</span>

                {(["jp-to-en", "en-to-jp", "mixed"] as const).map((dir) => (
                  <button
                    key={dir}
                    onClick={() => onUpdateAppBlockerConfig({ direction: dir })}
                    className={`px-2.5 py-1 rounded-xl transition text-[11px] ${
                      appBlockerConfig.direction === dir
                        ? "bg-indigo-ai text-white"
                        : "border border-border bg-background text-muted hover:text-foreground"
                    }`}
                  >
                    {dir === "jp-to-en"
                      ? "JP → EN"
                      : dir === "en-to-jp"
                      ? "EN → JP"
                      : "Mixed Dir"}
                  </button>
                ))}
              </div>
            </div>

            {/* Footer Link */}
            <div className="pt-2 border-t border-border flex items-center justify-between text-xs">
              <Link
                href="/settings/app-blocker"
                className="font-bold text-indigo-ai hover:underline flex items-center gap-1 text-[11px]"
                onClick={() => setShowAppBlockerModal(false)}
              >
                <span>Full App Manager &amp; App Selection</span>
                <ArrowRight size={12} />
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

