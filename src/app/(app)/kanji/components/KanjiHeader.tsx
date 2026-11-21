"use client";

import type { Folder } from "../types";

interface KanjiHeaderProps {
  activeFolder: Folder | null;
  totalKanji: number;
  masteredPct: number;
  onOpenNewFolder: () => void;
  onOpenAddKanji: () => void;
  onStudyLesson: () => void;
}

export default function KanjiHeader({
  activeFolder,
  totalKanji,
  masteredPct,
  onOpenNewFolder,
  onOpenAddKanji,
  onStudyLesson,
}: KanjiHeaderProps) {
  return (
    <div className="border-b border-border/70 bg-card/40 backdrop-blur-sm px-5 py-4 sm:px-8">
      <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-display text-xl sm:text-2xl font-bold text-fg">
                {activeFolder ? activeFolder.name : "Kanji Studio"}
              </h1>
              {activeFolder?.lessonNumber && (
                <span className="text-[11px] font-semibold text-muted">
                  · Lesson {activeFolder.lessonNumber}
                </span>
              )}
            </div>
            <p className="text-xs text-muted mt-0.5">
              {activeFolder
                ? `${activeFolder.entries.length} characters in this lesson`
                : `${totalKanji} kanji collected · ${masteredPct}% mastered`}
            </p>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2.5">
          {!activeFolder && (
            <button
              onClick={onOpenNewFolder}
              className="rounded-xl border border-border/90 bg-card px-3.5 py-2 text-xs font-semibold text-fg hover:border-indigo-ai/50 hover:text-indigo-ai transition-all"
            >
              + New Folder
            </button>
          )}

          <button
            onClick={onOpenAddKanji}
            className="rounded-xl bg-indigo-ai px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-ai/90 transition-all"
          >
            ＋ Add Kanji
          </button>

          {activeFolder && activeFolder.entries.length > 0 && (
            <button
              onClick={onStudyLesson}
              className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-all"
            >
              Study Lesson →
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
