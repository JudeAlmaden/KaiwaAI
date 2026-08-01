'use client';

import { useState, ReactNode } from 'react';
import { Wrench, X } from '@phosphor-icons/react';

interface DebugFabProps {
  title?: string;
  enabled?: boolean;
  active?: boolean;
  onToggleActive?: (active: boolean) => void;
  children: ReactNode;
}

export default function DebugFab({
  title = 'Page Debugger',
  enabled = true,
  active = true,
  onToggleActive,
  children,
}: DebugFabProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!enabled) return null;

  return (
    <>
      {/* Floating Bottom Right Trigger Button */}
      <button
        onClick={() => setIsOpen(true)}
        title="Open Debug Controls"
        className="fixed bottom-6 right-6 z-50 flex h-12 w-12 items-center justify-center rounded-full bg-violet-600 hover:bg-violet-700 text-white shadow-xl shadow-violet-600/30 transition-all hover:scale-105 active:scale-95 border-2 border-violet-400/40"
      >
        <Wrench size={22} weight="bold" />
        {active && (
          <span className="absolute top-0 right-0 flex h-3.5 w-3.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3.5 w-3.5 bg-emerald-500 border-2 border-card"></span>
          </span>
        )}
      </button>

      {/* Debug Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
        >
          <div
            className="relative w-full max-w-md max-h-[85vh] overflow-y-auto rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-2xl space-y-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-violet-500/15 text-violet-600 flex items-center justify-center font-bold shrink-0">
                  <Wrench size={20} weight="bold" />
                </div>
                <div>
                  <h3 className="font-display text-base font-extrabold text-foreground">{title}</h3>
                  <p className="text-[11px] text-muted">Developer state overrides</p>
                </div>
              </div>

              <button
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-xl bg-muted/15 text-muted hover:bg-muted/30 hover:text-foreground flex items-center justify-center text-xs font-bold transition"
              >
                <X size={16} />
              </button>
            </div>

            {/* Master Toggle */}
            {onToggleActive && (
              <div className="flex items-center justify-between p-3 rounded-2xl border border-border bg-background">
                <span className="text-xs font-bold text-foreground">Enable State Overrides</span>
                <button
                  onClick={() => onToggleActive(!active)}
                  className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                    active ? 'bg-violet-600 text-white' : 'border border-border bg-card text-muted'
                  }`}
                >
                  {active ? 'Active' : 'Disabled'}
                </button>
              </div>
            )}

            {/* Controls */}
            <div className="space-y-4 pt-1">
              {children}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
