"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { useSittingSnapshot } from "../hooks/useSitting";
import { useForgeSummary } from "./useForgeSummary";

export default function ConstructionCard() {
  const stats = useForgeSummary()?.construction;
  const sitting = useSittingSnapshot("construction");
  const accuracy = stats?.accuracy != null ? Math.round(stats.accuracy * 100) : null;
  const inProgress = sitting !== null && sitting.total > 0;

  return (
    <Link
      href="/review/construction"
      className="group relative flex h-full w-full flex-col justify-between gap-4 overflow-hidden rounded-3xl border-2 border-border bg-gradient-to-br from-card via-amber/5 to-card p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-amber/40 hover:shadow-xl hover:shadow-amber/15 md:flex-row md:items-center md:p-6"
    >
      <span className="pointer-events-none absolute -right-2 -bottom-4 select-none font-jp text-[90px] font-bold leading-none text-amber/5 transition-colors group-hover:text-amber/10">
        組
      </span>

      <div className="relative z-10 flex items-start gap-4">
        <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-amber/15 text-2xl transition-transform group-hover:scale-110">
          ✍️
        </span>
        <div>
          <h3 className="font-display text-base font-extrabold text-foreground md:text-lg">
            Construction
            <span className="ml-1.5 font-jp text-xs font-normal text-muted">組立</span>
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-muted md:text-sm">
            Build sentences from your weakest grammar — tiles, particles, completion and free
            production in an endless stream.
          </p>
        </div>
      </div>

      <div className="relative z-10 flex flex-wrap items-center gap-1.5">
        {inProgress && (
          <span className="rounded-lg border border-amber/30 bg-amber/20 px-2.5 py-1 text-[10px] font-extrabold text-amber">
            Continue {sitting.right}/{sitting.total}
          </span>
        )}
        <span className="rounded-lg border border-amber/20 bg-amber/15 px-2.5 py-1 text-[10px] font-extrabold text-amber">
          {stats ? `${stats.practiced} topics` : "—"}
        </span>
        <span className="rounded-lg bg-amber/10 px-2.5 py-1 text-[10px] font-extrabold text-amber">
          {accuracy !== null ? `${accuracy}% accuracy` : "New"}
        </span>
        <ArrowRight size={16} className="text-amber transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
