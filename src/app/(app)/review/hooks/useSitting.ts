"use client";

import { useCallback, useEffect, useState } from "react";

export type SittingMode = "construction" | "conjugation";

export type Sitting = {
  right: number;
  total: number;
  streak: number;
  /** Local timestamp when this sitting started. */
  startedAt: number;
};

const storageKey = (mode: SittingMode) => `kaiwa:sitting:${mode}`;

const EMPTY: Sitting = { right: 0, total: 0, streak: 0, startedAt: 0 };

function sameDay(a: number, b: number): boolean {
  if (!a) return false;
  return new Date(a).toDateString() === new Date(b).toDateString();
}

/** A sitting only lasts the day: yesterday's streak shouldn't greet you. */
function decode(raw: string | null, now: number): Sitting {
  if (!raw) return { ...EMPTY, startedAt: now };
  try {
    const parsed = JSON.parse(raw) as Partial<Sitting>;
    const startedAt = typeof parsed.startedAt === "number" ? parsed.startedAt : 0;
    if (!sameDay(startedAt, now)) return { ...EMPTY, startedAt: now };
    return {
      right: Number(parsed.right) || 0,
      total: Number(parsed.total) || 0,
      streak: Number(parsed.streak) || 0,
      startedAt,
    };
  } catch {
    return { ...EMPTY, startedAt: now };
  }
}

/** Read without subscribing, for cards and summaries. Safe outside render. */
export function readSitting(mode: SittingMode): Sitting {
  if (typeof window === "undefined") return EMPTY;
  const now = Date.now();
  try {
    return decode(window.sessionStorage.getItem(storageKey(mode)), now);
  } catch {
    return { ...EMPTY, startedAt: now };
  }
}

function writeSitting(mode: SittingMode, sitting: Sitting) {
  try {
    window.sessionStorage.setItem(storageKey(mode), JSON.stringify(sitting));
  } catch {
    // Storage can be unavailable (private mode); the sitting still works in memory.
  }
}

/**
 * "This sitting" counters, persisted in `sessionStorage` so a reload keeps the
 * number but closing the tab starts fresh. Mastery is stored separately.
 */
export function useSitting(mode: SittingMode) {
  const [sitting, setSitting] = useState<Sitting>(EMPTY);

  useEffect(() => {
    // Storage is only readable on the client; defer so SSR markup stays stable.
    let alive = true;
    queueMicrotask(() => {
      if (alive) setSitting(readSitting(mode));
    });
    return () => {
      alive = false;
    };
  }, [mode]);

  const update = useCallback(
    (change: (current: Sitting) => Sitting) => {
      setSitting((current) => {
        const next = change(current.startedAt ? current : { ...current, startedAt: Date.now() });
        writeSitting(mode, next);
        return next;
      });
    },
    [mode]
  );

  const record = useCallback(
    (correct: boolean) => {
      update((current) => ({
        ...current,
        right: current.right + (correct ? 1 : 0),
        total: current.total + 1,
        streak: correct ? current.streak + 1 : 0,
      }));
    },
    [update]
  );

  const reset = useCallback(() => {
    update(() => ({ ...EMPTY, startedAt: Date.now() }));
  }, [update]);

  return { sitting, record, reset };
}

/** For cards: reads the current sitting once mounted, so SSR stays stable. */
export function useSittingSnapshot(mode: SittingMode): Sitting | null {
  const [snapshot, setSnapshot] = useState<Sitting | null>(null);
  useEffect(() => {
    let alive = true;
    queueMicrotask(() => {
      if (alive) setSnapshot(readSitting(mode));
    });
    return () => {
      alive = false;
    };
  }, [mode]);
  return snapshot;
}
