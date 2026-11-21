"use client";

import { useState, useRef, useEffect } from "react";
import { compressImageToDataUrl } from "@/lib/image-compress";
import type { Folder } from "../types";

interface EditFolderModalProps {
  folder: Folder | null;
  isOpen: boolean;
  onClose: () => void;
  onSaved: () => void;
  onPreviewImage: (image: string) => void;
}

export default function EditFolderModal({
  folder,
  isOpen,
  onClose,
  onSaved,
  onPreviewImage,
}: EditFolderModalProps) {
  const [editFolderName, setEditFolderName] = useState("");
  const [editFolderLesson, setEditFolderLesson] = useState("");
  const [editFolderDesc, setEditFolderDesc] = useState("");
  const [editFolderImages, setEditFolderImages] = useState<string[]>([]);
  const [savingFolder, setSavingFolder] = useState(false);
  const [compressingImage, setCompressingImage] = useState(false);
  const [imageUploadError, setImageUploadError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (folder) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setEditFolderName(folder.name);
      setEditFolderLesson(folder.lessonNumber ? String(folder.lessonNumber) : "");
      setEditFolderDesc(folder.description || "");
      setEditFolderImages(folder.images || []);
      setImageUploadError(null);
    }
  }, [folder]);

  if (!isOpen || !folder) return null;

  const handleImageFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setImageUploadError("Please select a valid image file (JPG, PNG, WebP).");
      return;
    }

    setCompressingImage(true);
    setImageUploadError(null);
    try {
      const dataUrl = await compressImageToDataUrl(file);
      setEditFolderImages((prev) => [...prev, dataUrl]);
    } catch {
      setImageUploadError("Failed to process image. Please try another image.");
    } finally {
      setCompressingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemoveEditImage = (index: number) => {
    setEditFolderImages((prev) => prev.filter((_, idx) => idx !== index));
  };

  const handleSaveEditFolder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editFolderName.trim()) return;

    setSavingFolder(true);
    try {
      const res = await fetch(`/api/kanji/groups/${folder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editFolderName.trim(),
          description: editFolderDesc.trim() || undefined,
          lessonNumber: editFolderLesson ? parseInt(editFolderLesson, 10) : undefined,
          images: editFolderImages,
        }),
      });

      if (res.ok) {
        onSaved();
        onClose();
      }
    } catch (err) {
      console.error("Failed to save folder:", err);
    } finally {
      setSavingFolder(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in">
      <div className="flex max-h-[90vh] w-full max-w-md flex-col rounded-2xl border border-border bg-card shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
          <h3 className="font-display text-base font-bold text-fg">Edit Folder</h3>
          <button onClick={onClose} className="text-muted hover:text-fg text-sm">
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
                        onClick={() => onPreviewImage(img)}
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
            onClick={onClose}
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
  );
}
