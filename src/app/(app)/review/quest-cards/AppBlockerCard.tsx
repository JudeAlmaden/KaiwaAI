'use client';

import { ShieldCheck } from '@phosphor-icons/react';

type AppBlockerCardProps = {
  isMonitoring: boolean;
  requirementCount: number;
  onClick: () => void;
};

export default function AppBlockerCard({
  isMonitoring,
  requirementCount,
  onClick,
}: AppBlockerCardProps) {
  return (
    <button
      onClick={onClick}
      className="group relative w-full flex flex-col justify-between text-left rounded-3xl border-2 border-border bg-gradient-to-br from-indigo-ai/6 via-card to-card p-4 md:p-5 transition-all hover:-translate-y-1 hover:shadow-lg hover:border-indigo-ai/45 cursor-pointer shadow-sm overflow-hidden break-inside-avoid mb-4"
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

        <h3 className="font-display text-sm md:text-base font-extrabold text-foreground group-hover:text-indigo-ai transition-colors mb-1">
          Focus Guard
        </h3>
        <p className="text-[10px] md:text-xs text-muted leading-relaxed">
          Require {requirementCount} cards before unlocking blocked apps.
        </p>
      </div>

      <div className="relative z-10 mt-4 pt-3 border-t border-border/60 flex items-center justify-between text-[11px] font-bold text-indigo-ai">
        <span>Configure Rules →</span>
        <ShieldCheck size={15} />
      </div>
    </button>
  );
}
