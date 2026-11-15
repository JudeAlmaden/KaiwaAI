"use client";

import { useMemo } from "react";
import type { FilterMode, Folder, FolderSort, KanjiCard, KanjiSort } from "./types";

type KanjiViewArgs = {
  folders: Folder[];
  allKanji: KanjiCard[];
  selectedFolderId: string | null;
  search: string;
  folderSortBy: FolderSort;
  kanjiSortBy: KanjiSort;
  kanjiFilter: FilterMode;
  selectedFolderFilter: string;
};

function matchesEntry(e: Folder["entries"][number], q: string): boolean {
  return (
    e.character.includes(q) ||
    Boolean(e.heisigKeyword && e.heisigKeyword.toLowerCase().includes(q)) ||
    Boolean(e.customMeaning && e.customMeaning.toLowerCase().includes(q)) ||
    Boolean(e.mnemonic && e.mnemonic.toLowerCase().includes(q)) ||
    Boolean(e.heisigNumber && (`#${e.heisigNumber}`.includes(q) || String(e.heisigNumber) === q)) ||
    Boolean(e.primitives && e.primitives.some((p) => p.toLowerCase().includes(q))) ||
    e.meanings.some((m) => m.toLowerCase().includes(q))
  );
}

/**
 * All the read-only projections the kanji studio renders: the active folder,
 * overall stats, and the filtered/sorted folder and kanji lists. Pure given its
 * inputs, so the component above keeps only state and handlers.
 */
export function useKanjiView({
  folders,
  allKanji,
  selectedFolderId,
  search,
  folderSortBy,
  kanjiSortBy,
  kanjiFilter,
  selectedFolderFilter,
}: KanjiViewArgs) {
  const activeFolder = useMemo(() => {
    if (!selectedFolderId || selectedFolderId === "all-my-kanji") return null;
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  const stats = useMemo(() => {
    const total = allKanji.length;
    const known = allKanji.filter(
      (k) => k.learningStatus === "known" || k.masteryPercent >= 80
    ).length;
    const learning = Math.max(0, total - known);
    const pct = total > 0 ? Math.round((known / total) * 100) : 0;
    return { total, known, learning, pct };
  }, [allKanji]);

  const filteredFolders = useMemo(() => {
    let result = [...folders];
    const q = search.trim().toLowerCase();

    if (q) {
      const lessonMatch = q.match(/^(?:l|lesson|#)?\s*(\d+)$/i);
      const queryLessonNum = lessonMatch ? parseInt(lessonMatch[1], 10) : null;

      result = result.filter((f) => {
        if (queryLessonNum !== null && f.lessonNumber === queryLessonNum) return true;
        if (f.name.toLowerCase().includes(q)) return true;
        if (f.description && f.description.toLowerCase().includes(q)) return true;
        return f.entries.some((e) => matchesEntry(e, q));
      });
    }

    result.sort((a, b) => {
      if (folderSortBy === "lesson") {
        const la = a.lessonNumber ?? 99999;
        const lb = b.lessonNumber ?? 99999;
        if (la !== lb) return la - lb;
        return a.order - b.order;
      }
      if (folderSortBy === "count") return b.entries.length - a.entries.length;
      if (folderSortBy === "completion") return b.completionPct - a.completionPct;
      if (folderSortBy === "recent") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      return 0;
    });

    return result;
  }, [folders, search, folderSortBy]);

  const activeFolderEntries = useMemo(() => {
    if (!activeFolder) return [];
    const q = search.trim().toLowerCase();
    if (!q) return activeFolder.entries;
    return activeFolder.entries.filter((e) => matchesEntry(e, q));
  }, [activeFolder, search]);

  const unlistedKanjiCount = useMemo(() => {
    return allKanji.filter((k) => !k.groupIds || k.groupIds.length === 0).length;
  }, [allKanji]);

  const filteredAllKanji = useMemo(() => {
    let result = [...allKanji];
    const q = search.trim().toLowerCase();

    if (kanjiFilter === "Learning") {
      result = result.filter((k) => k.learningStatus !== "known" && k.masteryPercent < 80);
    } else if (kanjiFilter === "Known") {
      result = result.filter((k) => k.learningStatus === "known" || k.masteryPercent >= 80);
    }

    if (selectedFolderFilter === "unlisted") {
      result = result.filter((k) => !k.groupIds || k.groupIds.length === 0);
    } else if (selectedFolderFilter !== "all") {
      result = result.filter((k) => k.groupIds && k.groupIds.includes(selectedFolderFilter));
    }

    if (q) {
      result = result.filter(
        (k) =>
          k.character.includes(q) ||
          Boolean(k.heisigKeyword && k.heisigKeyword.toLowerCase().includes(q)) ||
          k.meanings.some((m) => m.toLowerCase().includes(q)) ||
          Boolean(k.heisigNumber && (`#${k.heisigNumber}`.includes(q) || String(k.heisigNumber) === q)) ||
          Boolean(k.primitives && k.primitives.some((p) => p.toLowerCase().includes(q))) ||
          k.readingsOn.some((r) => r.includes(q)) ||
          k.readingsKun.some((r) => r.includes(q))
      );
    }

    result.sort((a, b) => {
      if (kanjiSortBy === "heisig") {
        const aNum = a.heisigNumber ?? 99999;
        const bNum = b.heisigNumber ?? 99999;
        return aNum - bNum;
      }
      if (kanjiSortBy === "strokes") {
        return a.strokes - b.strokes;
      }
      if (kanjiSortBy === "mastery") {
        return b.masteryPercent - a.masteryPercent;
      }
      return a.character.localeCompare(b.character);
    });

    return result;
  }, [allKanji, search, kanjiFilter, kanjiSortBy, selectedFolderFilter]);

  return { activeFolder, stats, filteredFolders, activeFolderEntries, unlistedKanjiCount, filteredAllKanji };
}
