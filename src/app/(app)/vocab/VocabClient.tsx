"use client";

import { useEffect, useMemo, useState } from "react";
import PageHeader from "../PageHeader";
import LookupBox from "./LookupBox";
import { Chip, StatusBadge, STATUS_STYLE } from "../ui";
import { speakJa, canSpeak } from "@/lib/speak";

type Card = {
  id: string;
  word: string;
  reading: string;
  romaji: string;
  meaning: string;
  partOfSpeech: string;
  status: "new" | "learning" | "known";
  repetitions: number;
  interval: number;
  nextReview: string;
};

const FILTERS = ["All", "New", "Learning", "Known"] as const;
type Filter = (typeof FILTERS)[number];

function progressOf(c: Card): number {
  const rep = Math.min(c.repetitions / 3, 1);
  const intv = Math.min(c.interval / 21, 1);
  return Math.round(((rep + intv) / 2) * 100);
}

export default function VocabClient() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [filter, setFilter] = useState<Filter>("All");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Card | null>(null);

  useEffect(() => {
    load();
  }, []);

  function load() {
    fetch("/api/flashcards")
      .then((r) => r.json())
      .then((d) => setCards(d.cards ?? []))
      .catch(() => setCards([]));
  }

  const filtered = useMemo(() => {
    if (!cards) return [];
    let list = cards;
    if (filter !== "All") list = list.filter((c) => c.status === filter.toLowerCase());
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (c) =>
          c.word.includes(q) ||
          c.reading.includes(q) ||
          c.romaji.toLowerCase().includes(q) ||
          c.meaning.toLowerCase().includes(q)
      );
    }
    return list;
  }, [cards, filter, query]);

  const groups = useMemo(() => {
    const m = new Map<string, Card[]>();
    for (const c of filtered) {
      const arr = m.get(c.partOfSpeech) ?? [];
      arr.push(c);
      m.set(c.partOfSpeech, arr);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  const counts = useMemo(() => {
    const c = { known: 0, learning: 0, neww: 0, total: cards?.length ?? 0 };
    cards?.forEach((x) => {
      if (x.status === "known") c.known++;
      else if (x.status === "learning") c.learning++;
      else c.neww++;
    });
    return c;
  }, [cards]);

  async function act(id: string, action: "reset" | "markKnown") {
    await fetch(`/api/flashcards/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action }),
    });
    setSelected(null);
    load();
  }

  async function remove(id: string) {
    setCards((cs) => cs?.filter((c) => c.id !== id) ?? null);
    setSelected(null);
    await fetch(`/api/flashcards/${id}`, { method: "DELETE" });
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Vocab"
        jp="単語"
        subtitle={cards ? `${counts.total} words collected` : "Loading…"}
      />

      <LookupBox onAdded={load} />

      {/* overview bar */}
      {cards && cards.length > 0 && (
        <div className="px-5 pt-3 sm:px-8">
          <div className="mx-auto max-w-3xl">
            <div className="flex h-3 overflow-hidden rounded-full bg-border/40">
              <Seg value={counts.neww} total={counts.total} className="bg-sky" />
              <Seg value={counts.learning} total={counts.total} className="bg-amber" />
              <Seg value={counts.known} total={counts.total} className="bg-mint" />
            </div>
            <div className="mt-2 flex gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1.5 text-sky">
                <span className="h-2 w-2 rounded-full bg-sky" />
                {counts.neww} new
              </span>
              <span className="flex items-center gap-1.5 text-amber">
                <span className="h-2 w-2 rounded-full bg-amber" />
                {counts.learning} learning
              </span>
              <span className="flex items-center gap-1.5 text-mint">
                <span className="h-2 w-2 rounded-full bg-mint" />
                {counts.known} known
              </span>
            </div>
          </div>
        </div>
      )}

      {/* search + filters */}
      <div className="flex flex-col gap-2.5 px-5 py-3 sm:px-8">
        <div className="relative mx-auto w-full max-w-3xl">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted/50">
            🔍
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search your words…"
            className="h-11 w-full rounded-2xl border-2 border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-indigo-ai"
          />
        </div>
        <div className="mx-auto flex w-full max-w-3xl gap-2 overflow-x-auto">
          {FILTERS.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
        </div>
      </div>

      {cards && filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-indigo-ai/10 text-4xl">
            📒
          </div>
          <h2 className="mt-4 font-display text-lg font-bold">
            {query || filter !== "All" ? "No matches" : "Your deck is empty"}
          </h2>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Tap words while chatting with Kai to collect them here.
          </p>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-2 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {groups.map(([pos, items]) => (
              <div key={pos} className="mb-6">
                <h3 className="mb-2.5 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-muted">
                  {pos}
                  <span className="rounded-full bg-border/50 px-2 py-0.5 text-[10px]">
                    {items.length}
                  </span>
                </h3>
                <div className="grid gap-2.5 sm:grid-cols-2">
                  {items.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => setSelected(c)}
                      className="group flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-soft hover:shadow-md hover:shadow-indigo-ai/5"
                    >
                      <Ring pct={progressOf(c)} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline gap-2">
                          <p className="font-jp text-lg font-bold leading-tight">
                            {c.word}
                          </p>
                          <p className="truncate font-jp text-xs text-indigo-ai/70">
                            {c.reading}
                          </p>
                        </div>
                        <p className="truncate text-xs text-muted">
                          {c.meaning}
                        </p>
                      </div>
                      {canSpeak() && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            speakJa(c.word);
                          }}
                          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-muted/50 transition-colors hover:bg-indigo-ai/10 hover:text-indigo-ai"
                          aria-label="Hear it"
                        >
                          🔊
                        </button>
                      )}
                      <StatusBadge status={c.status} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* detail sheet */}
      {selected && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="w-full max-w-md rounded-t-3xl border-2 border-border bg-card p-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="font-jp text-3xl font-bold">{selected.word}</p>
                <p className="font-jp text-base text-indigo-ai">{selected.reading}</p>
                <p className="text-sm text-muted">{selected.romaji}</p>
              </div>
              {canSpeak() && (
                <button
                  onClick={() => speakJa(selected.word)}
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai"
                  title="Hear it"
                >
                  🔊
                </button>
              )}
            </div>

            <p className="mt-3 text-lg font-semibold">{selected.meaning}</p>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-border/60 px-2.5 py-1 font-bold uppercase text-muted">
                {selected.partOfSpeech}
              </span>
              <span
                className={`rounded-full px-2.5 py-1 font-bold uppercase ${STATUS_STYLE[selected.status]}`}
              >
                {selected.status}
              </span>
              <span className="rounded-full bg-border/60 px-2.5 py-1 font-bold text-muted">
                {progressOf(selected)}% learned
              </span>
            </div>

            <p className="mt-3 text-xs text-muted">
              Next review:{" "}
              {new Date(selected.nextReview).toLocaleDateString(undefined, {
                month: "short",
                day: "numeric",
              })}
            </p>

            <div className="mt-5 flex flex-wrap gap-2">
              {selected.status !== "known" && (
                <button
                  onClick={() => act(selected.id, "markKnown")}
                  className="rounded-full border-2 border-mint/40 px-4 py-2 text-sm font-bold text-mint transition-colors hover:bg-mint/10"
                >
                  Mark known
                </button>
              )}
              <button
                onClick={() => act(selected.id, "reset")}
                className="rounded-full border-2 border-border px-4 py-2 text-sm font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
              >
                Reset progress
              </button>
              <button
                onClick={() => remove(selected.id)}
                className="ml-auto rounded-full border-2 border-sakura/40 px-4 py-2 text-sm font-bold text-sakura transition-colors hover:bg-sakura/10"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function Seg({ value, total, className }: { value: number; total: number; className: string }) {
  if (value === 0) return null;
  return <div className={`h-full ${className}`} style={{ flex: value / total }} />;
}

function Ring({ pct }: { pct: number }) {
  const r = 9;
  const circ = 2 * Math.PI * r;
  return (
    <svg width="26" height="26" viewBox="0 0 26 26" className="shrink-0">
      <circle cx="13" cy="13" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
      <circle
        cx="13"
        cy="13"
        r={r}
        fill="none"
        stroke="var(--indigo)"
        strokeWidth="3"
        strokeLinecap="round"
        strokeDasharray={circ}
        strokeDashoffset={circ * (1 - pct / 100)}
        transform="rotate(-90 13 13)"
      />
    </svg>
  );
}
