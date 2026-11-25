"use client";

import Link from "next/link";
import { ArrowRight } from "@phosphor-icons/react";
import { useSittingSnapshot } from "../hooks/useSitting";
import { useForgeSummary } from "./useForgeSummary";

export default function FillBlankCard() {
  const stats = useForgeSummary()?.conjugation;
  const sitting = useSittingSnapshot("conjugation");
  const accuracy = stats?.accuracy != null ? Math.round(stats.accuracy * 100) : null;
  const inProgress = sitting !== null && sitting.total > 0;

  return (
    <Link
      href="/review/conjugation"
      className="group relative flex h-full min-h-[160px] w-full flex-col justify-between overflow-hidden rounded-3xl border-2 border-border bg-gradient-to-br from-card to-mint/5 p-5 shadow-sm transition-all hover:-translate-y-1 hover:border-mint/40 hover:shadow-xl hover:shadow-mint/15 md:p-6"
    >
      <span className="pointer-events-none absolute -right-2 -bottom-4 select-none font-jp text-[80px] font-bold leading-none text-mint/5 transition-colors group-hover:text-mint/10">
        活
      </span>

      <div className="relative z-10">
        <div className="mb-2.5 flex items-center gap-3">
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-mint/15 text-2xl transition-transform group-hover:scale-110">
            🔤
          </span>
          <h3 className="font-display text-base font-extrabold text-foreground md:text-lg">
            Fill the blank
            <span className="ml-1.5 font-jp text-xs font-normal text-muted">活用</span>
          </h3>
        </div>
        <p className="text-xs leading-relaxed text-muted">
          Recognise the form, learn the rule, then produce it yourself.
        </p>
      </div>

      <div className="relative z-10 mt-4 flex flex-wrap items-center gap-1.5">
        {inProgress && (
          <span className="rounded-lg border border-mint/30 bg-mint/20 px-2.5 py-1 text-[10px] font-extrabold text-mint">
            Continue {sitting.right}/{sitting.total}
          </span>
        )}
        <span className="rounded-lg border border-mint/20 bg-mint/15 px-2.5 py-1 text-[10px] font-extrabold text-mint">
          {stats ? `${stats.practiced} patterns` : "—"}
        </span>
        <span className="rounded-lg bg-mint/10 px-2.5 py-1 text-[10px] font-extrabold text-mint">
          {accuracy !== null ? `${accuracy}% accuracy` : "New"}
        </span>
        <ArrowRight size={16} className="text-mint transition-transform group-hover:translate-x-1" />
      </div>
    </Link>
  );
}
