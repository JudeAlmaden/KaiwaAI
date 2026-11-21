"use client";

import { useState } from "react";
import { CheckCircle, CaretDown, Trash, Plus, FolderSimple, FolderSimplePlus } from "@phosphor-icons/react";
import type { Folder, KanjiDetail } from "./types";

interface KanjiFolderActionsProps {
  kanjiData: KanjiDetail;
  folders: Folder[];
  foldersLoading: boolean;
  pickerFolderId: string | null;
  addedToFolderName: string | null;
  onSetPickerFolderId: (id: string | null) => void;
  onAddToFolder: (folderId?: string | null) => Promise<void>;
  onRemoveFromQueue: () => Promise<void>;
  onCreateAndAdd: (name: string) => Promise<void>;
}

export default function KanjiFolderActions({
  kanjiData,
  folders,
  foldersLoading,
  pickerFolderId,
  addedToFolderName,
  onSetPickerFolderId,
  onAddToFolder,
  onRemoveFromQueue,
  onCreateAndAdd,
}: KanjiFolderActionsProps) {
  const [showFolderPicker, setShowFolderPicker] = useState(false);
  const [showCreateFolder, setShowCreateFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState("");
  const [actionBusy, setActionBusy] = useState(false);

  const handleAdd = async (folderId?: string | null) => {
    setActionBusy(true);
    try {
      await onAddToFolder(folderId);
      setShowFolderPicker(false);
      setShowCreateFolder(false);
    } finally {
      setActionBusy(false);
    }
  };

  const handleRemove = async () => {
    setActionBusy(true);
    try {
      await onRemoveFromQueue();
      setShowFolderPicker(false);
    } finally {
      setActionBusy(false);
    }
  };

  const handleCreate = async () => {
    if (!newFolderName.trim()) return;
    setActionBusy(true);
    try {
      await onCreateAndAdd(newFolderName.trim());
      setNewFolderName("");
      setShowCreateFolder(false);
      setShowFolderPicker(false);
    } finally {
      setActionBusy(false);
    }
  };

  return (
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
                onClick={handleRemove}
                disabled={actionBusy}
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
                  onChange={(e) => onSetPickerFolderId(e.target.value || null)}
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
                  onClick={() => handleAdd(pickerFolderId)}
                  disabled={actionBusy || !pickerFolderId}
                  className="h-10 rounded-xl bg-indigo-ai px-3 text-xs font-bold text-white hover:brightness-105 transition-all disabled:opacity-50"
                >
                  {actionBusy ? "Moving…" : "Move"}
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
              onClick={() => handleAdd(pickerFolderId)}
              disabled={actionBusy}
              className="btn-pop w-full flex items-center justify-center gap-2 rounded-2xl bg-indigo-ai border-indigo-deep text-white px-4 py-3 text-xs font-bold shadow-md shadow-indigo-ai/25 hover:brightness-105 transition-all disabled:opacity-50"
            >
              <Plus size={16} weight="bold" />
              <span>
                {actionBusy
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
                      onChange={(e) => onSetPickerFolderId(e.target.value || null)}
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
                      onClick={() => handleAdd(pickerFolderId)}
                      disabled={actionBusy}
                      className="h-10 rounded-xl bg-indigo-ai px-3.5 text-xs font-bold text-white hover:brightness-105 transition-all disabled:opacity-50"
                    >
                      {actionBusy ? "Adding…" : "Save"}
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
                        if (e.key === "Enter") handleCreate();
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleCreate}
                      disabled={actionBusy || !newFolderName.trim()}
                      className="h-10 rounded-xl bg-mint px-3.5 text-xs font-bold text-zinc-950 hover:brightness-105 transition-all disabled:opacity-50"
                    >
                      {actionBusy ? "Creating…" : "Create & Add"}
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
  );
}
