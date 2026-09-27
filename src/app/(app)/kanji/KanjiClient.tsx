"use client";

import { useEffect, useState, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import AddKanjiModal from "./AddKanjiModal";
import { compressImageToDataUrl } from "@/lib/image-compress";
import { speakJa, canSpeak } from "@/lib/speak";

export type KanjiEntry = {
  id: string;
  order: number;
  kanjiId: string;
  character: string;
  heisigNumber?: number | null;
  heisigKeyword?: string | null;
  customMeaning?: string | null;
  mnemonic?: string | null;
  primitives?: string[];
  meanings: string[];
  readingsOn?: string[];
  readingsKun?: string[];
  strokes: number;
  isAdded: boolean;
  status: string | null;
};

export type Folder = {
  id: string;
  name: string;
  description?: string | null;
  images?: string[];
  imageCount?: number;
  thumbnail?: string | null;
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

export type KanjiCard = {
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
  primitives?: string[];
  hasMnemonic?: boolean;
  learningStatus?: "new" | "learning" | "known" | null;
  groupIds?: string[];
  groups?: { id: string; name: string; lessonNumber?: number | null }[];
};

type ViewMode = "folders" | "all";
type FilterMode = "All" | "Learning" | "Known";

// Inline token parser for markdown: **bold**, *italic*, `code`, [label](url)
function renderInlineTokens(str: string): React.ReactNode {
  const tokens = str.split(/(\*\*.*?\*\*|\*.*?\*|`.*?`|\[.*?\]\(.*?\))/g);
  return tokens.map((tok, i) => {
    if (tok.startsWith("**") && tok.endsWith("**") && tok.length >= 4) {
      return (
        <strong key={i} className="font-semibold text-fg">
          {tok.slice(2, -2)}
        </strong>
      );
    }
    if (tok.startsWith("*") && tok.endsWith("*") && tok.length >= 2) {
      return (
        <em key={i} className="italic text-fg/90">
          {tok.slice(1, -1)}
        </em>
      );
    }
    if (tok.startsWith("`") && tok.endsWith("`") && tok.length >= 2) {
      return (
        <code
          key={i}
          className="rounded bg-bg border border-border px-1 py-0.5 font-mono text-[11px] text-indigo-ai"
        >
          {tok.slice(1, -1)}
        </code>
      );
    }
    const linkMatch = tok.match(/^\[(.*?)\]\((.*?)\)$/);
    if (linkMatch) {
      return (
        <a
          key={i}
          href={linkMatch[2]}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-ai underline underline-offset-2 hover:opacity-80"
        >
          {linkMatch[1]}
        </a>
      );
    }
    return tok;
  });
}

// Clean markdown formatted text renderer
export function FormattedText({
  text,
  className = "",
}: {
  text?: string | null;
  className?: string;
}) {
  if (!text) return null;

  const lines = text.split("\n");

  return (
    <div className={`space-y-1.5 text-xs leading-relaxed ${className}`}>
      {lines.map((line, idx) => {
        const trimmed = line.trim();
        if (!trimmed) {
          return <div key={idx} className="h-1" />;
        }

        // Headings
        if (line.startsWith("### ")) {
          return (
            <h5 key={idx} className="font-semibold text-fg text-xs mt-2 pt-0.5">
              {renderInlineTokens(line.slice(4))}
            </h5>
          );
        }
        if (line.startsWith("## ")) {
          return (
            <h4 key={idx} className="font-bold text-fg text-sm mt-2 pt-0.5">
              {renderInlineTokens(line.slice(3))}
            </h4>
          );
        }
        if (line.startsWith("# ")) {
          return (
            <h3 key={idx} className="font-bold text-fg text-base mt-2.5 pt-0.5">
              {renderInlineTokens(line.slice(2))}
            </h3>
          );
        }

        // Blockquotes
        if (line.startsWith("> ")) {
          return (
            <div
              key={idx}
              className="border-l-2 border-indigo-ai/60 pl-2.5 italic text-fg/85 my-1 bg-indigo-ai/5 py-1 rounded-r"
            >
              {renderInlineTokens(line.slice(2))}
            </div>
          );
        }

        // Bullet lists
        if (/^[-*]\s+/.test(trimmed)) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 text-fg/90">
              <span className="text-indigo-ai text-[10px] leading-tight mt-0.5 font-bold">•</span>
              <span>{renderInlineTokens(trimmed.replace(/^[-*]\s+/, ""))}</span>
            </div>
          );
        }

        // Numbered lists
        const numMatch = trimmed.match(/^(\d+)\.\s+(.*)$/);
        if (numMatch) {
          return (
            <div key={idx} className="flex items-start gap-1.5 pl-1 text-fg/90">
              <span className="font-mono text-[10px] text-indigo-ai font-semibold">{numMatch[1]}.</span>
              <span>{renderInlineTokens(numMatch[2])}</span>
            </div>
          );
        }

        // Normal paragraph line
        return (
          <p key={idx} className="text-fg/80">
            {renderInlineTokens(line)}
          </p>
        );
      })}
    </div>
  );
}



export default function KanjiClient() {
  const router = useRouter();

  const [folders, setFolders] = useState<Folder[]>([]);
  const [allKanji, setAllKanji] = useState<KanjiCard[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>("folders");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [folderSortBy, setFolderSortBy] = useState<"lesson" | "count" | "completion" | "recent">("lesson");
  const [kanjiSortBy, setKanjiSortBy] = useState<"heisig" | "strokes" | "mastery" | "recent">("heisig");
  const [kanjiFilter, setKanjiFilter] = useState<FilterMode>("All");
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  // Selected Kanji for Quick Detail Sheet
  const [selectedKanji, setSelectedKanji] = useState<{
    character: string;
    heisigNumber?: number | null;
    keyword?: string | null;
    meanings: string[];
    readingsOn?: string[];
    readingsKun?: string[];
    strokes?: number;
    primitives?: string[];
    mnemonic?: string | null;
    status?: string | null;
    masteryPercent?: number;
    kanjiId?: string;
    groups?: { id: string; name: string; lessonNumber?: number | null }[];
  } | null>(null);



  // New Folder Modal state
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderLesson, setNewFolderLesson] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  // Edit Folder Modal state
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderLesson, setEditFolderLesson] = useState("");
  const [editFolderDesc, setEditFolderDesc] = useState("");
  const [editFolderImages, setEditFolderImages] = useState<string[]>([]);
  const [savingFolder, setSavingFolder] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Lightbox zoom modal state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

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

  // Selected folder object
  const activeFolder = useMemo(() => {
    if (!selectedFolderId || selectedFolderId === "all-my-kanji") return null;
    return folders.find((f) => f.id === selectedFolderId) || null;
  }, [folders, selectedFolderId]);

  // Overall stats
  const stats = useMemo(() => {
    const total = allKanji.length;
    const known = allKanji.filter(
      (k) => k.learningStatus === "known" || k.masteryPercent >= 80
    ).length;
    const learning = Math.max(0, total - known);
    const pct = total > 0 ? Math.round((known / total) * 100) : 0;
    return { total, known, learning, pct };
  }, [allKanji]);

  // Filtered and sorted folders
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
        return f.entries.some(
          (e) =>
            e.character.includes(q) ||
            (e.heisigKeyword && e.heisigKeyword.toLowerCase().includes(q)) ||
            (e.customMeaning && e.customMeaning.toLowerCase().includes(q)) ||
            (e.mnemonic && e.mnemonic.toLowerCase().includes(q)) ||
            (e.heisigNumber && (`#${e.heisigNumber}`.includes(q) || String(e.heisigNumber) === q)) ||
            (e.primitives && e.primitives.some((p) => p.toLowerCase().includes(q))) ||
            e.meanings.some((m) => m.toLowerCase().includes(q))
        );
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
        (e.heisigNumber && (`#${e.heisigNumber}`.includes(q) || String(e.heisigNumber) === q)) ||
        (e.primitives && e.primitives.some((p) => p.toLowerCase().includes(q))) ||
        e.meanings.some((m) => m.toLowerCase().includes(q))
    );
  }, [activeFolder, search]);

  // Count of kanji that do not belong to any folder
  const unlistedKanjiCount = useMemo(() => {
    return allKanji.filter((k) => !k.groupIds || k.groupIds.length === 0).length;
  }, [allKanji]);

  // Filtered & sorted list for "All My Kanji" view
  const filteredAllKanji = useMemo(() => {
    let result = [...allKanji];
    const q = search.trim().toLowerCase();

    if (kanjiFilter === "Learning") {
      result = result.filter((k) => k.learningStatus !== "known" && k.masteryPercent < 80);
    } else if (kanjiFilter === "Known") {
      result = result.filter((k) => k.learningStatus === "known" || k.masteryPercent >= 80);
    }

    // Filter by Folder or Unlisted
    if (selectedFolderFilter === "unlisted") {
      result = result.filter((k) => !k.groupIds || k.groupIds.length === 0);
    } else if (selectedFolderFilter !== "all") {
      result = result.filter((k) => k.groupIds && k.groupIds.includes(selectedFolderFilter));
    }

    if (q) {
      result = result.filter(
        (k) =>
          k.character.includes(q) ||
          (k.heisigKeyword && k.heisigKeyword.toLowerCase().includes(q)) ||
          k.meanings.some((m) => m.toLowerCase().includes(q)) ||
          (k.heisigNumber && (`#${k.heisigNumber}`.includes(q) || String(k.heisigNumber) === q)) ||
          (k.primitives && k.primitives.some((p) => p.toLowerCase().includes(q))) ||
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



  // Delete Kanji completely from user's study deck
  const handleDeleteKanji = async (character: string) => {
    if (!window.confirm(`Are you sure you want to delete "${character}" from your study list?`)) {
      return;
    }

    // Optimistic removal from state
    setAllKanji((prev) => prev.filter((k) => k.character !== character));
    setFolders((prev) =>
      prev.map((f) => ({
        ...f,
        entries: f.entries.filter((e) => e.character !== character),
        total: f.entries.filter((e) => e.character !== character).length,
      }))
    );
    if (selectedKanji?.character === character) {
      setSelectedKanji(null);
    }

    try {
      const res = await fetch(`/api/kanji/${encodeURIComponent(character)}/learn`, {
        method: "DELETE",
      });
      if (!res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error("Failed to delete kanji:", err);
      await loadData();
    }
  };

  // Remove a kanji from a specific folder
  const handleRemoveKanjiFromFolder = async (folderId: string, kanjiId: string, char?: string) => {
    if (!window.confirm(`Remove "${char || "this kanji"}" from this folder?`)) {
      return;
    }

    // Optimistic update
    setFolders((prev) =>
      prev.map((f) =>
        f.id === folderId
          ? {
              ...f,
              entries: f.entries.filter((e) => e.kanjiId !== kanjiId),
              total: f.entries.filter((e) => e.kanjiId !== kanjiId).length,
            }
          : f
      )
    );

    try {
      const res = await fetch(`/api/kanji/groups/${folderId}/entries`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kanjiId }),
      });
      if (!res.ok) {
        await loadFolders();
      }
    } catch (e) {
      console.error("Failed to remove kanji from folder:", e);
      await loadFolders();
    }
  };

  // Mark kanji as known
  const handleMarkKnown = async (character: string) => {
    try {
      const res = await fetch(`/api/kanji/${encodeURIComponent(character)}/learn`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markKnown" }),
      });
      if (res.ok) {
        setAllKanji((prev) =>
          prev.map((k) =>
            k.character === character ? { ...k, learningStatus: "known", masteryPercent: 100 } : k
          )
        );
        setFolders((prev) =>
          prev.map((f) => ({
            ...f,
            entries: f.entries.map((e) =>
              e.character === character ? { ...e, status: "known" } : e
            ),
          }))
        );
        if (selectedKanji?.character === character) {
          setSelectedKanji((prev) =>
            prev ? { ...prev, status: "known", masteryPercent: 100 } : null
          );
        }
      }
    } catch (err) {
      console.error("Failed to mark known:", err);
    }
  };

  // Reset kanji progress
  const handleResetProgress = async (character: string) => {
    try {
      const res = await fetch(`/api/kanji/${encodeURIComponent(character)}/learn`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset" }),
      });
      if (res.ok) {
        setAllKanji((prev) =>
          prev.map((k) =>
            k.character === character ? { ...k, learningStatus: "new", masteryPercent: 0 } : k
          )
        );
        setFolders((prev) =>
          prev.map((f) => ({
            ...f,
            entries: f.entries.map((e) =>
              e.character === character ? { ...e, status: "new" } : e
            ),
          }))
        );
        if (selectedKanji?.character === character) {
          setSelectedKanji((prev) =>
            prev ? { ...prev, status: "new", masteryPercent: 0 } : null
          );
        }
      }
    } catch (err) {
      console.error("Failed to reset progress:", err);
    }
  };

  // Create folder
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
          lessonNumber: newFolderLesson.trim() ? Number(newFolderLesson) : undefined,
          description: newFolderDesc.trim() || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setNewFolderName("");
        setNewFolderLesson("");
        setNewFolderDesc("");
        setIsNewFolderModalOpen(false);
        await loadFolders();
        if (data.group?.id) {
          setSelectedFolderId(data.group.id);
          setViewMode("folders");
        }
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
    } finally {
      setCreatingFolder(false);
    }
  };

  // Open edit folder modal
  const handleOpenEditFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditFolderName(folder.name);
    setEditFolderLesson(folder.lessonNumber ? String(folder.lessonNumber) : "");
    setEditFolderDesc(folder.description || "");
    setEditFolderImages(folder.images || []);
    setImageUploadError(null);
    setIsEditFolderModalOpen(true);
  };

  // Save edit folder
  const handleSaveEditFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingFolderId || !editFolderName.trim()) return;

    setSavingFolder(true);
    try {
      const res = await fetch(`/api/kanji/groups/${editingFolderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFolderName.trim(),
          lessonNumber: editFolderLesson.trim() ? Number(editFolderLesson) : null,
          description: editFolderDesc.trim() || null,
          images: editFolderImages,
        }),
      });

      if (res.ok) {
        setIsEditFolderModalOpen(false);
        await loadFolders();
      }
    } catch (err) {
      console.error("Failed to update folder:", err);
    } finally {
      setSavingFolder(false);
    }
  };

  // Image select
  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (editFolderImages.length >= 6) {
      setImageUploadError("Maximum of 6 images allowed per folder.");
      return;
    }

    setCompressingImage(true);
    setImageUploadError(null);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setEditFolderImages((prev) => [...prev, dataUrl]);
    } catch (err) {
      setImageUploadError(err instanceof Error ? err.message : "Failed to compress image");
    } finally {
      setCompressingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveEditImage = (index: number) => {
    setEditFolderImages((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDeleteFolder = async (folderId: string) => {
    if (
      !window.confirm(
        "Are you sure you want to delete this folder? (Kanji cards will remain in your study queue)"
      )
    ) {
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

  return (
    <div className="flex flex-1 flex-col min-w-0 max-w-full overflow-x-hidden">
      {/* ── TOP HEADER ── */}
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
                  : `${stats.total} kanji collected · ${stats.pct}% mastered`}
              </p>
            </div>
          </div>

          {/* Action buttons */}
          <div className="flex items-center gap-2.5">
            {!activeFolder && (
              <button
                onClick={() => setIsNewFolderModalOpen(true)}
                className="rounded-xl border border-border/90 bg-card px-3.5 py-2 text-xs font-semibold text-fg hover:border-indigo-ai/50 hover:text-indigo-ai transition-all"
              >
                + New Folder
              </button>
            )}

            <button
              onClick={() => {
                setAddModalFolderId(activeFolder ? activeFolder.id : null);
                setIsAddModalOpen(true);
              }}
              className="rounded-xl bg-indigo-ai px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-indigo-ai/90 transition-all"
            >
              ＋ Add Kanji
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
                className="rounded-xl bg-emerald-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-emerald-700 transition-all"
              >
                Study Lesson →
              </button>
            )}
          </div>
        </div>
      </div>

      {/* ── MINIMAL NAVIGATION & SEARCH ── */}
      <div className="border-b border-border/50 bg-bg/30 px-5 py-3 sm:px-8">
        <div className="mx-auto flex w-full max-w-5xl flex-wrap items-center justify-between gap-3">
          {activeFolder ? (
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => {
                  setSelectedFolderId(null);
                  setViewMode("folders");
                  setSearch("");
                }}
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
                onClick={() => {
                  setViewMode("folders");
                  setSelectedFolderId(null);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "folders"
                    ? "bg-card text-fg shadow-2xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                Lesson Folders ({folders.length})
              </button>
              <button
                onClick={() => {
                  setViewMode("all");
                  setSelectedFolderId(null);
                }}
                className={`rounded-lg px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  viewMode === "all"
                    ? "bg-card text-fg shadow-2xs"
                    : "text-muted hover:text-fg"
                }`}
              >
                All My Kanji ({allKanji.length})
              </button>
            </div>
          )}

          {/* Search Field */}
          <div className="relative flex-1 max-w-xs min-w-[200px]">
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
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
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted hover:text-fg text-xs"
              >
                ✕
              </button>
            )}
          </div>
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
                  onClick={() => setKanjiFilter(f)}
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
                  onChange={(e) => setSelectedFolderFilter(e.target.value)}
                  className="rounded-lg border border-border/80 bg-card px-2 py-0.5 text-xs text-fg outline-none focus:border-indigo-ai"
                >
                  <option value="all">All Folders</option>
                  <option value="unlisted">Unassigned ({unlistedKanjiCount})</option>
                  {folders.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.lessonNumber ? `Lesson ${f.lessonNumber}: ` : ""}{f.name}
                    </option>
                  ))}
                </select>
              )}

              <div className="flex items-center gap-1">
                <span>Sort:</span>
                <select
                  value={kanjiSortBy}
                  onChange={(e) => setKanjiSortBy(e.target.value as typeof kanjiSortBy)}
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
              onChange={(e) => setFolderSortBy(e.target.value as typeof folderSortBy)}
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

      {/* ── MAIN CONTENT CANVAS ── */}
      <div className="flex-1 overflow-y-auto px-5 py-6 sm:px-8">
        <div className="mx-auto max-w-5xl space-y-6">
          {loading ? (
            <div className="flex flex-col items-center justify-center gap-3 py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-2 border-border border-t-indigo-ai" />
              <p className="text-xs text-muted">Loading collection...</p>
            </div>
          ) : activeFolder ? (
            /* ══════════════════════════════════════════════════
               VIEW: INSIDE A SPECIFIC LESSON FOLDER
               ══════════════════════════════════════════════════ */
            <div className="space-y-6">
              {/* Folder Summary Bar */}
              <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-border/80 bg-card p-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-xs text-indigo-ai uppercase tracking-wider">
                      {activeFolder.lessonNumber ? `Lesson ${activeFolder.lessonNumber}` : "Lesson"}
                    </span>
                    <span className="text-muted">·</span>
                    <span className="text-xs text-muted font-medium">
                      {activeFolder.entries.length} kanji · {activeFolder.known} mastered ({activeFolder.completionPct}%)
                    </span>
                  </div>
                  <h2 className="font-display text-xl font-bold text-fg mt-0.5">
                    {activeFolder.name}
                  </h2>
                  {activeFolder.description && (
                    <p className="mt-1 text-xs text-muted max-w-lg leading-relaxed">
                      {activeFolder.description}
                    </p>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleOpenEditFolder(activeFolder)}
                    className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-fg hover:border-indigo-ai transition-all"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteFolder(activeFolder.id)}
                    className="rounded-xl border border-rose-500/20 px-3 py-1.5 text-xs font-medium text-rose-500 hover:bg-rose-500/10 transition-all"
                  >
                    Delete Folder
                  </button>
                </div>
              </div>

              {/* Reference Images Shelf */}
              {activeFolder.images && activeFolder.images.length > 0 && (
                <div className="rounded-2xl border border-border/80 bg-card p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-fg">
                      Reference Material ({activeFolder.images.length})
                    </span>
                    <span className="text-muted text-[11px]">Click to zoom</span>
                  </div>
                  <div className="flex gap-2.5 overflow-x-auto pb-1">
                    {activeFolder.images.map((img, idx) => (
                      <div
                        key={idx}
                        onClick={() => setLightboxImage(img)}
                        className="group relative cursor-pointer overflow-hidden rounded-xl border border-border shrink-0 hover:border-indigo-ai transition-all"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={img}
                          alt={`Reference ${idx + 1}`}
                          className="h-24 w-36 object-cover"
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 flex items-center justify-center transition-all">
                          <span className="opacity-0 group-hover:opacity-100 text-[10px] font-semibold text-white bg-black/70 px-2.5 py-0.5 rounded-full">
                            Zoom
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Kanji Cards in Folder */}
              {activeFolderEntries.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
                  <p className="text-sm font-semibold text-fg">This lesson is empty</p>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Add kanji manually or paste multiple kanji from your RTK study notes.
                  </p>
                  <button
                    onClick={() => {
                      setAddModalFolderId(activeFolder.id);
                      setIsAddModalOpen(true);
                    }}
                    className="rounded-xl bg-indigo-ai px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-ai/90 transition-all"
                  >
                    + Add Kanji
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
                  {activeFolderEntries.map((e) => (
                    <div
                      key={e.id}
                      onClick={() =>
                        setSelectedKanji({
                          character: e.character,
                          heisigNumber: e.heisigNumber,
                          keyword: e.heisigKeyword || e.customMeaning,
                          meanings: e.meanings,
                          readingsOn: e.readingsOn,
                          readingsKun: e.readingsKun,
                          strokes: e.strokes,
                          primitives: e.primitives,
                          mnemonic: e.mnemonic,
                          status: e.status,
                        })
                      }
                      className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-ai/50 hover:shadow-md cursor-pointer overflow-hidden aspect-[4/5]"
                    >
                      {/* Top Row: Frame # + Actions */}
                      <div className="flex items-center justify-between text-xs">
                        {e.heisigNumber ? (
                          <span className="font-mono text-[11px] font-semibold text-muted">
                            #{e.heisigNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-muted">
                            {e.strokes}画
                          </span>
                        )}

                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleRemoveKanjiFromFolder(activeFolder.id, e.kanjiId, e.character);
                            }}
                            className="p-1 text-muted hover:text-fg text-xs rounded hover:bg-border/60"
                            title="Remove from folder"
                          >
                            ✕
                          </button>
                          <button
                            onClick={(ev) => {
                              ev.stopPropagation();
                              handleDeleteKanji(e.character);
                            }}
                            className="p-1 text-muted hover:text-rose-500 text-xs rounded hover:bg-rose-500/10"
                            title="Delete completely"
                          >
                            🗑️
                          </button>
                        </div>
                      </div>

                      {/* Character Glyph */}
                      <div className="my-auto py-2 text-center">
                        <span className="font-jp text-5xl font-normal text-fg group-hover:text-indigo-ai transition-colors select-none">
                          {e.character}
                        </span>
                      </div>

                      {/* Bottom Info */}
                      <div className="text-center pt-2 border-t border-border/40">
                        <p className="font-semibold text-xs text-fg truncate">
                          {e.heisigKeyword || e.customMeaning || e.meanings[0] || "Kanji"}
                        </p>
                        <p className="text-[10px] text-muted truncate mt-0.5">
                          {e.status === "known" ? "Mastered" : "Learning"} · {e.strokes} strokes
                        </p>
                      </div>

                      {/* Subtle bottom indicator */}
                      <div
                        className={`absolute bottom-0 left-0 right-0 h-1 ${
                          e.status === "known" ? "bg-emerald-500" : "bg-indigo-ai/30"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : viewMode === "all" ? (
            /* ══════════════════════════════════════════════════
               VIEW: ALL MY KANJI (CLEAN FLASHCARDS)
               ══════════════════════════════════════════════════ */
            <div className="space-y-4">
              {filteredAllKanji.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
                  <p className="text-sm font-semibold text-fg">No kanji found</p>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    {search || kanjiFilter !== "All"
                      ? "Try clearing filters or search query."
                      : "Add kanji to begin your study collection."}
                  </p>
                  <button
                    onClick={() => setIsAddModalOpen(true)}
                    className="rounded-xl bg-indigo-ai px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-ai/90 transition-all"
                  >
                    + Add Kanji
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
                  {filteredAllKanji.map((k) => (
                    <div
                      key={k.id}
                      onClick={() =>
                        setSelectedKanji({
                          character: k.character,
                          heisigNumber: k.heisigNumber,
                          keyword: k.heisigKeyword,
                          meanings: k.meanings,
                          readingsOn: k.readingsOn,
                          readingsKun: k.readingsKun,
                          strokes: k.strokes,
                          primitives: k.primitives,
                          status: k.learningStatus,
                          masteryPercent: k.masteryPercent,
                        })
                      }
                      className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-ai/50 hover:shadow-md cursor-pointer overflow-hidden aspect-[4/5]"
                    >
                      {/* Top Row: Frame # + Delete action */}
                      <div className="flex items-center justify-between text-xs">
                        {k.heisigNumber ? (
                          <span className="font-mono text-[11px] font-semibold text-muted">
                            #{k.heisigNumber}
                          </span>
                        ) : (
                          <span className="text-[11px] font-medium text-muted">
                            {k.strokes}画
                          </span>
                        )}

                        <button
                          onClick={(ev) => {
                            ev.stopPropagation();
                            handleDeleteKanji(k.character);
                          }}
                          className="opacity-0 group-hover:opacity-100 p-1 text-muted hover:text-rose-500 text-xs rounded hover:bg-rose-500/10 transition-opacity"
                          title={`Delete ${k.character}`}
                        >
                          🗑️
                        </button>
                      </div>

                      {/* Center: Glyph */}
                      <div className="my-auto py-2 text-center">
                        <span className="font-jp text-5xl font-normal text-fg group-hover:text-indigo-ai transition-colors select-none">
                          {k.character}
                        </span>
                      </div>

                      {/* Bottom Info */}
                      <div className="text-center pt-2 border-t border-border/40">
                        <p className="font-semibold text-xs text-fg truncate">
                          {k.heisigKeyword || k.meanings[0]}
                        </p>
                        <p className="text-[10px] text-muted truncate mt-0.5">
                          {k.learningStatus === "known" ? "Mastered" : "Learning"} · {k.strokes} strokes
                        </p>
                      </div>

                      {/* Subtle bottom indicator */}
                      <div
                        className={`absolute bottom-0 left-0 right-0 h-1 ${
                          k.learningStatus === "known" ? "bg-emerald-500" : "bg-indigo-ai/30"
                        }`}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* ══════════════════════════════════════════════════
               VIEW: LESSON FOLDERS GRID
               ══════════════════════════════════════════════════ */
            <div className="space-y-4">
              {filteredFolders.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
                  <p className="text-sm font-semibold text-fg">No folders created yet</p>
                  <p className="text-xs text-muted max-w-sm mx-auto">
                    Organize your kanji into lessons with reference materials.
                  </p>
                  <button
                    onClick={() => setIsNewFolderModalOpen(true)}
                    className="rounded-xl bg-indigo-ai px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-ai/90 transition-all"
                  >
                    + Create First Folder
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
                  {filteredFolders.map((folder) => (
                    <div
                      key={folder.id}
                      onClick={() => setSelectedFolderId(folder.id)}
                      className="group relative flex flex-col justify-between rounded-2xl border border-border/80 bg-card p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-ai/50 hover:shadow-md cursor-pointer"
                    >
                      <div>
                        {/* Eyebrow & Actions */}
                        <div className="flex items-center justify-between text-xs text-muted mb-2">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-ai">
                            {folder.lessonNumber ? `Lesson ${folder.lessonNumber}` : "Folder"}
                          </span>
                          <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditFolder(folder);
                              }}
                              className="p-1 text-muted hover:text-fg text-xs rounded hover:bg-border/50"
                              title="Edit"
                            >
                              ✏️
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteFolder(folder.id);
                              }}
                              className="p-1 text-muted hover:text-rose-500 text-xs rounded hover:bg-rose-500/10"
                              title="Delete"
                            >
                              ✕
                            </button>
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="font-display text-base font-bold text-fg group-hover:text-indigo-ai transition-colors">
                          {folder.name}
                        </h3>

                        {folder.description && (
                          <p className="text-xs text-muted line-clamp-2 mt-1 leading-relaxed">
                            {folder.description}
                          </p>
                        )}

                        {/* Kanji Preview Glyphs */}
                        {folder.entries.length > 0 && (
                          <div className="mt-4 flex items-center gap-1.5 overflow-hidden">
                            {folder.entries.slice(0, 5).map((e) => (
                              <span
                                key={e.id}
                                className="font-jp text-sm font-medium bg-bg border border-border/60 rounded-lg px-2 py-0.5 text-fg"
                              >
                                {e.character}
                              </span>
                            ))}
                            {folder.entries.length > 5 && (
                              <span className="text-[10px] text-muted font-medium">
                                +{folder.entries.length - 5}
                              </span>
                            )}
                          </div>
                        )}
                      </div>

                      {/* Footer */}
                      <div className="mt-5 pt-3 border-t border-border/50 flex items-center justify-between text-xs text-muted">
                        <span>{folder.entries.length} kanji · {folder.known} mastered</span>
                        <span className="text-indigo-ai font-semibold group-hover:translate-x-0.5 transition-transform">
                          Open →
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── QUICK KANJI DETAIL SHEET ── */}
      {selectedKanji && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setSelectedKanji(null)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header: Glyph, Speaker, Close */}
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-4">
                <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-bg border border-border font-jp text-5xl font-normal text-fg leading-none">
                  {selectedKanji.character}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display text-xl font-bold text-fg">
                      {selectedKanji.keyword || selectedKanji.meanings[0] || "Kanji"}
                    </h3>
                    {selectedKanji.heisigNumber && (
                      <span className="text-xs font-mono text-muted">
                        #{selectedKanji.heisigNumber}
                      </span>
                    )}
                  </div>
                  {selectedKanji.strokes && (
                    <p className="text-xs text-muted mt-0.5">
                      {selectedKanji.strokes} strokes
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                {canSpeak() && (
                  <button
                    onClick={() => speakJa(selectedKanji.character)}
                    className="p-1.5 text-muted hover:text-indigo-ai rounded-lg hover:bg-indigo-ai/10 transition-colors"
                    title="Pronounce"
                  >
                    🔊
                  </button>
                )}
                <button
                  onClick={() => setSelectedKanji(null)}
                  className="p-1.5 text-muted hover:text-fg text-sm rounded-lg hover:bg-border/50"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Meanings */}
            <div className="mt-4 rounded-xl bg-bg p-3.5 border border-border/60">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                Meanings
              </p>
              <p className="text-xs font-medium text-fg">
                {selectedKanji.meanings.join(", ") || "No meanings listed"}
              </p>
            </div>

            {/* Readings */}
            {(selectedKanji.readingsOn?.length || selectedKanji.readingsKun?.length) ? (
              <div className="mt-3 grid grid-cols-2 gap-2.5">
                {selectedKanji.readingsOn && selectedKanji.readingsOn.length > 0 && (
                  <div className="rounded-xl bg-bg p-3 border border-border/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                      On-yomi
                    </p>
                    <p className="font-jp text-xs font-medium text-indigo-ai">
                      {selectedKanji.readingsOn.join("、 ")}
                    </p>
                  </div>
                )}
                {selectedKanji.readingsKun && selectedKanji.readingsKun.length > 0 && (
                  <div className="rounded-xl bg-bg p-3 border border-border/60">
                    <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                      Kun-yomi
                    </p>
                    <p className="font-jp text-xs font-medium text-indigo-ai">
                      {selectedKanji.readingsKun.join("、 ")}
                    </p>
                  </div>
                )}
              </div>
            ) : null}

            {/* Primitives */}
            {selectedKanji.primitives && selectedKanji.primitives.length > 0 && (
              <div className="mt-3 rounded-xl bg-bg p-3 border border-border/60">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
                  Primitives
                </p>
                <div className="flex items-center gap-1.5 flex-wrap">
                  {selectedKanji.primitives.map((prim, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="font-jp text-xs font-semibold bg-card border border-border px-2 py-0.5 rounded">
                        {prim}
                      </span>
                      {idx < (selectedKanji.primitives?.length ?? 0) - 1 && (
                        <span className="text-muted text-xs">→</span>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Story */}
            {selectedKanji.mnemonic && (
              <div className="mt-3 rounded-xl bg-bg p-3.5 border border-border/60">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Mnemonic
                </p>
                <p className="text-xs text-fg italic leading-relaxed whitespace-pre-wrap">
                  {selectedKanji.mnemonic}
                </p>
              </div>
            )}

            {/* Actions */}
            <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-border/60">
              {selectedKanji.status !== "known" && (
                <button
                  onClick={() => handleMarkKnown(selectedKanji.character)}
                  className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 transition-all"
                >
                  ✓ Mark Known
                </button>
              )}
              <button
                onClick={() => handleResetProgress(selectedKanji.character)}
                className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg hover:border-border transition-all"
              >
                ↺ Reset
              </button>
              <button
                onClick={() => router.push(`/kanji/${encodeURIComponent(selectedKanji.character)}`)}
                className="rounded-lg border border-indigo-ai/30 px-3 py-1.5 text-xs font-semibold text-indigo-ai hover:bg-indigo-ai/10 transition-all"
              >
                Full Page →
              </button>
              <button
                onClick={() => handleDeleteKanji(selectedKanji.character)}
                className="ml-auto rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-all"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE NEW FOLDER MODAL ── */}
      {isNewFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border/60 pb-3">
              <h3 className="font-display text-base font-bold text-fg">Create Lesson Folder</h3>
              <button
                onClick={() => setIsNewFolderModalOpen(false)}
                className="text-muted hover:text-fg text-sm"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateFolder} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-fg mb-1">
                  Folder Name <span className="text-rose-500">*</span>
                </label>
                <input
                  value={newFolderName}
                  onChange={(e) => setNewFolderName(e.target.value)}
                  placeholder="e.g. Lesson 1: Basic Strokes"
                  className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs outline-none focus:border-indigo-ai"
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-semibold text-fg mb-1">Lesson #</label>
                  <input
                    type="number"
                    min="1"
                    value={newFolderLesson}
                    onChange={(e) => setNewFolderLesson(e.target.value)}
                    placeholder="e.g. 1"
                    className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs outline-none focus:border-indigo-ai"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-fg mb-1">Description</label>
                  <input
                    value={newFolderDesc}
                    onChange={(e) => setNewFolderDesc(e.target.value)}
                    placeholder="e.g. Strokes 1-25"
                    className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs outline-none focus:border-indigo-ai"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsNewFolderModalOpen(false)}
                  className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold text-muted hover:bg-bg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingFolder || !newFolderName.trim()}
                  className="rounded-xl bg-indigo-ai px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-ai/90 disabled:opacity-50 transition-all"
                >
                  {creatingFolder ? "Creating..." : "Create"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT FOLDER MODAL ── */}
      {isEditFolderModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
          <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-xl">
            <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
              <h3 className="font-display text-base font-bold text-fg">Edit Folder</h3>
              <button
                onClick={() => setIsEditFolderModalOpen(false)}
                className="text-muted hover:text-fg text-sm"
              >
                ✕
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-5 py-4">
              <form id="edit-folder-form" onSubmit={handleSaveEditFolder} className="space-y-3.5">
                <div>
                  <label className="block text-xs font-semibold text-fg mb-1">
                    Folder Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    value={editFolderName}
                    onChange={(e) => setEditFolderName(e.target.value)}
                    placeholder="e.g. Lesson 1: Strokes"
                    className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs outline-none focus:border-indigo-ai"
                    autoFocus
                  />
                </div>

                <div className="grid grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1">Lesson #</label>
                    <input
                      type="number"
                      min="1"
                      value={editFolderLesson}
                      onChange={(e) => setEditFolderLesson(e.target.value)}
                      placeholder="e.g. 1"
                      className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs outline-none focus:border-indigo-ai"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-fg mb-1">Description</label>
                    <input
                      value={editFolderDesc}
                      onChange={(e) => setEditFolderDesc(e.target.value)}
                      placeholder="e.g. Strokes 1-25"
                      className="h-10 w-full rounded-xl border border-border bg-bg px-3 text-xs outline-none focus:border-indigo-ai"
                    />
                  </div>
                </div>

                {/* Reference Images */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-semibold text-fg">Reference Pages (RTK Charts)</label>
                    <span className="text-[10px] text-muted">{editFolderImages.length}/6</span>
                  </div>

                  {imageUploadError && (
                    <p className="mb-2 text-xs text-rose-500 font-semibold">⚠️ {imageUploadError}</p>
                  )}

                  {editFolderImages.length > 0 && (
                    <div className="mb-2.5 grid grid-cols-3 gap-2">
                      {editFolderImages.map((img, idx) => (
                        <div key={idx} className="group relative rounded-xl overflow-hidden border border-border">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={img}
                            alt={`Reference ${idx + 1}`}
                            className="h-20 w-full object-cover cursor-pointer"
                            onClick={() => setLightboxImage(img)}
                          />
                          <button
                            type="button"
                            onClick={() => handleRemoveEditImage(idx)}
                            className="absolute top-1 right-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/70 text-white text-[10px] opacity-0 group-hover:opacity-100 transition-opacity hover:bg-rose-500"
                          >
                            ✕
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {editFolderImages.length < 6 && (
                    <label
                      className={`flex cursor-pointer items-center justify-center gap-1.5 rounded-xl border border-dashed px-3 py-2.5 text-xs font-medium transition-all ${
                        compressingImage
                          ? "border-indigo-ai text-indigo-ai bg-indigo-ai/5"
                          : "border-border text-muted hover:border-indigo-ai hover:text-indigo-ai"
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept="image/*"
                        className="sr-only"
                        onChange={handleImageFileSelect}
                        disabled={compressingImage}
                      />
                      {compressingImage ? (
                        <span>⏳ Compressing...</span>
                      ) : (
                        <span>📷 Upload Reference Page</span>
                      )}
                    </label>
                  )}
                </div>
              </form>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-border/60 bg-bg/40 px-5 py-3">
              <button
                type="button"
                onClick={() => setIsEditFolderModalOpen(false)}
                className="rounded-xl border border-border px-3.5 py-1.5 text-xs font-semibold text-muted hover:bg-bg"
              >
                Cancel
              </button>
              <button
                form="edit-folder-form"
                type="submit"
                disabled={savingFolder || !editFolderName.trim()}
                className="rounded-xl bg-indigo-ai px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-ai/90 disabled:opacity-50 transition-all"
              >
                {savingFolder ? "Saving..." : "Save"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── IMAGE LIGHTBOX ── */}
      {lightboxImage && (
        <div
          className="fixed inset-0 z-[60] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm animate-fade-in"
          onClick={() => setLightboxImage(null)}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={lightboxImage}
            alt="Reference image"
            className="max-h-[90vh] max-w-[90vw] rounded-2xl object-contain shadow-2xl"
          />
          <button
            className="absolute top-4 right-4 flex h-9 w-9 items-center justify-center rounded-full bg-black/70 text-white text-lg hover:bg-black/90"
            onClick={() => setLightboxImage(null)}
          >
            ✕
          </button>
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
