'use client';

import { ShieldCheck } from '@phosphor-icons/react';

type AppBlockerCardProps = {
  isMonitoring: boolean;
  requirementCount: number;
  studyMode?: string;
  learningRatio?: number;
  reviewType?: string;
  onClick: () => void;
};

export default function AppBlockerCard({
  isMonitoring,
  requirementCount,
  studyMode = 'all',
  learningRatio = 0.5,
  reviewType = 'vocabulary',
  onClick,
}: AppBlockerCardProps) {
  const focusLabel =
    Math.abs(learningRatio - 1.0) < 0.05
      ? 'All New'
      : Math.abs(learningRatio - 0.7) < 0.05
      ? '70/30'
      : '50/50';

  const poolLabel =
    studyMode === 'due'
      ? 'Due'
      : studyMode === 'recent'
      ? 'Recent'
      : studyMode === 'struggling'
      ? 'Struggling'
      : studyMode === 'leeches'
      ? 'Leeches'
      : 'All Cards';

  const typeLabel =
    reviewType === 'kanji' ? 'Kanji' : reviewType === 'mixed' ? 'Mixed' : 'Vocab';

  return (
    <button
      onClick={onClick}
      className="group relative w-full flex flex-col justify-between text-left rounded-3xl border-2 border-border bg-gradient-to-br from-indigo-ai/6 via-card to-card p-5 md:p-6 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-indigo-ai/45 cursor-pointer shadow-sm overflow-hidden min-h-[160px]"
    >
      {/* Hover shimmer */}
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-ai/0 via-indigo-ai/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />

      {/* Ghost kanji */}
      <div className="absolute -right-2 -bottom-4 text-[80px] font-bold font-jp text-indigo-ai/5 select-none pointer-events-none leading-none group-hover:text-indigo-ai/10 transition-colors duration-500">
        守
      </div>

      <div className="relative z-10">
        <div className="flex items-center justify-between w-full mb-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-indigo-ai/10 text-xl group-hover:scale-110 transition-transform duration-300">
            🔒
          </span>
          <span
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-extrabold ${
              isMonitoring
                ? 'bg-emerald-500/15 text-emerald-600 border border-emerald-500/30'
                : 'bg-muted/20 text-muted border border-border'
            }`}
          >
            <span className={`w-1.5 h-1.5 rounded-full ${isMonitoring ? 'bg-emerald-500 animate-pulse' : 'bg-muted'}`} />
            {isMonitoring ? 'Guarding' : 'Paused'}
          </span>
        </div>

        <h3 className="font-display text-lg md:text-xl font-extrabold text-foreground group-hover:text-indigo-ai transition-colors mb-1">
          Focus Guard
        </h3>
        <p className="text-xs md:text-sm text-muted leading-relaxed mb-3">
          Require {requirementCount} cards before unlocking blocked apps.
        </p>

        {/* Config Summary Pills */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="px-2 py-0.5 rounded-lg bg-indigo-ai/10 text-indigo-ai border border-indigo-ai/20 text-[10px] font-extrabold">
            {poolLabel}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-card border border-border text-foreground text-[10px] font-extrabold">
            {focusLabel}
          </span>
          <span className="px-2 py-0.5 rounded-lg bg-card border border-border text-muted text-[10px] font-extrabold">
            {typeLabel}
          </span>
        </div>
      </div>

      <div className="relative z-10 mt-3 pt-2 border-t border-border/60 flex items-center justify-between text-[11px] font-bold text-indigo-ai">
        <span>Configure Rules →</span>
        <ShieldCheck size={15} />
      </div>
    </button>
  );
}
