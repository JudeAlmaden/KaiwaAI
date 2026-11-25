"use client";

import { useMemo, useState } from "react";
import { assembleTiles } from "@/lib/grammar/noise";
import type { AssemblyExercise } from "@/lib/grammar/types";

type AssembleInputProps = {
  exercise: AssemblyExercise;
  disabled: boolean;
  onSubmit: (tiles: string[]) => void;
};

export function AssembleInput({ exercise, disabled, onSubmit }: AssembleInputProps) {
  const tiles = useMemo(() => assembleTiles(exercise), [exercise]);
  const decoys = tiles.length - exercise.solution.length;
  const [placed, setPlaced] = useState<number[]>([]);
  const placedTiles = placed.map((tileIndex) => tiles[tileIndex]).filter(Boolean);
  const trayTiles = tiles
    .map((tile, tileIndex) => ({ tile, tileIndex }))
    .filter(({ tileIndex }) => !placed.includes(tileIndex));

  return (
    <>
      <p className="mt-2 text-lg font-bold leading-snug text-foreground">{exercise.en}</p>
      <div className="mt-3 flex min-h-14 flex-wrap items-center gap-2 rounded-2xl border-2 border-dashed border-sky/30 bg-card/70 p-3">
        {placedTiles.length === 0 && (
          <span className="text-xs text-muted">Tap tiles to build the sentence.</span>
        )}
        {placedTiles.map((tile, order) => (
          <button
            key={`${tile}-${order}`}
            type="button"
            disabled={disabled}
            onClick={() => setPlaced((current) => current.filter((_, at) => at !== order))}
            className="rounded-xl border-2 border-sky/40 bg-sky/10 px-3 py-1.5 font-jp text-base font-bold text-foreground"
          >
            {tile}
          </button>
        ))}
      </div>
      <div className="mt-3 flex flex-wrap gap-2">
        {trayTiles.map(({ tile, tileIndex }) => (
          <button
            key={`${tile}-${tileIndex}`}
            type="button"
            disabled={disabled}
            onClick={() => setPlaced((current) => [...current, tileIndex])}
            className="rounded-xl border-2 border-border bg-card px-3 py-1.5 font-jp text-base text-foreground transition hover:border-sky/50 hover:bg-sky/5 disabled:opacity-50"
          >
            {tile}
          </button>
        ))}
      </div>
      {!disabled && (
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <button
            onClick={() => onSubmit(placedTiles)}
            disabled={placedTiles.length === 0}
            className="rounded-2xl bg-sky px-5 py-2.5 text-sm font-extrabold text-white disabled:opacity-40"
          >
            Check sentence
          </button>
          <span className="text-[11px] text-muted">
            {decoys === 1 ? "One tile is a decoy." : `${decoys} tiles don't belong.`}
          </span>
        </div>
      )}
    </>
  );
}
