"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Kai from "../../Kai";
import PageHeader from "../PageHeader";
import { Chip } from "../ui";
import { PopButton } from "../../PopButton";
import { speakJa, canSpeak } from "@/lib/speak";
import KanjiBreakdown from "../chat/KanjiBreakdown";

type Card = {
  id: string;
  word: string;
  reading: string;
  romaji: string;
  meaning: string;
  partOfSpeech: string;
  status: "new" | "learning" | "known";
};

const GRADES: { grade: number; label: string; key: string; color: string }[] = [
  { grade: 0, label: "Again", key: "1", color: "bg-sakura text-white border-sakura" },
  { grade: 1, label: "Hard", key: "2", color: "bg-amber/20 text-amber border-amber/40" },
  { grade: 2, label: "Good", key: "3", color: "bg-sky/20 text-sky border-sky/40" },
  { grade: 3, label: "Easy", key: "4", color: "bg-mint/20 text-mint border-mint/40" },
];

type Setup = {
  mode: "due" | "all";
  status: string; // "" | new | learning | known
  limit: number;
};

export default function ReviewClient() {
  const [phase, setPhase] = useState<"setup" | "session" | "done">("setup");
  const [setup, setSetup] = useState<Setup>({ mode: "due", status: "", limit: 20 });
  const [dueCount, setDueCount] = useState<number | null>(null);

  const [queue, setQueue] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ again: 0, good: 0 });

  useEffect(() => {
    fetch("/api/flashcards/review?mode=due&limit=200")
      .then((r) => r.json())
      .then((d) => setDueCount(d.cards?.length ?? 0))
      .catch(() => setDueCount(0));
  }, []);

  async function start(custom?: Setup) {
    const s = custom ?? setup;
    const params = new URLSearchParams({ mode: s.mode, limit: String(s.limit) });
    if (s.status) params.set("status", s.status);
    const res = await fetch(`/api/flashcards/review?${params}`);
    const d = await res.json();
    const cards: Card[] = d.cards ?? [];
    if (cards.length === 0) {
      setQueue([]);
      setPhase("done");
      return;
    }
    setQueue(cards);
    setTotal(cards.length);
    setTally({ again: 0, good: 0 });
    setFlipped(false);
    setPhase("session");
  }

  const grade = useCallback(
    async (g: number) => {
      const card = queue[0];
      if (!card) return;

      fetch("/api/flashcards/review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ cardId: card.id, grade: g }),
      }).catch(() => {});

      setTally((t) => ({
        again: t.again + (g === 0 ? 1 : 0),
        good: t.good + (g > 0 ? 1 : 0),
      }));

      const rest = queue.slice(1);
      setQueue(rest);
      setFlipped(false);
      if (rest.length === 0) setPhase("done");
    },
    [queue]
  );

  // keyboard shortcuts during a session
  useEffect(() => {
    if (phase !== "session") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        grade(Number(e.key) - 1);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, flipped, grade]);

  // ── SETUP ──────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Review" jp="復習" subtitle="Build a session, or review what's due." />
        <div className="mx-auto w-full max-w-lg px-5 py-6 sm:px-8">
          <button
            onClick={() => start({ mode: "due", status: "", limit: 200 })}
            disabled={dueCount === 0}
            className="flex w-full items-center justify-between rounded-3xl border-2 border-indigo-ai bg-indigo-ai/5 px-5 py-4 text-left transition-colors hover:bg-indigo-ai/10 disabled:opacity-50"
          >
            <span>
              <span className="font-display text-lg font-extrabold">Due today</span>
              <span className="block text-sm text-muted">
                {dueCount === null
                  ? "Checking…"
                  : dueCount === 0
                    ? "Nothing due right now"
                    : `${dueCount} card${dueCount === 1 ? "" : "s"} ready`}
              </span>
            </span>
            <span className="text-2xl">🔁</span>
          </button>

          <div className="mt-6 rounded-3xl border-2 border-border bg-card p-5">
            <h2 className="font-display text-base font-bold">Custom session</h2>

            <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              Which cards
            </p>
            <div className="flex flex-wrap gap-2">
              {(["due", "all"] as const).map((m) => (
                <Chip
                  key={m}
                  active={setup.mode === m}
                  onClick={() => setSetup((s) => ({ ...s, mode: m }))}
                >
                  {m === "due" ? "Due now" : "Study ahead"}
                </Chip>
              ))}
            </div>

            <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              Status
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { v: "", l: "Any" },
                { v: "new", l: "New" },
                { v: "learning", l: "Learning" },
                { v: "known", l: "Known" },
              ].map((o) => (
                <Chip
                  key={o.v}
                  active={setup.status === o.v}
                  onClick={() => setSetup((s) => ({ ...s, status: o.v }))}
                >
                  {o.l}
                </Chip>
              ))}
            </div>

            <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              How many
            </p>
            <div className="flex flex-wrap gap-2">
              {[10, 20, 50, 100].map((n) => (
                <Chip
                  key={n}
                  active={setup.limit === n}
                  onClick={() => setSetup((s) => ({ ...s, limit: n }))}
                >
                  {n}
                </Chip>
              ))}
            </div>

            <PopButton onClick={() => start()} size="md" className="mt-6 w-full">
              Start custom session
            </PopButton>
          </div>
        </div>
      </div>
    );
  }

  // ── DONE ───────────────────────────────────────────────────────────────
  if (phase === "done") {
    const reviewed = tally.again + tally.good;
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Review" jp="復習" />
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <Kai size={80} />
          <h2 className="mt-4 font-display text-xl font-extrabold">
            {reviewed > 0 ? "Nice work! 🎉" : "Nothing to review"}
          </h2>
          {reviewed > 0 && (
            <p className="mt-1 text-sm text-muted">
              {reviewed} reviewed · {tally.good} solid · {tally.again} to revisit
            </p>
          )}
          <div className="mt-6 flex gap-3">
            <PopButton onClick={() => setPhase("setup")} size="md">
              New session
            </PopButton>
            <Link
              href="/chat"
              className="inline-flex h-12 items-center rounded-2xl border-2 border-border px-6 text-sm font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
            >
              Back to chat
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── SESSION ──────────────────────────────────────────────────────────────
  const card = queue[0];
  // Guard against a transient empty queue between the last grade and the
  // phase flip to "done" — rendering the card below assumes one exists.
  if (!card) return null;
  const doneCount = total - queue.length;
  const pct = total ? (doneCount / total) * 100 : 0;

  return (
    <div className="flex flex-1 flex-col">
      {/* progress */}
      <div className="px-5 pt-4 sm:px-8">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => setPhase("setup")}
            className="text-sm font-bold text-muted hover:text-indigo-ai"
          >
            ✕
          </button>
          <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-border">
            <div
              className="h-full rounded-full bg-indigo-ai transition-all"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-xs font-bold tabular-nums text-muted">
            {doneCount}/{total}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-8 px-6">
        <button
          onClick={() => setFlipped((f) => !f)}
          className="relative flex aspect-[3/2] w-full max-w-md flex-col items-center justify-center rounded-3xl border-2 border-border bg-card p-6 text-center shadow-sm transition-transform active:scale-[0.99]"
        >
          {canSpeak() && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                speakJa(card.word);
              }}
              className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai"
              title="Hear it"
            >
              🔊
            </span>
          )}
          <span className="font-jp text-5xl font-bold">{card.word}</span>
          {flipped ? (
            <div className="mt-5 w-full">
              <p className="font-jp text-xl text-indigo-ai">{card.reading}</p>
              <p className="text-sm text-muted">{card.romaji}</p>
              <p className="mt-2 text-lg font-semibold">{card.meaning}</p>
              <p className="mt-1 text-xs uppercase tracking-wide text-muted">
                {card.partOfSpeech}
              </p>
              <KanjiBreakdown word={card.word} />
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted">Tap or press Space to flip</p>
          )}
        </button>

        {flipped ? (
          <div className="grid w-full max-w-md grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <button
                key={g.grade}
                onClick={() => grade(g.grade)}
                className={`flex flex-col items-center rounded-2xl border-2 py-3 text-sm font-bold transition-transform active:scale-95 ${g.color}`}
              >
                {g.label}
                <span className="mt-0.5 text-[10px] opacity-60">{g.key}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">How well do you know this word?</p>
        )}
      </div>
    </div>
  );
}
