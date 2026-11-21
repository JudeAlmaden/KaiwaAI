"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import AddKanjiModal from "./AddKanjiModal";
import KanjiCoverageGrid from "./KanjiCoverageGrid";
import { useKanjiLibrary } from "./useKanjiLibrary";
import { useKanjiView } from "./useKanjiView";
import type { FilterMode, Folder, ViewMode } from "./types";

import KanjiHeader from "./components/KanjiHeader";
import KanjiNavigation from "./components/KanjiNavigation";
import KanjiFoldersGridView from "./components/KanjiFoldersGridView";
import KanjiFolderDetailView from "./components/KanjiFolderDetailView";
import KanjiAllGridView from "./components/KanjiAllGridView";
import KanjiDetailModal, { type KanjiDetailData } from "./components/KanjiDetailModal";
import CreateFolderModal from "./components/CreateFolderModal";
import EditFolderModal from "./components/EditFolderModal";
import ImageLightbox from "./components/ImageLightbox";

export default function KanjiClient() {
  const router = useRouter();

  const {
    folders,
    setFolders,
    allKanji,
    setAllKanji,
    loadFolders,
    loadData,
  } = useKanjiLibrary();

  const [viewMode, setViewMode] = useState<ViewMode>("folders");
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [folderSortBy, setFolderSortBy] = useState<"lesson" | "count" | "completion" | "recent">("lesson");
  const [kanjiSortBy, setKanjiSortBy] = useState<"heisig" | "strokes" | "mastery" | "recent">("heisig");
  const [kanjiFilter, setKanjiFilter] = useState<FilterMode>("All");
  const [selectedFolderFilter, setSelectedFolderFilter] = useState<string>("all");

  // Selected Kanji for Detail Modal
  const [selectedKanji, setSelectedKanji] = useState<KanjiDetailData | null>(null);

  // Folder Modals state
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [isEditFolderModalOpen, setIsEditFolderModalOpen] = useState(false);
  const [editingFolder, setEditingFolder] = useState<Folder | null>(null);

  // Lightbox zoom modal state
  const [lightboxImage, setLightboxImage] = useState<string | null>(null);

  // Add Kanji Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [addModalFolderId, setAddModalFolderId] = useState<string | null>(null);

  const {
    activeFolder,
    stats,
    filteredFolders,
    activeFolderEntries,
    unlistedKanjiCount,
    filteredAllKanji,
  } = useKanjiView({
    folders,
    allKanji,
    selectedFolderId,
    search,
    folderSortBy,
    kanjiSortBy,
    kanjiFilter,
    selectedFolderFilter,
  });

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

  const handleOpenEditFolder = (folder: Folder) => {
    setEditingFolder(folder);
    setIsEditFolderModalOpen(true);
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
      <KanjiHeader
        activeFolder={activeFolder}
        totalKanji={stats.total}
        masteredPct={stats.pct}
        onOpenNewFolder={() => setIsNewFolderModalOpen(true)}
        onOpenAddKanji={() => {
          setAddModalFolderId(activeFolder ? activeFolder.id : null);
          setIsAddModalOpen(true);
        }}
        onStudyLesson={() => {
          if (!activeFolder) return;
          router.push(
            `/review?type=kanji&groupId=${encodeURIComponent(
              activeFolder.id
            )}&groupName=${encodeURIComponent(activeFolder.name)}&autostart=true`
          );
        }}
      />

      {/* ── MINIMAL NAVIGATION & SEARCH ── */}
      <KanjiNavigation
        activeFolder={activeFolder}
        viewMode={viewMode}
        folders={folders}
        allKanjiCount={allKanji.length}
        search={search}
        kanjiFilter={kanjiFilter}
        selectedFolderFilter={selectedFolderFilter}
        unlistedKanjiCount={unlistedKanjiCount}
        kanjiSortBy={kanjiSortBy}
        folderSortBy={folderSortBy}
        onBackToFolders={() => {
          setSelectedFolderId(null);
          setViewMode("folders");
          setSearch("");
        }}
        onSetViewMode={(mode) => {
          setViewMode(mode);
          setSelectedFolderId(null);
        }}
        onSetSearch={setSearch}
        onSetKanjiFilter={setKanjiFilter}
        onSetSelectedFolderFilter={setSelectedFolderFilter}
        onSetKanjiSortBy={setKanjiSortBy}
        onSetFolderSortBy={setFolderSortBy}
      />

      {/* ── MAIN CONTENT CANVAS ── */}
      <div className="flex-1 px-5 py-6 sm:px-8">
        <div className="mx-auto w-full max-w-5xl">
          {activeFolder ? (
            <KanjiFolderDetailView
              activeFolder={activeFolder}
              entries={activeFolderEntries}
              onOpenEdit={handleOpenEditFolder}
              onDeleteFolder={handleDeleteFolder}
              onSelectKanji={setSelectedKanji}
              onRemoveKanjiFromFolder={handleRemoveKanjiFromFolder}
              onDeleteKanji={handleDeleteKanji}
              onAddKanjiClick={() => {
                setAddModalFolderId(activeFolder.id);
                setIsAddModalOpen(true);
              }}
              onPreviewImage={setLightboxImage}
            />
          ) : viewMode === "coverage" ? (
            <KanjiCoverageGrid />
          ) : viewMode === "all" ? (
            <KanjiAllGridView
              kanjiList={filteredAllKanji}
              search={search}
              filter={kanjiFilter}
              onSelectKanji={setSelectedKanji}
              onDeleteKanji={handleDeleteKanji}
              onAddClick={() => setIsAddModalOpen(true)}
            />
          ) : (
            <KanjiFoldersGridView
              folders={filteredFolders}
              onSelectFolder={setSelectedFolderId}
              onOpenEdit={handleOpenEditFolder}
              onDeleteFolder={handleDeleteFolder}
              onCreateFolderClick={() => setIsNewFolderModalOpen(true)}
            />
          )}
        </div>
      </div>

      {/* ── DETAIL MODAL ── */}
      <KanjiDetailModal
        kanji={selectedKanji}
        onClose={() => setSelectedKanji(null)}
        onMarkKnown={handleMarkKnown}
        onReset={handleResetProgress}
        onDelete={handleDeleteKanji}
      />

      {/* ── CREATE FOLDER MODAL ── */}
      <CreateFolderModal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        onCreated={async (folder) => {
          await loadFolders();
          if (folder.id) {
            setSelectedFolderId(folder.id);
            setViewMode("folders");
          }
        }}
      />

      {/* ── EDIT FOLDER MODAL ── */}
      <EditFolderModal
        folder={editingFolder}
        isOpen={isEditFolderModalOpen}
        onClose={() => setIsEditFolderModalOpen(false)}
        onSaved={loadFolders}
        onPreviewImage={setLightboxImage}
      />

      {/* ── IMAGE LIGHTBOX ── */}
      <ImageLightbox
        image={lightboxImage}
        onClose={() => setLightboxImage(null)}
      />

      {/* ── ADD / IMPORT KANJI MODAL ── */}
      <AddKanjiModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onKanjiAdded={loadData}
        groups={folders.map((f) => ({ id: f.id, name: f.name, type: f.kind }))}
        initialGroupId={addModalFolderId}
      />
    </div>
  );
}
