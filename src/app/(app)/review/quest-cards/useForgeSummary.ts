"use client";

import { useEffect, useState } from "react";

export type ForgeModeSummary = {
  practiced: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
  lastPracticed: string | null;
};

export type ForgeSummary = {
  construction: ForgeModeSummary;
  conjugation: ForgeModeSummary;
};

let cached: Promise<ForgeSummary> | null = null;

function loadSummary(): Promise<ForgeSummary> {
  if (!cached) {
    cached = fetch("/api/review/forge-summary").then((response) => {
      if (!response.ok) throw new Error("summary failed");
      return response.json() as Promise<ForgeSummary>;
    });
    // Allow a later mount to retry after a failure.
    cached.catch(() => {
      cached = null;
    });
  }
  return cached;
}

/** Both cards mount together, so one request feeds them. */
export function useForgeSummary() {
  const [summary, setSummary] = useState<ForgeSummary | null>(null);

  useEffect(() => {
    let alive = true;
    void loadSummary()
      .then((data) => {
        if (alive) setSummary(data);
      })
      .catch(() => {
        // Cards still work without numbers.
      });
    return () => {
      alive = false;
    };
  }, []);

  return summary;
}
