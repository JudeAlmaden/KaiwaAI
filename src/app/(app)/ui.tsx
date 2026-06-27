// Shared UI primitives for the authenticated app — keeps styling consistent
// across Chat, Review, Vocab, Memory, and Settings.

import type { ComponentProps } from "react";
import type { CardStatus } from "@/lib/types";

/** Pill toggle used for filters and session options. */
export function Chip({
  active,
  className = "",
  children,
  ...props
}: { active?: boolean } & ComponentProps<"button">) {
  return (
    <button
      className={`whitespace-nowrap rounded-full border-2 px-4 py-1.5 text-sm font-bold transition-colors ${
        active
          ? "border-indigo-ai bg-indigo-ai text-white"
          : "border-border text-muted hover:border-indigo-ai hover:text-indigo-ai"
      } ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export const STATUS_STYLE: Record<CardStatus, string> = {
  new: "bg-sky/15 text-sky",
  learning: "bg-amber/15 text-amber",
  known: "bg-mint/15 text-mint",
};

/** Small status badge for a flashcard. */
export function StatusBadge({ status }: { status: CardStatus }) {
  return (
    <span
      className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${STATUS_STYLE[status]}`}
    >
      {status}
    </span>
  );
}

/** A pill-style toggle switch (Settings). */
export function Toggle({
  on,
  onClick,
}: {
  on: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      role="switch"
      aria-checked={on}
      className={`relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition-colors ${
        on ? "bg-indigo-ai" : "bg-border"
      }`}
    >
      <span
        className={`absolute top-1 h-5 w-5 rounded-full bg-white transition-all ${
          on ? "left-6" : "left-1"
        }`}
      />
    </button>
  );
}

/** A card surface — the standard rounded, bordered container. */
export function Surface({
  className = "",
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`rounded-3xl border-2 border-border bg-card p-5 ${className}`}>
      {children}
    </section>
  );
}
