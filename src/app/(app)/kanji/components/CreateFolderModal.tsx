"use client";

import { useState } from "react";

interface CreateFolderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (folder: { id: string; name: string }) => void;
}

export default function CreateFolderModal({
  isOpen,
  onClose,
  onCreated,
}: CreateFolderModalProps) {
  const [newFolderName, setNewFolderName] = useState("");
  const [newFolderLesson, setNewFolderLesson] = useState("");
  const [newFolderDesc, setNewFolderDesc] = useState("");
  const [creatingFolder, setCreatingFolder] = useState(false);

  if (!isOpen) return null;

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
          lessonNumber: newFolderLesson ? parseInt(newFolderLesson, 10) : undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        onCreated(data.group);
        setNewFolderName("");
        setNewFolderLesson("");
        setNewFolderDesc("");
        onClose();
      }
    } catch (err) {
      console.error("Failed to create folder:", err);
    } finally {
      setCreatingFolder(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-2xl border border-border bg-card p-5 shadow-xl space-y-4">
        <div className="flex items-center justify-between border-b border-border/60 pb-3">
          <h3 className="font-display text-base font-bold text-fg">Create Lesson Folder</h3>
          <button onClick={onClose} className="text-muted hover:text-fg text-sm">
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
              onClick={onClose}
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
  );
}
