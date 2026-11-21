"use client";

import type { KanjiCard } from "../types";
import type { KanjiDetailData } from "./KanjiDetailModal";

interface KanjiAllGridViewProps {
  kanjiList: KanjiCard[];
  search: string;
  filter: string;
  onSelectKanji: (kanji: KanjiDetailData) => void;
  onDeleteKanji: (char: string) => void;
  onAddClick: () => void;
}

export default function KanjiAllGridView({
  kanjiList,
  search,
  filter,
  onSelectKanji,
  onDeleteKanji,
  onAddClick,
}: KanjiAllGridViewProps) {
  if (kanjiList.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-12 text-center space-y-3">
        <p className="text-sm font-semibold text-fg">No kanji found</p>
        <p className="text-xs text-muted max-w-sm mx-auto">
          {search || filter !== "All"
            ? "Try clearing filters or search query."
            : "Add kanji to begin your study collection."}
        </p>
        <button
          onClick={onAddClick}
          className="rounded-xl bg-indigo-ai px-4 py-2 text-xs font-semibold text-white hover:bg-indigo-ai/90 transition-all"
        >
          + Add Kanji
        </button>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3.5">
      {kanjiList.map((k) => (
        <div
          key={k.id}
          onClick={() =>
            onSelectKanji({
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
                onDeleteKanji(k.character);
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
  );
}
