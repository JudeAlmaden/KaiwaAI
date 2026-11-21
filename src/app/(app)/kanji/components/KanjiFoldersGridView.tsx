"use client";

import type { Folder } from "../types";

interface KanjiFoldersGridViewProps {
  folders: Folder[];
  onSelectFolder: (folderId: string) => void;
  onOpenEdit: (folder: Folder) => void;
  onDeleteFolder: (folderId: string) => void;
  onCreateFolderClick: () => void;
}

export default function KanjiFoldersGridView({
  folders,
  onSelectFolder,
  onOpenEdit,
  onDeleteFolder,
  onCreateFolderClick,
}: KanjiFoldersGridViewProps) {
  if (folders.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
        <p className="text-sm font-semibold text-fg">No folders created yet</p>
        <p className="text-xs text-muted max-w-sm mx-auto">
          Organize your kanji into lessons with reference materials.
        </p>
        <button
          onClick={onCreateFolderClick}
          className="rounded-xl bg-indigo-ai px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-ai/90 transition-all"
        >
          + Create First Folder
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
      {folders.map((folder) => (
        <div
          key={folder.id}
          onClick={() => onSelectFolder(folder.id)}
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
                    onOpenEdit(folder);
                  }}
                  className="p-1 text-muted hover:text-fg text-xs rounded hover:bg-border/50"
                  title="Edit"
                >
                  ✏️
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteFolder(folder.id);
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
            <span>
              {folder.entries.length} kanji · {folder.known} mastered
            </span>
            <span className="text-indigo-ai font-semibold group-hover:translate-x-0.5 transition-transform">
              Open →
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
