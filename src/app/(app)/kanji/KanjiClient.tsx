"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import PageHeader from "../PageHeader";
import { Chip } from "../ui";

type KanjiCard = {
  id: string;
  character: string;
  meanings: string[];
  readingsOn: string[];
  readingsKun: string[];
  jlptLevel: number | null;
  strokes: number;
  vocabCount: number;
  knownVocabCount: number;
  masteryPercent: number;
};

const JLPT_LEVELS = ["All", "N5", "N4", "N3", "N2", "N1"] as const;
type JlptFilter = (typeof JLPT_LEVELS)[number];

const SORT_OPTIONS = ["Frequency", "Mastery", "Strokes"] as const;
type SortOption = (typeof SORT_OPTIONS)[number];

export default function KanjiClient() {
  const router = useRouter();
  const [kanji, setKanji] = useState<KanjiCard[] | null>(null);
  const [search, setSearch] = useState("");
  const [jlptFilter, setJlptFilter] = useState<JlptFilter>("All");
  const [sortBy, setSortBy] = useState<SortOption>("Frequency");
  const [loading, setLoading] = useState(true);

  const loadKanji = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        sortBy: sortBy.toLowerCase(),
        limit: "500", // Load more for client-side filtering
      });

      const res = await fetch(`/api/kanji?${params}`);
      const data = await res.json();
      setKanji(data.kanji || []);
    } catch (error) {
      console.error("Failed to load kanji:", error);
      setKanji([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadKanji();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filtered = useMemo(() => {
    if (!kanji) return [];

    let list = kanji;

    // JLPT filter
    if (jlptFilter !== "All") {
      const level = parseInt(jlptFilter.substring(1)); // "N5" -> 5
      list = list.filter((k) => k.jlptLevel === level);
    }

    // Search filter
    const q = search.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (k) =>
          k.character.includes(q) ||
          k.meanings.some((m) => m.toLowerCase().includes(q)) ||
          k.readingsOn.some((r) => r.includes(q)) ||
          k.readingsKun.some((r) => r.includes(q))
      );
    }

    return list;
  }, [kanji, jlptFilter, search]);

  if (loading) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4">
        <div className="relative">
          <div className="h-20 w-20 animate-spin rounded-full border-4 border-border border-t-indigo-ai"></div>
          <div className="absolute inset-0 flex items-center justify-center text-3xl">
            📚
          </div>
        </div>
        <p className="text-sm text-muted animate-pulse">Loading your kanji collection...</p>
      </div>
    );
  }

  if (!kanji || kanji.length === 0) {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Kanji" jp="漢字" subtitle="Learn kanji from your vocabulary" />
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="relative">
            <div className="absolute inset-0 animate-pulse rounded-full bg-indigo-ai/20 blur-xl"></div>
            <div className="relative flex h-24 w-24 items-center justify-center rounded-3xl bg-gradient-to-br from-indigo-ai/10 to-purple-500/10 text-5xl">
              📚
            </div>
          </div>
          <h2 className="mt-6 font-display text-xl font-bold">No kanji yet</h2>
          <p className="mt-2 max-w-sm text-sm text-muted">
            Add vocabulary words to start learning kanji. Kanji from your saved words will
            appear here automatically.
          </p>
          <button
            onClick={() => router.push("/chat")}
            className="mt-6 rounded-full bg-indigo-ai px-6 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-ai/20 transition-all hover:bg-indigo-ai/90 hover:scale-105"
          >
            Chat with Kai
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col">
      <PageHeader
        title="Kanji"
        jp="漢字"
        subtitle={`${filtered.length} characters from your vocabulary`}
      />

      {/* Search + Filters */}
      <div className="flex flex-col gap-3 border-b-2 border-border bg-bg/50 px-5 py-4 sm:px-8">
        <div className="relative mx-auto w-full max-w-3xl">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg">
            🔍
          </span>
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search kanji, meanings, or readings…"
            className="h-12 w-full rounded-2xl border-2 border-border bg-card pl-11 pr-4 text-sm outline-none transition-all focus:border-indigo-ai focus:shadow-lg focus:shadow-indigo-ai/10"
          />
          {search && (
            <button
              onClick={() => setSearch("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-border/50 text-xs text-muted transition-colors hover:bg-border"
            >
              ✕
            </button>
          )}
        </div>

        {/* JLPT Level Filter */}
        <div className="mx-auto flex w-full max-w-3xl gap-2 overflow-x-auto pb-1">
          {JLPT_LEVELS.map((level) => (
            <Chip
              key={level}
              active={jlptFilter === level}
              onClick={() => setJlptFilter(level)}
            >
              {level}
            </Chip>
          ))}
        </div>

        {/* Sort Selector */}
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 text-xs">
          <span className="font-semibold text-muted">Sort:</span>
          {SORT_OPTIONS.map((opt) => (
            <button
              key={opt}
              onClick={() => setSortBy(opt)}
              className={`rounded-full px-3 py-1.5 font-bold transition-all ${
                sortBy === opt
                  ? "bg-indigo-ai text-white shadow-md shadow-indigo-ai/20 scale-105"
                  : "text-muted hover:bg-border/50 hover:scale-105"
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {/* Kanji Grid */}
      {filtered.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
          <div className="text-5xl">🔍</div>
          <h2 className="mt-4 font-display text-lg font-bold">No matches</h2>
          <p className="mt-1 max-w-xs text-sm text-muted">
            Try adjusting your search or filters.
          </p>
          <button
            onClick={() => {
              setSearch("");
              setJlptFilter("All");
            }}
            className="mt-4 rounded-full border-2 border-indigo-ai px-5 py-2 text-sm font-bold text-indigo-ai transition-all hover:bg-indigo-ai hover:text-white hover:scale-105"
          >
            Clear filters
          </button>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto px-5 py-4 sm:px-8">
          <div className="mx-auto grid max-w-3xl grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            {filtered.map((k) => (
              <KanjiCardItem
                key={k.id}
                kanji={k}
                onClick={() => router.push(`/kanji/${encodeURIComponent(k.character)}`)}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function KanjiCardItem({
  kanji,
  onClick,
}: {
  kanji: KanjiCard;
  onClick: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className="group relative flex cursor-pointer flex-col items-center gap-2.5 rounded-2xl border-2 border-border bg-card p-5 text-center transition-all hover:-translate-y-1 hover:border-indigo-soft hover:shadow-lg hover:shadow-indigo-ai/10"
    >
      {/* Mastery Ring - positioned absolute top-right */}
      <div className="absolute right-3 top-3">
        <MasteryRing percent={kanji.masteryPercent} />
      </div>

      {/* Large Kanji Character */}
      <div className="font-jp text-5xl font-bold leading-none text-foreground transition-colors group-hover:text-indigo-ai sm:text-6xl">
        {kanji.character}
      </div>

      {/* Primary Meaning */}
      <p className="line-clamp-1 px-2 text-xs font-semibold text-muted">
        {kanji.meanings[0] || "Unknown"}
      </p>

      {/* Meta badges */}
      <div className="flex flex-wrap items-center justify-center gap-1.5">
        {kanji.jlptLevel && (
          <span className="rounded-full bg-indigo-ai px-2 py-0.5 text-[10px] font-bold text-white">
            N{kanji.jlptLevel}
          </span>
        )}
        {kanji.strokes && (
          <span className="rounded-full bg-sky/20 px-2 py-0.5 text-[10px] font-bold text-sky">
            {kanji.strokes}画
          </span>
        )}
      </div>

      {/* Vocab Count */}
      <p className="text-[10px] text-muted">
        {kanji.vocabCount} word{kanji.vocabCount !== 1 ? "s" : ""}
      </p>
    </div>
  );
}

function MasteryRing({ percent }: { percent: number }) {
  const r = 14;
  const circ = 2 * Math.PI * r;
  const color =
    percent >= 80 ? "var(--mint)" : percent >= 40 ? "var(--amber)" : "var(--sky)";

  return (
    <div className="relative">
      <svg width="36" height="36" viewBox="0 0 36 36" className="transition-transform group-hover:scale-110">
        <circle cx="18" cy="18" r={r} fill="none" stroke="var(--border)" strokeWidth="3" />
        <circle
          cx="18"
          cy="18"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray={circ}
          strokeDashoffset={circ * (1 - percent / 100)}
          transform="rotate(-90 18 18)"
          className="transition-all duration-300"
        />
      </svg>
      <span
        className="absolute inset-0 flex items-center justify-center text-[10px] font-bold"
        style={{ color }}
      >
        {percent}
      </span>
    </div>
  );
}
