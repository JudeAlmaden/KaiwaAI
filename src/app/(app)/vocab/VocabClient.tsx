"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import PageHeader from "../PageHeader";
import ConjugationTutorial from "./ConjugationTutorial";
import { Seg } from "./VocabBits";
import VocabFilterBar from "./VocabFilterBar";
import VocabList from "./VocabList";
import VocabDetailSheet from "./VocabDetailSheet";
import { progressOf, type Card, type ContentTab, type Filter, type SortBy } from "./types";
import { romajiToHiragana } from "@/lib/romaji-to-kana";

const STORAGE_KEY = "kaiwa_vocab_cache";
const ITEMS_PER_PAGE = 50;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

type CachedData = {
  cards: Card[];
  timestamp: number;
};

function saveToCache(cards: Card[]): void {
  try {
    const data: CachedData = { cards, timestamp: Date.now() };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // Storage quota exceeded or unavailable
  }
}

function loadFromCache(): Card[] | null {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;

    const data: CachedData = JSON.parse(stored);
    const age = Date.now() - data.timestamp;

    // Return cached data if less than TTL old
    if (age < CACHE_TTL) {
      return data.cards;
    }

    // Cache expired
    localStorage.removeItem(STORAGE_KEY);
    return null;
  } catch {
    return null;
  }
}

export default function VocabClient() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [contentTab, setContentTab] = useState<ContentTab>("words");
  const [filter, setFilter] = useState<Filter>("All");
  const [sortBy, setSortBy] = useState<SortBy>("Default");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Card | null>(null);

  // Infinite scroll state
  const [displayCount, setDisplayCount] = useState(ITEMS_PER_PAGE);
  const [loading, setLoading] = useState(false);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    // Try to load from cache first
    const cached = loadFromCache();
    if (cached) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCards(cached);
    }

    // Then fetch fresh data
    load();
  }, []);

  function load() {
    setLoading(true);
    fetch("/api/flashcards")
      .then((r) => r.json())
      .then((d) => {
        const fetchedCards = d.cards ?? [];
        setCards(fetchedCards);
        saveToCache(fetchedCards);
      })
      .catch(() => setCards([]))
      .finally(() => setLoading(false));
  }

  // Infinite scroll observer
  const loadMore = useCallback(() => {
    if (loading) return;
    setDisplayCount((prev) => prev + ITEMS_PER_PAGE);
  }, [loading]);

  useEffect(() => {
    // Set up intersection observer for infinite scroll
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          loadMore();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );

    if (sentinelRef.current) {
      observerRef.current.observe(sentinelRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [loadMore]);

  // Reset display count when filters change
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDisplayCount(ITEMS_PER_PAGE);
  }, [contentTab, filter, query, sortBy]);

  const contentCards = useMemo(() => {
    if (!cards) return [];
    return cards.filter((card) => card.isPhrase === (contentTab === "phrases"));
  }, [cards, contentTab]);

  const filtered = useMemo(() => {
    let list = contentCards;
    // "Learning" filter includes both new + learning status
    if (filter === "Learning") list = list.filter((c) => c.status === "new" || c.status === "learning");
    else if (filter === "Known") list = list.filter((c) => c.status === "known");
    const q = query.trim().toLowerCase();
    if (q) {
      // Convert romaji to hiragana for better search matching
      const qHiragana = romajiToHiragana(q);
      list = list.filter(
        (c) =>
          c.word.includes(q) ||
          c.reading.includes(q) ||
          c.reading.includes(qHiragana) ||
          (c.romaji && c.romaji.toLowerCase().includes(q)) ||
          c.meaning.toLowerCase().includes(q)
      );
    }
    // Apply mastery sort
    if (sortBy === "Mastery ↑") list = [...list].sort((a, b) => progressOf(a) - progressOf(b));
    else if (sortBy === "Mastery ↓") list = [...list].sort((a, b) => progressOf(b) - progressOf(a));
    return list;
  }, [contentCards, filter, query, sortBy]);

  const groups = useMemo(() => {
    const m = new Map<string, Card[]>();
    for (const c of filtered) {
      const arr = m.get(c.partOfSpeech) ?? [];
      arr.push(c);
      m.set(c.partOfSpeech, arr);
    }
    return [...m.entries()].sort((a, b) => b[1].length - a[1].length);
  }, [filtered]);

  // Visible groups with infinite scroll limit
  const visibleGroups = useMemo(() => {
    let count = 0;
    const result: [string, Card[]][] = [];

    for (const [pos, items] of groups) {
      if (count >= displayCount) break;

      const remaining = displayCount - count;
      if (remaining >= items.length) {
        result.push([pos, items]);
        count += items.length;
      } else {
        result.push([pos, items.slice(0, remaining)]);
        count += remaining;
      }
    }

    return result;
  }, [groups, displayCount]);

  const hasMore = displayCount < filtered.length;

  const counts = useMemo(() => {
    const c = { known: 0, learning: 0, total: contentCards.length };
    contentCards.forEach((x) => {
      if (x.status === "known") c.known++;
      else c.learning++; // treat 'new' as learning
    });
    return c;
  }, [contentCards]);

  /** The sheet edited a card: keep the list and the open card in sync. */
  function updateCard(patch: Partial<Card>) {
    const id = selected?.id;
    if (!id) return;
    setCards((cs) => {
      const updated = cs?.map((c) => (c.id === id ? { ...c, ...patch } : c)) ?? null;
      if (updated) saveToCache(updated);
      return updated;
    });
    setSelected((s) => (s ? { ...s, ...patch } : null));
  }

  async function remove(id: string) {
    const cardToDelete = cards?.find((c) => c.id === id);
    const wordName = cardToDelete?.word;
    const dictName = cardToDelete?.dictionary;

    setCards((cs) => {
      const updated = cs?.filter((c) => c.id !== id) ?? null;
      if (updated) saveToCache(updated);
      return updated;
    });
    setSelected(null);
    await fetch(`/api/flashcards/${id}`, { method: "DELETE" });

    // Notify other components/tabs (e.g. chat SavedWordsContext)
    if (typeof window !== "undefined") {
      if (wordName) window.dispatchEvent(new CustomEvent("kaiwa:vocab-removed", { detail: { word: wordName } }));
      if (dictName && dictName !== wordName) {
        window.dispatchEvent(new CustomEvent("kaiwa:vocab-removed", { detail: { word: dictName } }));
      }
    }
  }

  return (
    <div className="flex flex-1 flex-col min-w-0 max-w-full overflow-x-hidden">
      <PageHeader
        title="Vocab"
        jp="単語"
        subtitle={
          contentTab === "conjugation"
            ? "Japanese verb & adjective conjugation"
            : cards
              ? `${counts.total} ${contentTab} collected`
              : "Loading…"
        }
        bar={
          contentTab !== "conjugation" && cards && counts.total > 0 ? (
            <div>
              <div className="flex h-1.5 overflow-hidden rounded-full bg-border/40">
                <Seg value={counts.learning} total={counts.total} className="bg-amber" />
                <Seg value={counts.known} total={counts.total} className="bg-mint" />
              </div>
              <div className="mt-1.5 flex gap-3 text-xs font-semibold">
                <span className="flex items-center gap-1 text-amber">
                  <span className="h-1.5 w-1.5 rounded-full bg-amber" />
                  {counts.learning} learning
                </span>
                <span className="flex items-center gap-1 text-mint">
                  <span className="h-1.5 w-1.5 rounded-full bg-mint" />
                  {counts.known} known
                </span>
              </div>
            </div>
          ) : undefined
        }
      />

      <div className="px-5 pt-3 sm:px-8">
        <div className="mx-auto grid w-full max-w-3xl grid-cols-3 rounded-2xl bg-border/40 p-1">
          <button
            onClick={() => setContentTab("words")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
              contentTab === "words" ? "bg-card text-indigo-ai shadow-sm" : "text-muted"
            }`}
          >
            Words
          </button>
          <button
            onClick={() => setContentTab("phrases")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
              contentTab === "phrases" ? "bg-card text-indigo-ai shadow-sm" : "text-muted"
            }`}
          >
            Phrases
          </button>
          <button
            onClick={() => setContentTab("conjugation")}
            className={`rounded-xl px-4 py-2 text-sm font-bold transition-colors ${
              contentTab === "conjugation" ? "bg-card text-indigo-ai shadow-sm" : "text-muted"
            }`}
          >
            Conjugation
          </button>
        </div>
      </div>

      {contentTab === "conjugation" ? (
        <div className="flex-1 px-5 pt-5 sm:px-8">
          <ConjugationTutorial />
        </div>
      ) : (
        <>
          <VocabFilterBar
            contentTab={contentTab}
            query={query}
            onQueryChange={setQuery}
            filter={filter}
            onFilterChange={setFilter}
            sortBy={sortBy}
            onSortChange={setSortBy}
          />

          <VocabList
            groups={visibleGroups}
            isEmpty={Boolean(cards) && filtered.length === 0}
            hasMore={hasMore}
            totalFiltered={filtered.length}
            contentTab={contentTab}
            query={query}
            filter={filter}
            sentinelRef={sentinelRef}
            onSelect={setSelected}
            onAdded={load}
          />
        </>
      )}

      {contentTab !== "conjugation" && selected && (
        <VocabDetailSheet
          key={selected.id}
          card={selected}
          onClose={() => setSelected(null)}
          onReload={load}
          onUpdated={updateCard}
          onRemove={remove}
        />
      )}
    </div>
  );
}
