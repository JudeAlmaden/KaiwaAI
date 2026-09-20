"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import { extractKanji } from "@/lib/kanji-utils";
import { speakJa, canSpeak } from "@/lib/speak";
import { generateKanjiMnemonicClient } from "@/lib/kanji-mnemonic-client";
import {
  BookBookmark,
  SpeakerHigh,
  Lightbulb,
  CheckCircle,
  X,
  Plus,
  PencilSimple,
  Sparkle,
  FolderSimple,
  FolderSimplePlus,
  Trash,
  FloppyDisk,
  CaretDown,
} from "@phosphor-icons/react";

type KanjiDetail = {
  id: string;
  character: string;
  strokes: number;
  grade: number | null;
  frequency: number | null;
  jlptLevel: number | null;
  heisigNumber?: number | null;
  heisigLesson?: number | null;
  heisigKeyword?: string | null;
  customMeaning?: string | null;
  meanings: string[];
  readingsOn: string[];
  readingsKun: string[];
  radicals: string[];
  wkLevel: number | null;
  mnemonic?: string | null;
  inReviews?: boolean;
  srsStage?: number;
};

type Folder = {
  id: string;
  name: string;
  lessonNumber: number | null;
  kind: string;
  total: number;
};

export default function KanjiBreakdown({ word }: { word: string }) {
  const kanjiChars = extractKanji(word);
  const [selectedKanji, setSelectedKanji] = useState<string | null>(null);
  const [kanjiData, setKanjiData] = useState<KanjiDetail | null>(null);
  const [loading, setLoading] = useState(false);

  // Folder state
  const [folders, setFolders] = useState<Folder[]>([]);
  const [foldersLoading, setFoldersLoading] = useState(false);
  const [foldersLoaded, setFoldersLoaded] = useState(false);
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [pickerFolderId, setPickerFolderId] = useState<string | null>(null);
  const [addingToFolder, setAddingToFolder] = useState(false);
  const [addedToFolderName, setAddedToFolderName] = useState<string | null>(null);

  // Inline create folder state
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Inline Mnemonic / Story Studio state
  const [isEditingStory, setIsEditingStory] = useState(false);
  const [storyDraft, setStoryDraft] = useState("");
  const [savingStory, setSavingStory] = useState(false);
  const [generatingStory, setGeneratingStory] = useState(false);
  const [storyError, setStoryError] = useState<string | null>(null);

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
        setStoryDraft(data.mnemonic || data.kanji.mnemonic || "");
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
    setShowFolderPicker(false);
    setPickerFolderId(null);
    setAddedToFolderName(null);
    setShowCreateFolder(false);
    setNewFolderName("");
    setIsEditingStory(false);
    setStoryError(null);
    loadKanjiDetail(kanji);
    loadFolders();
  }

  function handleClose() {
    setSelectedKanji(null);
    setKanjiData(null);
    setShowFolderPicker(false);
    setPickerFolderId(null);
    setAddedToFolderName(null);
    setShowCreateFolder(false);
    setNewFolderName("");
    setIsEditingStory(false);
    setStoryError(null);
  }

  // Inline AI Mnemonic Generation
  async function handleGenerateStory() {
    if (!kanjiData) return;
    setGeneratingStory(true);
    setStoryError(null);
    try {
      const primaryKw =
        kanjiData.customMeaning ||
        kanjiData.heisigKeyword ||
        kanjiData.meanings[0] ||
        kanjiData.character;

      const story = await generateKanjiMnemonicClient({
        character: kanjiData.character,
        meanings: kanjiData.meanings || [],
        radicals: kanjiData.radicals || [],
        heisigKeyword: primaryKw,
        heisigNumber: kanjiData.heisigNumber ?? undefined,
      });

      setStoryDraft(story);

      // Save the generated story
      const res = await fetch(`/api/kanji/${encodeURIComponent(kanjiData.character)}/mnemonic/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic: story }),
      });

      if (res.ok) {
        setKanjiData((prev) => (prev ? { ...prev, mnemonic: story } : null));
        setIsEditingStory(false);
      } else {
        setIsEditingStory(true); // Let user view and manually save if backend had an issue
      }
    } catch (err) {
      console.error("Failed to generate story:", err);
      setStoryError("Could not generate AI story. Please verify your Gemini API key in Settings.");
    } finally {
      setGeneratingStory(false);
    }
  }

  // Inline Mnemonic Save
  async function handleSaveStory() {
    if (!kanjiData) return;
    setSavingStory(true);
    setStoryError(null);
    try {
      const trimmed = storyDraft.trim();
      const res = await fetch(`/api/kanji/${encodeURIComponent(kanjiData.character)}/mnemonic/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic: trimmed }),
      });
      if (res.ok) {
        setKanjiData((prev) => (prev ? { ...prev, mnemonic: trimmed || null } : null));
        setIsEditingStory(false);
      } else {
        setStoryError("Failed to save mnemonic story.");
      }
    } catch (err) {
      console.error("Failed to save story:", err);
      setStoryError("Failed to save mnemonic story.");
    } finally {
      setSavingStory(false);
    }
  }

  // Add / Move to Folder
  async function handleAddToFolder(folderId?: string | null) {
    if (!kanjiData || addingToFolder) return;
    setAddingToFolder(true);
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
        setShowFolderPicker(false);
        setShowCreateFolder(false);
      }
    } catch (e) {
      console.error("Failed to add to folder:", e);
    } finally {
      setAddingToFolder(false);
    }
  }

  // Remove from Review Queue
  async function handleRemoveFromQueue() {
    if (!kanjiData || addingToFolder) return;
    setAddingToFolder(true);
    try {
      await fetch(`/api/kanji/${encodeURIComponent(kanjiData.character)}/learn`, {
        method: "DELETE",
      });
      setKanjiData((prev) => (prev ? { ...prev, inReviews: false } : null));
      setAddedToFolderName(null);
      setShowFolderPicker(false);
    } catch (e) {
      console.error(e);
    } finally {
      setAddingToFolder(false);
    }
  }

  // Create new folder & immediately assign
  async function handleCreateAndAdd() {
    if (!newFolderName.trim() || creatingFolder) return;
    setCreatingFolder(true);
    try {
      const res = await fetch("/api/kanji/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newFolderName.trim() }),
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
        setNewFolderName("");
        setShowCreateFolder(false);
        await handleAddToFolder(newFolder.id);
      }
    } catch (e) {
      console.error("Failed to create folder:", e);
    } finally {
      setCreatingFolder(false);
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
        if (showFolderPicker) {
          setShowFolderPicker(false);
        } else if (isEditingStory) {
          setIsEditingStory(false);
        } else {
          handleClose();
        }
      }
    };
    if (selectedKanji) {
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }
  }, [selectedKanji, showFolderPicker, isEditingStory]);

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
      <div className="mt-3 border-t-2 border-border/80 pt-3">
        <div className="mb-2 text-[10px] font-bold uppercase tracking-wider text-muted flex items-center gap-1.5">
          <BookBookmark size={13} className="text-indigo-ai" weight="duotone" />
          <span>Kanji in this word</span>
        </div>
        <div className="flex flex-wrap gap-2">
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
              <div className="flex items-start justify-between gap-3 border-b border-border/70 pb-4 mb-4">
                <div className="flex items-center gap-4 min-w-0">
                  <div className="font-jp text-5xl sm:text-6xl font-extrabold leading-none text-foreground shrink-0">
                    {selectedKanji}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {hasHeisig ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber/15 border border-amber/30 px-2.5 py-0.5 text-[10px] font-extrabold text-amber">
                          <BookBookmark size={11} weight="fill" />
                          <span>Heisig RTK</span>
                        </span>
                      ) : (
                        <span className="text-[10px] font-bold uppercase tracking-widest text-muted">
                          Kanji Breakdown
                        </span>
                      )}
                      {kanjiData?.jlptLevel && (
                        <span className="rounded-full bg-indigo-ai/10 border border-indigo-ai/20 px-2 py-0.5 text-[10px] font-bold text-indigo-ai">
                          JLPT N{kanjiData.jlptLevel}
                        </span>
                      )}
                      {kanjiData?.strokes && (
                        <span className="rounded-full bg-border/80 px-2 py-0.5 text-[10px] font-semibold text-muted">
                          {kanjiData.strokes} strokes
                        </span>
                      )}
                    </div>
                    <div className="flex items-baseline gap-2 mt-1">
                      <h3 className="font-display text-lg sm:text-xl font-extrabold text-foreground truncate">
                        {primaryKeyword}
                      </h3>
                      {kanjiData?.customMeaning && (
                        <span className="text-[10px] font-bold text-mint bg-mint/15 border border-mint/30 px-1.5 py-0.5 rounded-md">
                          Custom
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  {canSpeak() && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        speakJa(selectedKanji);
                      }}
                      className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-sky/30 bg-sky/10 text-sky hover:bg-sky/20 transition-colors"
                      title="Pronounce Kanji"
                      aria-label="Pronounce Kanji"
                    >
                      <SpeakerHigh size={16} weight="bold" />
                    </button>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleClose();
                    }}
                    className="flex h-8 w-8 items-center justify-center rounded-full border-2 border-border text-muted hover:border-foreground hover:text-foreground transition-colors"
                    aria-label="Close"
                  >
                    <X size={15} weight="bold" />
                  </button>
                </div>
              </div>

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
                  {/* 1. HEISIG RTK HERO BANNER */}
                  {hasHeisig && (
                    <div className="rounded-2xl border-2 border-amber/30 bg-gradient-to-br from-amber/10 via-card to-card p-3.5 space-y-2">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <span className="text-xs font-extrabold text-amber flex items-center gap-1">
                          <BookBookmark size={14} weight="fill" />
                          <span>Remembering the Kanji</span>
                        </span>
                        <div className="flex items-center gap-1.5">
                          {kanjiData.heisigNumber && (
                            <span className="rounded-md bg-amber/20 px-2 py-0.5 text-[11px] font-extrabold text-amber">
                              Frame #{kanjiData.heisigNumber}
                            </span>
                          )}
                          {kanjiData.heisigLesson && (
                            <span className="rounded-md bg-indigo-ai/15 px-2 py-0.5 text-[11px] font-extrabold text-indigo-ai">
                              Lesson {kanjiData.heisigLesson}
                            </span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-baseline gap-2">
                        <span className="text-xs text-muted font-bold">RTK Canonical Keyword:</span>
                        <span className="text-sm font-extrabold text-foreground tracking-tight">
                          {kanjiData.heisigKeyword || kanjiData.meanings[0]}
                        </span>
                      </div>
                    </div>
                  )}

                  {/* 2. DEFAULT DICTIONARY MEANINGS */}
                  <div className="space-y-1.5">
                    <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                      {hasHeisig ? "Dictionary Meanings (JMDict)" : "Meanings"}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {kanjiData.meanings.map((m, i) => (
                        <span
                          key={i}
                          className={`rounded-xl px-2.5 py-1 text-xs font-bold ${
                            !hasHeisig && i === 0
                              ? "bg-indigo-ai text-white shadow-xs"
                              : "bg-card border border-border text-foreground"
                          }`}
                        >
                          {m}
                        </span>
                      ))}
                    </div>
                  </div>

                  {/* 3. READINGS (ON & KUN) */}
                  <div className="rounded-2xl border border-border/80 bg-card/60 p-3 space-y-2 text-xs">
                    {kanjiData.readingsOn.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-sky shrink-0">
                          音 (On)
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {kanjiData.readingsOn.map((r, i) => (
                            <span
                              key={i}
                              className="font-jp rounded-lg bg-sky/15 px-2.5 py-0.5 text-xs font-semibold text-sky"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    {kanjiData.readingsKun.length > 0 && (
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber shrink-0">
                          訓 (Kun)
                        </span>
                        <div className="flex flex-wrap gap-1">
                          {kanjiData.readingsKun.map((r, i) => (
                            <span
                              key={i}
                              className="font-jp rounded-lg bg-amber/15 px-2.5 py-0.5 text-xs font-semibold text-amber"
                            >
                              {r}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* 4. PRIMITIVES & RADICALS */}
                  {kanjiData.radicals && kanjiData.radicals.length > 0 && (
                    <div className="rounded-2xl border border-border/80 bg-card/60 p-3 space-y-1.5">
                      <p className="text-[10px] font-extrabold uppercase tracking-wider text-muted">
                        {hasHeisig ? "Heisig Primitives & Radicals" : "Radical Components"}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        {kanjiData.radicals.map((radical, i) => (
                          <span
                            key={i}
                            className="rounded-lg bg-indigo-ai/10 border border-indigo-ai/20 px-2.5 py-0.5 text-xs font-bold text-indigo-ai"
                          >
                            {radical}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* 5. INLINE MNEMONIC & STORY STUDIO */}
                  <div className="rounded-2xl border-2 border-mint/30 bg-mint/5 p-3.5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold uppercase tracking-wider text-mint flex items-center gap-1.5">
                        <Lightbulb size={15} weight="fill" />
                        <span>{hasHeisig ? "RTK Mnemonic Story" : "Mnemonic / Study Notes"}</span>
                      </p>
                      <div className="flex items-center gap-1.5">
                        {!isEditingStory && (
                          <>
                            <button
                              type="button"
                              onClick={handleGenerateStory}
                              disabled={generatingStory}
                              className="inline-flex items-center gap-1 rounded-lg border border-mint/30 bg-mint/15 px-2 py-0.5 text-[11px] font-bold text-mint hover:bg-mint/25 transition-all disabled:opacity-50"
                              title="Generate an imaginative mnemonic story using AI"
                            >
                              <Sparkle size={12} weight="fill" />
                              <span>{generatingStory ? "Writing…" : "AI Story"}</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setStoryDraft(kanjiData.mnemonic || "");
                                setIsEditingStory(true);
                              }}
                              className="inline-flex items-center gap-1 rounded-lg border border-border bg-card px-2 py-0.5 text-[11px] font-bold text-foreground hover:border-mint transition-all"
                            >
                              <PencilSimple size={12} weight="bold" />
                              <span>{kanjiData.mnemonic ? "Edit" : "Write"}</span>
                            </button>
                          </>
                        )}
                      </div>
                    </div>

                    {storyError && (
                      <p className="text-[11px] text-rose-500 font-medium">{storyError}</p>
                    )}

                    {isEditingStory ? (
                      <div className="space-y-2 pt-1">
                        <textarea
                          value={storyDraft}
                          onChange={(e) => setStoryDraft(e.target.value)}
                          placeholder="Write or paste your mnemonic story here..."
                          rows={3}
                          autoFocus
                          className="w-full rounded-xl border-2 border-mint/40 bg-card p-3 text-xs leading-relaxed text-foreground outline-none focus:border-mint"
                        />
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => {
                              setIsEditingStory(false);
                              setStoryDraft(kanjiData.mnemonic || "");
                            }}
                            className="rounded-lg border border-border px-2.5 py-1 text-xs font-bold text-muted hover:text-foreground"
                          >
                            Cancel
                          </button>
                          <button
                            type="button"
                            onClick={handleSaveStory}
                            disabled={savingStory}
                            className="inline-flex items-center gap-1 rounded-lg bg-mint px-3 py-1 text-xs font-bold text-zinc-950 shadow-xs hover:brightness-105 disabled:opacity-50"
                          >
                            <FloppyDisk size={13} weight="bold" />
                            <span>{savingStory ? "Saving…" : "Save Story"}</span>
                          </button>
                        </div>
                      </div>
                    ) : kanjiData.mnemonic ? (
                      <p className="text-xs sm:text-sm leading-relaxed text-foreground font-medium pt-0.5 whitespace-pre-line">
                        {kanjiData.mnemonic}
                      </p>
                    ) : (
                      <div className="flex items-center justify-between gap-2 py-1 text-xs text-muted">
                        <span className="text-[11px] font-medium">No mnemonic story attached yet.</span>
                        <button
                          type="button"
                          onClick={handleGenerateStory}
                          disabled={generatingStory}
                          className="text-[11px] font-bold text-mint hover:underline inline-flex items-center gap-1"
                        >
                          <Sparkle size={12} weight="fill" />
                          <span>{generatingStory ? "Generating…" : "Generate with AI"}</span>
                        </button>
                      </div>
                    )}
                  </div>

                  {/* 6. INLINE FOLDER & SRS STUDY QUEUE ACTION */}
                  <div className="pt-3 border-t border-border/70 space-y-3">
                    {/* STATE A: Already added to user's lessons */}
                    {kanjiData.inReviews ? (
                      <div className="space-y-2">
                        <div className="flex items-center justify-between rounded-2xl bg-mint/10 border-2 border-mint/30 p-3.5 gap-2">
                          <div className="flex items-center gap-2.5 min-w-0">
                            <CheckCircle size={20} weight="fill" className="text-mint shrink-0" />
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-mint truncate">
                                {addedToFolderName ? `In ${addedToFolderName}` : "In Lesson Queue"}
                              </p>
                              <p className="text-[10px] text-mint/70 font-medium">
                                SRS Review Active · Stage {kanjiData.srsStage ?? 0}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setShowFolderPicker((prev) => !prev)}
                              className="rounded-xl border border-indigo-ai/30 bg-indigo-ai/10 px-2.5 py-1.5 text-xs font-bold text-indigo-ai hover:bg-indigo-ai/20 transition-all flex items-center gap-1"
                            >
                              <span>Move Folder</span>
                              <CaretDown size={12} weight="bold" />
                            </button>
                            <button
                              type="button"
                              onClick={handleRemoveFromQueue}
                              disabled={addingToFolder}
                              className="text-xs font-bold text-muted hover:text-rose-500 transition-colors disabled:opacity-50 p-1"
                              title="Remove from review queue"
                            >
                              <Trash size={15} />
                            </button>
                          </div>
                        </div>

                        {/* Move folder picker expandable */}
                        {showFolderPicker && (
                          <div className="rounded-2xl border-2 border-border/90 bg-card p-3 space-y-2.5 animate-fade-in">
                            <label className="text-[11px] font-bold text-foreground">
                              Select target folder:
                            </label>
                            <div className="flex items-center gap-2">
                              <select
                                value={pickerFolderId || ""}
                                onChange={(e) => setPickerFolderId(e.target.value || null)}
                                className="h-10 flex-1 rounded-xl border-2 border-border bg-bg px-3 text-xs font-semibold outline-none focus:border-indigo-ai"
                              >
                                {folders.map((f) => (
                                  <option key={f.id} value={f.id}>
                                    📁 {f.name} ({f.total} kanji)
                                  </option>
                                ))}
                              </select>
                              <button
                                type="button"
                                onClick={() => handleAddToFolder(pickerFolderId)}
                                disabled={addingToFolder || !pickerFolderId}
                                className="h-10 rounded-xl bg-indigo-ai px-3 text-xs font-bold text-white hover:brightness-105 transition-all disabled:opacity-50"
                              >
                                {addingToFolder ? "Moving…" : "Move"}
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      /* STATE B: Not yet in study queue */
                      <div className="space-y-2.5">
                        <div className="flex flex-col gap-2">
                          {/* 1-Click Primary Add Button */}
                          <button
                            type="button"
                            onClick={() => handleAddToFolder(pickerFolderId)}
                            disabled={addingToFolder}
                            className="btn-pop w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-ai border-indigo-deep text-white px-4 py-3 text-xs font-bold shadow-md shadow-indigo-ai/25 hover:brightness-105 transition-all disabled:opacity-50"
                          >
                            <Plus size={16} weight="bold" />
                            <span>
                              {addingToFolder
                                ? "Adding to Lesson Queue…"
                                : kanjiData.heisigLesson
                                ? `📁 Add to Lesson ${kanjiData.heisigLesson} Folder`
                                : "+ Add to Study Deck / Flashcards"}
                            </span>
                          </button>

                          {/* Secondary options toggle */}
                          <div className="flex items-center justify-between px-1">
                            <button
                              type="button"
                              onClick={() => setShowFolderPicker((prev) => !prev)}
                              className="text-[11px] font-bold text-indigo-ai hover:underline flex items-center gap-1"
                            >
                              <FolderSimple size={13} weight="bold" />
                              <span>
                                {showFolderPicker ? "Hide folder options" : "Choose / create custom folder"}
                              </span>
                            </button>
                            {foldersLoading && (
                              <span className="text-[10px] text-muted">Loading folders…</span>
                            )}
                          </div>
                        </div>

                        {/* Inline folder picker / creator dropdown */}
                        {showFolderPicker && (
                          <div className="rounded-2xl border-2 border-border bg-card/90 p-3.5 space-y-3 animate-fade-in">
                            {!showCreateFolder ? (
                              <div className="space-y-2">
                                <label className="text-[11px] font-bold text-foreground">
                                  Assign to folder:
                                </label>
                                <div className="flex items-center gap-2">
                                  <select
                                    value={pickerFolderId || ""}
                                    onChange={(e) => setPickerFolderId(e.target.value || null)}
                                    className="h-10 flex-1 rounded-xl border-2 border-border bg-bg px-3 text-xs font-semibold outline-none focus:border-indigo-ai"
                                  >
                                    <option value="">📁 Default Lesson / Review Deck</option>
                                    {folders.map((f) => (
                                      <option key={f.id} value={f.id}>
                                        📁 {f.name} ({f.total} kanji)
                                      </option>
                                    ))}
                                  </select>
                                  <button
                                    type="button"
                                    onClick={() => handleAddToFolder(pickerFolderId)}
                                    disabled={addingToFolder}
                                    className="h-10 rounded-xl bg-indigo-ai px-3.5 text-xs font-bold text-white hover:brightness-105 transition-all disabled:opacity-50"
                                  >
                                    {addingToFolder ? "Adding…" : "Save"}
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowCreateFolder(true)}
                                  className="text-[11px] font-bold text-mint hover:underline inline-flex items-center gap-1 pt-1"
                                >
                                  <FolderSimplePlus size={13} weight="bold" />
                                  <span>+ Create new custom folder</span>
                                </button>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                <label className="text-[11px] font-bold text-foreground">
                                  New Folder Name:
                                </label>
                                <div className="flex items-center gap-2">
                                  <input
                                    type="text"
                                    value={newFolderName}
                                    onChange={(e) => setNewFolderName(e.target.value)}
                                    placeholder="e.g. Radicals Set 1, N4 Verbs..."
                                    className="h-10 flex-1 rounded-xl border-2 border-border bg-bg px-3 text-xs font-medium outline-none focus:border-indigo-ai"
                                    autoFocus
                                    onKeyDown={(e) => {
                                      if (e.key === "Enter") handleCreateAndAdd();
                                    }}
                                  />
                                  <button
                                    type="button"
                                    onClick={handleCreateAndAdd}
                                    disabled={creatingFolder || !newFolderName.trim()}
                                    className="h-10 rounded-xl bg-mint px-3.5 text-xs font-bold text-zinc-950 hover:brightness-105 transition-all disabled:opacity-50"
                                  >
                                    {creatingFolder ? "Creating…" : "Create & Add"}
                                  </button>
                                </div>
                                <button
                                  type="button"
                                  onClick={() => setShowCreateFolder(false)}
                                  className="text-[11px] font-bold text-muted hover:underline"
                                >
                                  Cancel
                                </button>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
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
