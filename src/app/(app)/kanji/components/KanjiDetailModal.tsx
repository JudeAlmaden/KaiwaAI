"use client";

import { speakJa, canSpeak } from "@/lib/speak";
import { useRouter } from "next/navigation";

export type KanjiDetailData = {
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
};

interface KanjiDetailModalProps {
  kanji: KanjiDetailData | null;
  onClose: () => void;
  onMarkKnown: (char: string) => void;
  onReset: (char: string) => void;
  onDelete: (char: string) => void;
}

export default function KanjiDetailModal({
  kanji,
  onClose,
  onMarkKnown,
  onReset,
  onDelete,
}: KanjiDetailModalProps) {
  const router = useRouter();

  if (!kanji) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm animate-fade-in"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-border bg-card p-6 shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header: Glyph, Speaker, Close */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-bg border border-border font-jp text-5xl font-normal text-fg leading-none">
              {kanji.character}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display text-xl font-bold text-fg">
                  {kanji.keyword || kanji.meanings[0] || "Kanji"}
                </h3>
                {kanji.heisigNumber && (
                  <span className="text-xs font-mono text-muted">
                    #{kanji.heisigNumber}
                  </span>
                )}
              </div>
              {kanji.strokes && (
                <p className="text-xs text-muted mt-0.5">
                  {kanji.strokes} strokes
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {canSpeak() && (
              <button
                onClick={() => speakJa(kanji.character)}
                className="p-1.5 text-muted hover:text-indigo-ai rounded-lg hover:bg-indigo-ai/10 transition-colors"
                title="Pronounce"
              >
                🔊
              </button>
            )}
            <button
              onClick={onClose}
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
            {kanji.meanings.join(", ") || "No meanings listed"}
          </p>
        </div>

        {/* Readings */}
        {kanji.readingsOn?.length || kanji.readingsKun?.length ? (
          <div className="mt-3 grid grid-cols-2 gap-2.5">
            {kanji.readingsOn && kanji.readingsOn.length > 0 && (
              <div className="rounded-xl bg-bg p-3 border border-border/60">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                  On-yomi
                </p>
                <p className="font-jp text-xs font-medium text-indigo-ai">
                  {kanji.readingsOn.join("、 ")}
                </p>
              </div>
            )}
            {kanji.readingsKun && kanji.readingsKun.length > 0 && (
              <div className="rounded-xl bg-bg p-3 border border-border/60">
                <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
                  Kun-yomi
                </p>
                <p className="font-jp text-xs font-medium text-indigo-ai">
                  {kanji.readingsKun.join("、 ")}
                </p>
              </div>
            )}
          </div>
        ) : null}

        {/* Primitives */}
        {kanji.primitives && kanji.primitives.length > 0 && (
          <div className="mt-3 rounded-xl bg-bg p-3 border border-border/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">
              Primitives
            </p>
            <div className="flex items-center gap-1.5 flex-wrap">
              {kanji.primitives.map((prim, idx) => (
                <div key={idx} className="flex items-center gap-1.5">
                  <span className="font-jp text-xs font-semibold bg-card border border-border px-2 py-0.5 rounded">
                    {prim}
                  </span>
                  {idx < (kanji.primitives?.length ?? 0) - 1 && (
                    <span className="text-muted text-xs">→</span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Story */}
        {kanji.mnemonic && (
          <div className="mt-3 rounded-xl bg-bg p-3.5 border border-border/60">
            <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">
              Mnemonic
            </p>
            <p className="text-xs text-fg italic leading-relaxed whitespace-pre-wrap">
              {kanji.mnemonic}
            </p>
          </div>
        )}

        {/* Actions */}
        <div className="mt-5 flex flex-wrap items-center gap-2 pt-4 border-t border-border/60">
          {kanji.status !== "known" && (
            <button
              onClick={() => onMarkKnown(kanji.character)}
              className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-600 hover:bg-emerald-500/20 transition-all"
            >
              ✓ Mark Known
            </button>
          )}
          <button
            onClick={() => onReset(kanji.character)}
            className="rounded-lg border border-border px-3 py-1.5 text-xs font-semibold text-muted hover:text-fg hover:border-border transition-all"
          >
            ↺ Reset
          </button>
          <button
            onClick={() => router.push(`/kanji/${encodeURIComponent(kanji.character)}`)}
            className="rounded-lg border border-indigo-ai/30 px-3 py-1.5 text-xs font-semibold text-indigo-ai hover:bg-indigo-ai/10 transition-all"
          >
            Full Page →
          </button>
          <button
            onClick={() => onDelete(kanji.character)}
            className="ml-auto rounded-lg border border-rose-500/30 px-3 py-1.5 text-xs font-semibold text-rose-500 hover:bg-rose-500/10 transition-all"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  );
}
