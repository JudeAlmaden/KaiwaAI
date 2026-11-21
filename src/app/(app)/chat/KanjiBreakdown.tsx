"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { extractKanji } from "@/lib/kanji-utils";
import { BookBookmark } from "@phosphor-icons/react";

import type { Folder, KanjiDetail } from "./kanji-breakdown/types";
import KanjiGlyphHeader from "./kanji-breakdown/KanjiGlyphHeader";
import KanjiDetailsBody from "./kanji-breakdown/KanjiDetailsBody";
import KanjiMnemonicSection from "./kanji-breakdown/KanjiMnemonicSection";
import KanjiFolderActions from "./kanji-breakdown/KanjiFolderActions";

export default function KanjiBreakdown({
  word,
  center = false,
}: {
  word: string;
  center?: boolean;
}) {
  const kanjiChars = extractKanji(word);
  const [selectedKanji, setSelectedKanji] = useState<string | null>(null);
  const [kanjiData, setKanjiData] = useState<KanjiDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Folder state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersLoaded, setFoldersLoaded] = useState(false);
  const [pickerFolderId, setPickerFolderId] = useState<string | null>(null);
  const [addedToFolderName, setAddedToFolderName] = useState<string | null>(null);

  async function loadKanjiDetail(kanji: string) {
    setLoading(true);
    try {
      const res = await fetch(`/api/kanji/${encodeURIComponent(kanji)}`);
      if (res.ok) {
        const data = await res.json();
        const primaryGroup = data.groups?.[0] ?? null;
        setKanjiData({
          ...data.kanji,
          customMeaning: data.userKanji?.customMeaning || data.kanji.customMeaning || null,
          srsStage: data.userKanji?.srsStage ?? 0,
          mnemonic: data.mnemonic || data.kanji.mnemonic || null,
          inReviews: data.inReviews,
        });
        if (primaryGroup) {
          setAddedToFolderName(primaryGroup.name);
          setPickerFolderId(primaryGroup.id);
        } else {
          setAddedToFolderName(null);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadFolders() {
    if (foldersLoaded) return;
    setFoldersLoading(true);
    try {
      const res = await fetch("/api/kanji/groups");
      if (res.ok) {
        const data = await res.json();
        const mapped: Folder[] = (data.groups || []).map(
          (g: { id: string; name: string; lessonNumber: number | null; kind: string; entries: unknown[] }) => ({
            id: g.id,
            name: g.name,
            lessonNumber: g.lessonNumber,
            kind: g.kind,
            total: g.entries?.length ?? 0,
          })
        );
        setFolders(mapped);
        setFoldersLoaded(true);
      }
    } catch (err) {
      console.error("Failed to load folders:", err);
    } finally {
      setFoldersLoading(false);
    }
  }

  function handleKanjiClick(kanji: string) {
    setSelectedKanji(kanji);
    setPickerFolderId(null);
    setAddedToFolderName(null);
    loadKanjiDetail(kanji);
    loadFolders();
  }

  function handleClose() {
    setSelectedKanji(null);
    setKanjiData(null);
    setPickerFolderId(null);
    setAddedToFolderName(null);
  }

  // Add / Move to Folder
  async function handleAddToFolder(folderId?: string | null) {
    if (!kanjiData) return;
    try {
      const res = await fetch(`/api/kanji/${encodeURIComponent(kanjiData.character)}/learn`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mnemonic: kanjiData.mnemonic,
          groupId: folderId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const targetGroup = data.group;
        if (targetGroup) {
          setAddedToFolderName(targetGroup.name);
          setPickerFolderId(targetGroup.id);
          // Ensure folder exists in local folders list
          setFolders((prev) => {
            if (prev.some((f) => f.id === targetGroup.id)) return prev;
            return [
              ...prev,
              {
                id: targetGroup.id,
                name: targetGroup.name,
                lessonNumber: targetGroup.lessonNumber ?? null,
                kind: targetGroup.kind ?? "custom",
                total: 1,
              },
            ];
          });
        } else {
          setAddedToFolderName("Lesson Folders");
        }
        setKanjiData((prev) => (prev ? { ...prev, inReviews: true } : null));
      }
    } catch (e) {
      console.error("Failed to add to folder:", e);
    }
  }

  // Remove from Review Queue
  async function handleRemoveFromQueue() {
    if (!kanjiData) return;
    try {
      await fetch(`/api/kanji/${encodeURIComponent(kanjiData.character)}/learn`, {
        method: "DELETE",
      });
      setKanjiData((prev) => (prev ? { ...prev, inReviews: false } : null));
      setAddedToFolderName(null);
    } catch (e) {
      console.error(e);
    }
  }

  // Create new folder & immediately assign
  async function handleCreateAndAdd(name: string) {
    if (!name.trim()) return;
    try {
      const res = await fetch("/api/kanji/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim() }),
      });
      if (res.ok) {
        const data = await res.json();
        const newFolder: Folder = {
          id: data.group.id,
          name: data.group.name,
          lessonNumber: data.group.lessonNumber ?? null,
          kind: data.group.kind ?? "custom",
          total: 1,
        };
        setFolders((prev) => [...prev, newFolder]);
        setPickerFolderId(newFolder.id);
        await handleAddToFolder(newFolder.id);
      }
    } catch (e) {
      console.error("Failed to create folder:", e);
    }
  }

  // Match default picker to kanji lesson if available
  useEffect(() => {
    /* eslint-disable react-hooks/set-state-in-effect -- sync folder picker with loaded folders */
    if (kanjiData?.heisigLesson && folders.length > 0) {
      const match = folders.find(
        (f) => f.kind === "heisig_lesson" && f.lessonNumber === kanjiData.heisigLesson
      );
      if (match && match.id !== pickerFolderId) {
        setPickerFolderId(match.id);
      } else if (!pickerFolderId && folders[0]) {
        setPickerFolderId(folders[0].id);
      }
    } else if (folders.length > 0 && !pickerFolderId && folders[0]) {
      setPickerFolderId(folders[0].id);
    }
    /* eslint-enable react-hooks/set-state-in-effect */
  }, [kanjiData?.heisigLesson, folders, pickerFolderId]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        handleClose();
      }
    };
    if (selectedKanji) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedKanji]);

  if (kanjiChars.length === 0) return null;

  // Determine Heisig RTK status
  const hasHeisig = Boolean(
    kanjiData &&
    (kanjiData.heisigKeyword ||
      kanjiData.heisigNumber ||
      kanjiData.heisigLesson)
  );

  const primaryKeyword =
    kanjiData?.customMeaning ||
    kanjiData?.heisigKeyword ||
    kanjiData?.meanings[0] ||
    "Kanji";

  return (
    <>
      {/* Kanji chip strip inside WordToken or Flashcard */}
      <div className={`mt-3 border-t-2 border-border/80 pt-3 ${center ? "w-full" : ""}`}>
        <div className={`mb-2 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5 ${center ? "justify-center" : ""}`}>
          <BookBookmark size={13} className="text-indigo-ai" weight="duotone" />
          <span>Kanji in this word</span>
        </div>
        <div className={`flex flex-wrap gap-2 ${center ? "justify-center" : ""}`}>
          {kanjiChars.map((kanji, i) => (
            <button
              key={i}
              onClick={(e) => {
                e.stopPropagation();
                handleKanjiClick(kanji);
              }}
              className="flex h-10 w-10 items-center justify-center rounded-xl border-2 border-border/80 bg-card font-jp text-xl font-bold text-foreground shadow-xs transition-all hover:-translate-y-0.5 hover:border-indigo-ai hover:bg-indigo-ai/10 hover:text-indigo-ai active:scale-95"
              title={`Explore ${kanji}`}
            >
              {kanji}
            </button>
          ))}
        </div>
      </div>

      {/* Modal portal */}
      {selectedKanji &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            data-kanji-modal="true"
            data-token-selection-ui="true"
            className="fixed inset-0 z-[99999] flex items-end justify-center bg-black/50 backdrop-blur-xs px-4 py-6 sm:items-center animate-fade-in"
            onClick={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
            onTouchEnd={(e) => {
              if (e.target === e.currentTarget) handleClose();
            }}
          >
            <div
              data-kanji-modal="true"
              data-token-selection-ui="true"
              className="relative z-[99999] max-h-[88vh] w-full max-w-lg overflow-y-auto rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-2xl"
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              onMouseDown={(e) => e.stopPropagation()}
              onTouchEnd={(e) => e.stopPropagation()}
            >
              {/* HEADER */}
              <KanjiGlyphHeader
                selectedKanji={selectedKanji}
                kanjiData={kanjiData}
                hasHeisig={hasHeisig}
                primaryKeyword={primaryKeyword}
                onClose={handleClose}
              />

              {/* BODY */}
              {loading ? (
                <div className="flex flex-col items-center justify-center gap-3 py-10">
                  <div className="animate-pulse rounded-2xl bg-indigo-ai/10 h-16 w-16 flex items-center justify-center">
                    <span className="font-jp text-3xl font-bold text-indigo-ai">{selectedKanji}</span>
                  </div>
                  <p className="text-xs text-muted animate-pulse font-medium">Loading kanji details…</p>
                </div>
              ) : kanjiData ? (
                <div className="space-y-4">
                  <KanjiDetailsBody kanjiData={kanjiData} hasHeisig={hasHeisig} />

                  <KanjiMnemonicSection
                    kanjiData={kanjiData}
                    hasHeisig={hasHeisig}
                    onMnemonicUpdated={(mnemonic) =>
                      setKanjiData((prev) => (prev ? { ...prev, mnemonic } : null))
                    }
                  />

                  <KanjiFolderActions
                    kanjiData={kanjiData}
                    folders={folders}
                    foldersLoading={foldersLoading}
                    pickerFolderId={pickerFolderId}
                    addedToFolderName={addedToFolderName}
                    onSetPickerFolderId={setPickerFolderId}
                    onAddToFolder={handleAddToFolder}
                    onRemoveFromQueue={handleRemoveFromQueue}
                    onCreateAndAdd={handleCreateAndAdd}
                  />
                </div>
              ) : (
                <div className="py-8 text-center space-y-2">
                  <div className="text-3xl">❌</div>
                  <p className="text-sm font-medium text-muted">Couldn&apos;t load kanji details</p>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
