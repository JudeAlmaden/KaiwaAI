"use client";

import { useCallback, useEffect, useState } from "react";
import type { Folder, KanjiCard } from "./types";

/**
 * Owns the kanji library data for the studio: the folder list, the flattened
 * "all my kanji" list, and the fetchers the rest of the screen mutates through.
 * Keeping it here leaves the component responsible for layout and events only.
 */
export function useKanjiLibrary() {
  const [folders, setFolders] = useState<Folder[]>([]);
  const [allKanji, setAllKanji] = useState<KanjiCard[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch("/api/kanji/groups");
      if (res.ok) {
        const data = await res.json();
        setFolders(data.groups || []);
      }
    } catch (e) {
      console.error("Failed to load folders:", e);
    }
  }, []);

  const loadAllKanji = useCallback(async () => {
    try {
      const res = await fetch("/api/kanji?source=learning&limit=1000&sortBy=heisig");
      if (res.ok) {
        const data = await res.json();
        setAllKanji(data.kanji || []);
      }
    } catch (e) {
      console.error("Failed to load all kanji:", e);
    }
  }, []);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      await Promise.all([loadFolders(), loadAllKanji()]);
    } finally {
      setLoading(false);
    }
  }, [loadFolders, loadAllKanji]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  return { folders, setFolders, allKanji, setAllKanji, loading, loadFolders, loadAllKanji, loadData };
}
