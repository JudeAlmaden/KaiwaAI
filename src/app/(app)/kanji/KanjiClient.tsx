"use client";

import { useEffect, useState, useMemo, useCallback } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../PageHeader";
import AddKanjiModal from "./AddKanjiModal";

type KanjiEntry = {
  id: string;
  order: number;
  kanjiId: string;
  character: string;
  heisigNumber?: number | null;
  heisigKeyword?: string | null;
  customMeaning?: string | null;
  mnemonic?: string | null;
  meanings: string[];
  strokes: number;
  isAdded: boolean;
  status: string | null;
};

type Folder = {
  id: string;
  name: string;
  description?: string | null;
  kind: string;
  lessonNumber?: number | null;
  order: number;
  createdAt: string;
  total: number;
  added: number;
  known: number;
  completionPct: number;
  entries: KanjiEntry[];
};

type KanjiCard = {
  id: string;
  character: string;
  meanings: string[];
  readingsOn: string[];
  readingsKun: string[];
  strokes: number;
  masteryPercent: number;
  inReviews: boolean;
  heisigNumber?: number | null;
  heisigLesson?: number | null;
  heisigKeyword?: string | null;
  hasMnemonic?: boolean;
};

export default function KanjiClient() {
  const router = useRouter();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [allKanji, setAllKanji] = useState<KanjiCard[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  // New Folder Modal state
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Add Kanji Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalFolderId, setAddModalFolderId] = useState<string | null>(null);

  // Load all user folders
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

  // Load all learning kanji for the "All Kanji" view
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
    await Promise.all([loadFolders(), loadAllKanji()]);
    setLoading(false);
  }, [loadFolders, loadAllKanji]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    loadData();
  }, [loadData]);

  // Selected folder object
  const activeFolder = useMemo(() => {
    if (!selectedFolderId) return null;
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  // Filtered folders for search
  const filteredFolders = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return folders;
    return folders.filter(
      (f) =>
        f.name.toLowerCase().includes(q) ||
        (f.description && f.description.toLowerCase().includes(q)) ||
        f.entries.some(
          (e) =>
            e.character.includes(q) ||
            (e.heisigKeyword && e.heisigKeyword.toLowerCase().includes(q))
        )
    );
  }, [folders, search]);

  // Filtered entries inside the active folder
  const activeFolderEntries = useMemo(() => {
    if (!activeFolder) return [];
    const q = search.trim().toLowerCase();
    if (!q) return activeFolder.entries;
    return activeFolder.entries.filter(
      (e) =>
        e.character.includes(q) ||
        (e.heisigKeyword && e.heisigKeyword.toLowerCase().includes(q)) ||
        (e.customMeaning && e.customMeaning.toLowerCase().includes(q)) ||
        (e.mnemonic && e.mnemonic.toLowerCase().includes(q)) ||
        (e.heisigNumber && `#${e.heisigNumber}`.includes(q))
    );
  }, [activeFolder, search]);

  // Filtered list for "All My Kanji" view
  const filteredAllKanji = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return allKanji;
    return allKanji.filter(
      (k) =>
        k.character.includes(q) ||
        (k.heisigKeyword && k.heisigKeyword.toLowerCase().includes(q)) ||
        k.meanings.some((m) => m.toLowerCase().includes(q)) ||
        (k.heisigNumber && `#${k.heisigNumber}`.includes(q))
    );
  }, [allKanji, search]);

  const handleCreateFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newFolderName.trim()) return;

    setCreatingFolder(true);
    try {
      const res = await fetch("/api/kanji/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newFolderName.trim(),
          description: newFolderDesc.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewFolderName("");
        setNewFolderDesc("");
        setIsNewFolderModalOpen(false);
        await loadFolders();
        if (data.group?.id) {
          setSelectedFolderId(data.group.id);
        }
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
    } finally {
      setCreatingFolder(false);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (!window.confirm("Are you sure you want to delete this folder? (Kanji cards will remain in your study queue)")) {
      return;
    }
    try {
      const res = await fetch(`/api/kanji/groups/${folderId}`, { method: "DELETE" });
      if (res.ok) {
        if (selectedFolderId === folderId) {
          setSelectedFolderId(null);
        }
        await loadFolders();
      }
    } catch (e) {
      console.error("Failed to delete folder:", e);
    }
  };

  const handleRemoveKanjiFromFolder = async (folderId: string, kanjiId: string) => {
    try {
      const res = await fetch(`/api/kanji/groups/${folderId}/entries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kanjiId }),
      });
      if (res.ok) {
        await loadFolders();
      }
    } catch (e) {
      console.error("Failed to remove kanji from folder:", e);
    }
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* Header */}
      <PageHeader
        title={activeFolder ? activeFolder.name : "Kanji Folders"}
        jp="漢字"
        subtitle={
          activeFolder
            ? `${activeFolder.entries.length} kanji in this lesson`
            : `${folders.length} lesson folder${folders.length !== 1 ? "s" : ""} · ${allKanji.length} kanji studied`
        }
        action={
          <div className="flex items-center gap-2">
            {!activeFolder && (
              <button
                onClick={() => setIsNewFolderModalOpen(true)}
                className="flex items-center gap-1.5 rounded-2xl border-2 border-border bg-card px-4 py-2 text-xs font-bold text-fg hover:border-indigo-ai hover:text-indigo-ai transition-all"
              >
                <span>📁 New Folder</span>
              </button>
            )}

            <button
              onClick={() => {
                setAddModalFolderId(activeFolder ? activeFolder.id : null);
                setIsAddModalOpen(true);
              }}
              className="flex items-center gap-1.5 rounded-2xl bg-indigo-ai px-4 py-2 text-xs font-bold text-white shadow-md shadow-indigo-ai/20 hover:bg-indigo-ai/90 transition-all hover:scale-105"
            >
              <span>＋ Add / Paste Kanji</span>
            </button>

            {activeFolder && activeFolder.entries.length > 0 && (
              <button
                onClick={() =>
                  router.push(
                    `/review?type=kanji&groupId=${encodeURIComponent(
                      activeFolder.id
                    )}&groupName=${encodeURIComponent(activeFolder.name)}&autostart=true`
                  )
                }
                className="flex items-center gap-1.5 rounded-2xl bg-emerald-500 px-4 py-2 text-xs font-bold text-white shadow-md shadow-emerald-500/20 hover:bg-emerald-600 transition-all"
              >
                <span>Study Lesson →</span>
              </button>
            )}
          </div>
        }
      />

      {/* Breadcrumb Bar when inside a folder */}
      {activeFolder && (
        <div className="flex items-center justify-between border-b-2 border-border bg-card/60 px-5 py-3 sm:px-8">
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSelectedFolderId(null);
                setSearch("");
              }}
              className="flex items-center gap-1 text-xs font-bold text-indigo-ai hover:underline"
            >
              <span>← All Folders</span>
            </button>
            <span className="text-muted text-xs">/</span>
            <span className="text-xs font-bold text-fg">{activeFolder.name}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => handleDeleteFolder(activeFolder.id)}
              className="text-xs font-semibold text-muted hover:text-rose-500 transition-colors"
              title="Delete folder"
            >
              🗑️ Delete Folder
            </button>
          </div>
        </div>
      )}

      {/* Search Bar */}
      <div className="border-b-2 border-border bg-bg/50 px-5 py-3 sm:px-8">
        <div className="mx-auto flex w-full max-w-4xl items-center gap-3">
          <div className="relative flex-1">
            <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-sm">
              🔍
            </span>
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                activeFolder
                  ? `Search in ${activeFolder.name} (kanji, keyword, story, #frame)...`
                  : "Search folders or kanji..."
              }
              className="h-11 w-full rounded-2xl border-2 border-border bg-card pl-10 pr-4 text-xs outline-none transition-all focus:border-indigo-ai focus:shadow-md focus:shadow-indigo-ai/10"
            />
            {search && (
              <button
                onClick={() => setSearch("")}
                className="absolute right-3 top-1/2 -translate-y-1/2 flex h-5 w-5 items-center justify-center rounded-full bg-border/50 text-[10px] text-muted hover:bg-border"
              >
                ✕
              </button>
            )}
          </div>

          {!activeFolder && (
            <button
              onClick={() => setSelectedFolderId("all-my-kanji")}
              className={`rounded-2xl border-2 px-4 py-2.5 text-xs font-bold transition-all whitespace-nowrap ${
                selectedFolderId === "all-my-kanji"
                  ? "border-indigo-ai bg-indigo-ai/10 text-indigo-ai"
                  : "border-border bg-card text-muted hover:text-fg"
              }`}
            >
              📚 All My Kanji ({allKanji.length})
            </button>
          )}
        </div>
      </div>

      {/* Main Body */}
      {loading ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 py-20">
          <div className="h-12 w-12 animate-spin rounded-full border-4 border-border border-t-indigo-ai" />
          <p className="text-xs text-muted animate-pulse">Loading your kanji lessons...</p>
        </div>
      ) : activeFolder ? (
        /* ── INSIDE A FOLDER (FOLDER DETAIL VIEW) ── */
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            {/* Top Info Banner */}
            <div className="flex flex-wrap items-center justify-between gap-4 rounded-3xl border-2 border-border bg-card p-5 shadow-sm">
              <div>
                <div className="flex items-center gap-2.5">
                  <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-ai/10 text-xl">
                    📁
                  </span>
                  <div>
                    <h3 className="font-display text-lg font-bold text-fg">{activeFolder.name}</h3>
                    {activeFolder.description && (
                      <p className="text-xs text-muted">{activeFolder.description}</p>
                    )}
                  </div>
                </div>
                <p className="mt-2 text-xs font-semibold text-muted">
                  {activeFolder.entries.length} kanji · {activeFolder.known} mastered ({activeFolder.completionPct}%)
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    setAddModalFolderId(activeFolder.id);
                    setIsAddModalOpen(true);
                  }}
                  className="rounded-2xl border-2 border-border bg-bg px-4 py-2 text-xs font-bold text-fg hover:border-indigo-ai hover:text-indigo-ai transition-all"
                >
                  ＋ Add Kanji
                </button>
                {activeFolder.entries.length > 0 && (
                  <button
                    onClick={() =>
                      router.push(
                        `/review?type=kanji&groupId=${encodeURIComponent(
                          activeFolder.id
                        )}&groupName=${encodeURIComponent(activeFolder.name)}&autostart=true`
                      )
                    }
                    className="rounded-2xl bg-indigo-ai px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-ai/20 hover:bg-indigo-ai/90 transition-all"
                  >
                    Study Lesson →
                  </button>
                )}
              </div>
            </div>

            {/* Kanji Cards in this Folder */}
            {activeFolderEntries.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-border p-10 text-center space-y-3">
                <div className="text-4xl">📄</div>
                <h4 className="font-display text-base font-bold text-fg">
                  {search ? "No matches in this folder" : "This folder is empty"}
                </h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  {search
                    ? "Try adjusting your search query."
                    : "Add kanji manually or paste a list from your Heisig RTK notes."}
                </p>
                <button
                  onClick={() => {
                    setAddModalFolderId(activeFolder.id);
                    setIsAddModalOpen(true);
                  }}
                  className="mt-2 rounded-full bg-indigo-ai px-5 py-2 text-xs font-bold text-white shadow-md shadow-indigo-ai/20 hover:scale-105 transition-all"
                >
                  ＋ Add Kanji to {activeFolder.name}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {activeFolderEntries.map((e) => (
                  <div
                    key={e.id}
                    onClick={() => router.push(`/kanji/${encodeURIComponent(e.character)}`)}
                    className="group relative flex cursor-pointer flex-col justify-between rounded-2xl border-2 border-border bg-card p-4 text-center transition-all hover:-translate-y-1 hover:border-indigo-ai/60 hover:shadow-lg"
                  >
                    {/* Top Row: Frame # + Remove Button */}
                    <div className="flex items-center justify-between">
                      {e.heisigNumber ? (
                        <span className="rounded-md bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-bold text-amber-500">
                          #{e.heisigNumber}
                        </span>
                      ) : (
                        <span />
                      )}
                      <button
                        onClick={(ev) => {
                          ev.stopPropagation();
                          handleRemoveKanjiFromFolder(activeFolder.id, e.kanjiId);
                        }}
                        className="opacity-0 group-hover:opacity-100 text-muted hover:text-rose-500 text-xs transition-opacity"
                        title="Remove from folder"
                      >
                        ✕
                      </button>
                    </div>

                    {/* Character */}
                    <div className="my-2 font-jp text-5xl font-bold leading-none text-fg group-hover:text-indigo-ai transition-colors">
                      {e.character}
                    </div>

                    {/* Keyword / Meaning */}
                    <div>
                      <p className="line-clamp-1 font-bold text-xs text-fg">
                        {e.heisigKeyword || e.customMeaning || e.meanings[0] || "Kanji"}
                      </p>

                      {/* Mnemonic Story Snippet */}
                      {e.mnemonic && (
                        <p className="mt-1 line-clamp-2 text-[10px] text-muted italic bg-bg/60 rounded-lg p-1.5 border border-border/40">
                          💡 {e.mnemonic}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : selectedFolderId === "all-my-kanji" ? (
        /* ── ALL MY KANJI VIEW ── */
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="mx-auto max-w-4xl space-y-4">
            <div className="flex items-center justify-between">
              <button
                onClick={() => setSelectedFolderId(null)}
                className="text-xs font-bold text-indigo-ai hover:underline"
              >
                ← Back to Folders
              </button>
              <span className="text-xs font-bold text-muted">{filteredAllKanji.length} Kanji</span>
            </div>

            {filteredAllKanji.length === 0 ? (
              <div className="p-12 text-center text-muted text-xs">No kanji in study list.</div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
                {filteredAllKanji.map((k) => (
                  <div
                    key={k.id}
                    onClick={() => router.push(`/kanji/${encodeURIComponent(k.character)}`)}
                    className="cursor-pointer rounded-2xl border-2 border-border bg-card p-4 text-center transition-all hover:-translate-y-1 hover:border-indigo-ai hover:shadow-md"
                  >
                    <div className="font-jp text-4xl font-bold text-fg">{k.character}</div>
                    <p className="mt-1 line-clamp-1 text-xs font-bold text-fg">
                      {k.heisigKeyword || k.meanings[0]}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        /* ── ROOT FOLDERS VIEW (FOLDER GRID) ── */
        <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
          <div className="mx-auto max-w-4xl space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-xs font-bold uppercase tracking-wider text-muted">
                Your Folders & Lessons
              </h3>
              <span className="text-xs text-muted">{filteredFolders.length} folders</span>
            </div>

            {filteredFolders.length === 0 ? (
              <div className="rounded-3xl border-2 border-dashed border-border p-12 text-center space-y-3">
                <div className="text-5xl">📁</div>
                <h4 className="font-display text-base font-bold text-fg">No folders created yet</h4>
                <p className="text-xs text-muted max-w-sm mx-auto">
                  Create your first lesson folder (e.g. &quot;Lesson 1: Strokes&quot;) and add kanji from your RTK notes!
                </p>
                <button
                  onClick={() => setIsNewFolderModalOpen(true)}
                  className="mt-3 rounded-full bg-indigo-ai px-6 py-2.5 text-xs font-bold text-white shadow-md shadow-indigo-ai/20 hover:scale-105 transition-all"
                >
                  ＋ Create &quot;Lesson 1&quot; Folder
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                {filteredFolders.map((folder) => (
                  <div
                    key={folder.id}
                    onClick={() => setSelectedFolderId(folder.id)}
                    className="group relative flex cursor-pointer flex-col justify-between rounded-3xl border-2 border-border bg-card p-5 transition-all hover:-translate-y-1 hover:border-indigo-ai/60 hover:shadow-xl hover:shadow-indigo-ai/5"
                  >
                    <div>
                      {/* Folder Icon & Title */}
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex items-center gap-3">
                          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-ai/10 text-2xl group-hover:scale-110 transition-transform">
                            📁
                          </span>
                          <div>
                            <h4 className="font-display text-base font-bold text-fg group-hover:text-indigo-ai transition-colors">
                              {folder.name}
                            </h4>
                            <p className="text-[11px] font-semibold text-indigo-ai">
                              {folder.entries.length} kanji
                            </p>
                          </div>
                        </div>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteFolder(folder.id);
                          }}
                          className="opacity-0 group-hover:opacity-100 text-muted hover:text-rose-500 text-xs p-1 transition-all"
                          title="Delete folder"
                        >
                          ✕
                        </button>
                      </div>

                      {folder.description && (
                        <p className="mt-3 text-xs text-muted line-clamp-2">{folder.description}</p>
                      )}

                      {/* Mini Preview of First 4 Kanji */}
                      {folder.entries.length > 0 && (
                        <div className="mt-4 flex items-center gap-1.5 overflow-hidden">
                          {folder.entries.slice(0, 5).map((e) => (
                            <span
                              key={e.id}
                              className="font-jp text-lg font-bold rounded-lg bg-bg/80 border border-border/50 px-2 py-0.5 text-fg"
                            >
                              {e.character}
                            </span>
                          ))}
                          {folder.entries.length > 5 && (
                            <span className="text-[10px] font-bold text-muted px-1">
                              +{folder.entries.length - 5}
                            </span>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Footer / Study Button */}
                    <div className="mt-5 flex items-center gap-2 pt-3 border-t border-border/40">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (folder.entries.length > 0) {
                            router.push(
                              `/review?type=kanji&groupId=${encodeURIComponent(
                                folder.id
                              )}&groupName=${encodeURIComponent(folder.name)}&autostart=true`
                            );
                          } else {
                            setSelectedFolderId(folder.id);
                          }
                        }}
                        className="flex-1 rounded-xl bg-indigo-ai py-2 text-center text-xs font-bold text-white hover:bg-indigo-ai/90 shadow-sm shadow-indigo-ai/20 transition-all"
                      >
                        {folder.entries.length > 0 ? "Study Lesson →" : "Open Folder"}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── CREATE NEW FOLDER MODAL ── */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl border-2 border-border bg-card p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/50 pb-3">
              <div className="flex items-center gap-2">
                <span className="text-xl">📁</span>
                <h3 className="font-display text-base font-bold">Create Lesson Folder</h3>
              </div>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-muted hover:text-fg text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-fg mb-1">
                  Folder Name <span className="text-rose-500">*</span>
                </label>
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Lesson 1, Lesson 2: Strokes, Radicals..."
                  className="h-11 w-full rounded-2xl border-2 border-border bg-bg px-4 text-xs outline-none focus:border-indigo-ai"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-fg mb-1">Description (Optional)</label>
                <input
                  value={newFolderDesc}
                  onChange={(e) => setNewFolderDesc(e.target.value)}
                  placeholder="e.g. Basic strokes and numbers 1-25"
                  className="h-11 w-full rounded-2xl border-2 border-border bg-bg px-4 text-xs outline-none focus:border-indigo-ai"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-muted hover:bg-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="rounded-xl bg-indigo-ai px-5 py-2 text-xs font-bold text-white hover:bg-indigo-ai/90 disabled:opacity-50 transition-all"
                >
                  {creatingFolder ? "Creating..." : "Create Folder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── ADD / IMPORT KANJI MODAL ── */}
      <AddKanjiModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onKanjiAdded={() => {
          loadData();
        }}
        groups={folders.map((f) => ({ id: f.id, name: f.name, type: f.kind }))}
        initialGroupId={addModalFolderId}
      />
    </div>
  );
}
