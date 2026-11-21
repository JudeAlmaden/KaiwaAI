"use client";

import type { Folder, ViewMode, FilterMode, FolderSort } from "../types";

interface KanjiNavigationProps {
  activeFolder: Folder | null;
  viewMode: ViewMode;
  folders: Folder[];
  allKanjiCount: number;
  search: string;
  kanjiFilter: FilterMode;
  selectedFolderFilter: string;
  unlistedKanjiCount: number;
  kanjiSortBy: "heisig" | "strokes" | "mastery" | "recent";
  folderSortBy: FolderSort;
  onBackToFolders: () => void;
  onSetViewMode: (mode: ViewMode) => void;
  onSetSearch: (search: string) => void;
  onSetKanjiFilter: (filter: FilterMode) => void;
  onSetSelectedFolderFilter: (folderId: string) => void;
  onSetKanjiSortBy: (sort: "heisig" | "strokes" | "mastery" | "recent") => void;
  onSetFolderSortBy: (sort: FolderSort) => void;
}

export default function KanjiNavigation({
  activeFolder,
  viewMode,
  folders,
  allKanjiCount,
  search,
  kanjiFilter,
  selectedFolderFilter,
  unlistedKanjiCount,
  kanjiSortBy,
  folderSortBy,
  onBackToFolders,
  onSetViewMode,
  onSetSearch,
  onSetKanjiFilter,
  onSetSelectedFolderFilter,
  onSetKanjiSortBy,
  onSetFolderSortBy,
}: KanjiNavigationProps) {
  return (
    <>
      {/* ── MINIMAL NAVIGATION & SEARCH ── */}
      <div className="border-b border-border/50 bg-bg/30 px-5 py-3 sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
          {activeFolder ? (
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={onBackToFolders}
                className="font-medium text-indigo-ai hover:underline"
              >
                ← Back to Folders
              </button>
              <span className="text-muted">/</span>
              <span className="font-semibold text-fg">{activeFolder.name}</span>
            </div>
          ) : (
            <div className="flex items-center gap-1 rounded-xl bg-border/40 p-1">
              <button
                onClick={() => onSetViewMode("folders")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "folders"
                    ? "bg-card text-fg shadow-2xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                Lesson Folders ({folders.length})
              </button>
              <button
                onClick={() => onSetViewMode("all")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "all"
                    ? "bg-card text-fg shadow-2xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                All My Kanji ({allKanjiCount})
              </button>
              <button
                onClick={() => onSetViewMode("coverage")}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "coverage"
                    ? "bg-card text-fg shadow-2xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                Coverage
              </button>
            </div>
          )}

          {/* Search Field — the coverage wall has nothing to filter */}
          {viewMode !== "coverage" && (
            <div className="relative flex-1 max-w-xs min-w-[200px]">
              <input
                value={search}
                onChange={(e) => onSetSearch(e.target.value)}
                placeholder={
                  activeFolder
                    ? `Search ${activeFolder.name}...`
                    : viewMode === "all"
                    ? "Search kanji..."
                    : "Search folders..."
                }
                className="h-9 w-full rounded-xl border border-border/80 bg-card px-3 pr-7 text-xs outline-none transition-all focus:border-indigo-ai"
              />
              {search && (
                <button
                  onClick={() => onSetSearch("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-fg text-xs"
                >
                  ✕
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── FILTER CHIPS IN ALL KANJI VIEW ── */}
      {!activeFolder && viewMode === "all" && (
        <div className="px-5 py-2 sm:px-8 border-b border-border/30">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-between gap-3 text-xs">
            <div className="flex items-center gap-1">
              {(["All", "Learning", "Known"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => onSetKanjiFilter(f)}
                  className={`rounded-lg px-2.5 py-1 text-xs font-medium transition-all ${
                    kanjiFilter === f
                      ? "bg-indigo-ai/10 text-indigo-ai font-semibold"
                      : "text-muted hover:text-fg"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-2 text-muted text-xs">
              {folders.length > 0 && (
                <select
                  value={selectedFolderFilter}
                  onChange={(e) => onSetSelectedFolderFilter(e.target.value)}
                  className="rounded-lg border border-border/80 bg-card px-2 py-0.5 text-xs text-fg outline-none focus:border-indigo-ai"
                >
                  <option value="all">All Folders</option>
                  <option value="unlisted">Unassigned ({unlistedKanjiCount})</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.lessonNumber ? `Lesson ${f.lessonNumber}: ` : ""}
                      {f.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1">
                <span>Sort:</span>
                <select
                  value={kanjiSortBy}
                  onChange={(e) =>
                    onSetKanjiSortBy(e.target.value as typeof kanjiSortBy)
                  }
                  className="rounded-lg border border-border/80 bg-card px-2 py-0.5 text-xs text-fg outline-none focus:border-indigo-ai"
                >
                  <option value="heisig">Heisig #</option>
                  <option value="strokes">Strokes</option>
                  <option value="mastery">Mastery</option>
                  <option value="recent">Character</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── FILTER & SORT IN FOLDERS VIEW ── */}
      {!activeFolder && viewMode === "folders" && folders.length > 0 && (
        <div className="px-5 py-2 sm:px-8 border-b border-border/30">
          <div className="mx-auto flex w-full max-w-5xl items-center justify-end gap-1.5 text-muted text-xs">
            <span>Sort:</span>
            <select
              value={folderSortBy}
              onChange={(e) => onSetFolderSortBy(e.target.value as typeof folderSortBy)}
              className="rounded-lg border border-border/80 bg-card px-2 py-0.5 text-xs text-fg outline-none focus:border-indigo-ai"
            >
              <option value="lesson">Lesson Number</option>
              <option value="count">Kanji Count</option>
              <option value="completion">Completion %</option>
              <option value="recent">Recently Created</option>
            </select>
          </div>
        </div>
      )}
    </>
  );
}
