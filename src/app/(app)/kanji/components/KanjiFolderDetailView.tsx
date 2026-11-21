"use client";

import type { Folder, KanjiEntry } from "../types";
import type { KanjiDetailData } from "./KanjiDetailModal";

interface KanjiFolderDetailViewProps {
  activeFolder: Folder;
  entries: KanjiEntry[];
  onOpenEdit: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => void;
  onSelectKanji: (kanji: KanjiDetailData) => void;
  onRemoveKanjiFromFolder: (folderId: string, kanjiId: string, char?: string) => void;
  onDeleteKanji: (char: string) => void;
  onAddKanjiClick: () => void;
  onPreviewImage: (image: string) => void;
}

export default function KanjiFolderDetailView({
  activeFolder,
  entries,
  onOpenEdit,
  onDeleteFolder,
  onSelectKanji,
  onRemoveKanjiFromFolder,
  onDeleteKanji,
  onAddKanjiClick,
  onPreviewImage,
}: KanjiFolderDetailViewProps) {
  return (
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
            onClick={() => onOpenEdit(activeFolder)}
            className="rounded-xl border border-border px-3 py-1.5 text-xs font-medium text-muted hover:text-fg hover:border-indigo-ai transition-all"
          >
            Edit
          </button>
          <button
            onClick={() => onDeleteFolder(activeFolder.id)}
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
                onClick={() => onPreviewImage(img)}
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
      {entries.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
          <p className="text-sm font-semibold text-fg">This lesson is empty</p>
          <p className="text-xs text-muted max-w-sm mx-auto">
            Add kanji manually or paste multiple kanji from your RTK study notes.
          </p>
          <button
            onClick={onAddKanjiClick}
            className="rounded-xl bg-indigo-ai px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-ai/90 transition-all"
          >
            + Add Kanji
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
          {entries.map((e) => (
            <div
              key={e.id}
              onClick={() =>
                onSelectKanji({
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
                      onRemoveKanjiFromFolder(activeFolder.id, e.kanjiId, e.character);
                    }}
                    className="p-1 text-muted hover:text-fg text-xs rounded hover:bg-border/60"
                    title="Remove from folder"
                  >
                    ✕
                  </button>
                  <button
                    onClick={(ev) => {
                      ev.stopPropagation();
                      onDeleteKanji(e.character);
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
  );
}
