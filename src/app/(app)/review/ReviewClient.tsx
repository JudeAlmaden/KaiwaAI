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

type StudyMode = 
  | "due"           // Cards with nextReview in the past
  | "all"           // Study ahead (any cards)
  | "recent"        // Recently added (last 7 days)
  | "struggling"    // Low ease factor (<2.0) or many reviews
  | "leeches";      // Cards reviewed 8+ times with interval <7 days

type Setup = {
  reviewType: "vocabulary" | "kanji";
  studyMode: StudyMode;
  status: string; // "" | new | learning | known
  jlptLevel: string; // "" | N5 | N4 | N3 | N2 | N1
  partOfSpeech: string; // "" | noun | verb | adjective | etc
  practice: boolean; // if true, don't update SRS/mastery
  limit: number;
};

export default function ReviewClient() {
  const [phase, setPhase] = useState<"setup" | "session" | "done">("setup");
  const [setup, setSetup] = useState<Setup>({ 
    reviewType: "vocabulary", 
    studyMode: "due", 
    status: "", 
    jlptLevel: "",
    partOfSpeech: "",
    practice: false,
    limit: 20 
  });
  const [dueCount, setDueCount] = useState<number | null>(null);

  const [queue, setQueue] = useState<Card[]>([]);
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ again: 0, good: 0 });

  useEffect(() => {
    fetch("/api/flashcards/review?studyMode=due&limit=200")
      .then((r) => r.json())
      .then((d) => setDueCount(d.cards?.length ?? 0))
      .catch(() => setDueCount(0));
  }, []);

  async function start(custom?: Setup) {
    const s = custom ?? setup;
    const params = new URLSearchParams({ 
      studyMode: s.studyMode, 
      limit: String(s.limit) 
    });
    if (s.status) params.set("status", s.status);
    if (s.jlptLevel) params.set("jlpt", s.jlptLevel);
    if (s.partOfSpeech) params.set("pos", s.partOfSpeech);
    if (s.practice) params.set("practice", "true");
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

      // Only update SRS if not in practice mode
      if (!setup.practice) {
        fetch("/api/flashcards/review", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.id, grade: g }),
        }).catch(() => {});
      }

      setTally((t) => ({
        again: t.again + (g === 0 ? 1 : 0),
        good: t.good + (g > 0 ? 1 : 0),
      }));

      const rest = queue.slice(1);
      setQueue(rest);
      setFlipped(false);
      if (rest.length === 0) setPhase("done");
    },
    [queue, setup.practice]
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
  // Redirect to kanji page if kanji mode is selected
  useEffect(() => {
    if (phase === "setup" && setup.reviewType === "kanji") {
      window.location.href = "/kanji";
    }
  }, [phase, setup.reviewType]);

  if (phase === "setup") {
    // If kanji mode selected, show redirecting message
    if (setup.reviewType === "kanji") {
      return (
        <div className="flex flex-1 flex-col items-center justify-center">
          <p className="text-sm text-muted">Redirecting to Kanji page...</p>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Review" jp="復習" subtitle="Build a session, or review what's due." />
        <div className="mx-auto w-full max-w-lg px-5 py-6 sm:px-8">
          {/* Review Type Selector */}
          <div className="mb-6 rounded-3xl border-2 border-border bg-card p-5">
            <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted">
              Review Type
            </p>
            <div className="flex gap-2">
              <Chip
                active={setup.reviewType === "vocabulary"}
                onClick={() => setSetup((s) => ({ ...s, reviewType: "vocabulary" }))}
              >
                📚 Vocabulary
              </Chip>
              <Chip
                active={setup.reviewType === "kanji"}
                onClick={() => setSetup((s) => ({ ...s, reviewType: "kanji" }))}
              >
                漢 Kanji
              </Chip>
            </div>
          </div>

          <button
            onClick={() => start({ ...setup, studyMode: "due", status: "", practice: false, limit: 200 })}
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
              Mode
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={!setup.practice}
                onClick={() => setSetup((s) => ({ ...s, practice: false }))}
              >
                📝 Review (affects mastery)
              </Chip>
              <Chip
                active={setup.practice}
                onClick={() => setSetup((s) => ({ ...s, practice: true }))}
              >
                🎯 Practice (no mastery change)
              </Chip>
            </div>

            <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              Study Focus
            </p>
            <div className="flex flex-wrap gap-2">
              <Chip
                active={setup.studyMode === "due"}
                onClick={() => setSetup((s) => ({ ...s, studyMode: "due" }))}
              >
                ⏰ Due now
              </Chip>
              <Chip
                active={setup.studyMode === "all"}
                onClick={() => setSetup((s) => ({ ...s, studyMode: "all" }))}
              >
                📚 Study ahead
              </Chip>
              <Chip
                active={setup.studyMode === "recent"}
                onClick={() => setSetup((s) => ({ ...s, studyMode: "recent" }))}
              >
                ✨ Recently added
              </Chip>
              <Chip
                active={setup.studyMode === "struggling"}
                onClick={() => setSetup((s) => ({ ...s, studyMode: "struggling" }))}
              >
                😓 Struggling cards
              </Chip>
              <Chip
                active={setup.studyMode === "leeches"}
                onClick={() => setSetup((s) => ({ ...s, studyMode: "leeches" }))}
              >
                🐛 Leeches
              </Chip>
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
              JLPT Level
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { v: "", l: "Any" },
                { v: "N5", l: "N5" },
                { v: "N4", l: "N4" },
                { v: "N3", l: "N3" },
                { v: "N2", l: "N2" },
                { v: "N1", l: "N1" },
              ].map((o) => (
                <Chip
                  key={o.v}
                  active={setup.jlptLevel === o.v}
                  onClick={() => setSetup((s) => ({ ...s, jlptLevel: o.v }))}
                >
                  {o.l}
                </Chip>
              ))}
            </div>

            <p className="mt-4 mb-1.5 text-xs font-bold uppercase tracking-wide text-muted">
              Part of Speech
            </p>
            <div className="flex flex-wrap gap-2">
              {[
                { v: "", l: "Any" },
                { v: "noun", l: "Noun" },
                { v: "verb", l: "Verb" },
                { v: "adjective", l: "Adjective" },
                { v: "adverb", l: "Adverb" },
                { v: "particle", l: "Particle" },
                { v: "expression", l: "Expression" },
              ].map((o) => (
                <Chip
                  key={o.v}
                  active={setup.partOfSpeech === o.v}
                  onClick={() => setSetup((s) => ({ ...s, partOfSpeech: o.v }))}
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
