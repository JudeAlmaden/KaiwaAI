"use client";

import { useEffect, useMemo, useState, useRef, useCallback } from "react";
import PageHeader from "../PageHeader";
import LookupBox from "./LookupBox";
import ConjugationTutorial from "./ConjugationTutorial";
import { Chip, StatusBadge, STATUS_STYLE } from "../ui";
import { speakJa, canSpeak } from "@/lib/speak";
import KanjiBreakdown from "../chat/KanjiBreakdown";
import { formLabel } from "@/lib/form-label";
import { romajiToHiragana } from "@/lib/romaji-to-kana";

type Card = {
  id: string;
  word: string;
  reading: string;
  romaji?: string;
  meaning: string;
  partOfSpeech: string;
  status: "new" | "learning" | "known";
  repetitions: number;
  interval: number;
  nextReview: string;
  isPhrase: boolean;
  formType?: string | null;
  wordId?: number | null;
  dictionary?: string | null;
  note?: string | null; // User's custom note
};

type WordForm = { id: string; form: string; reading: string; formType: string; saved: boolean };

const FILTERS = ["All", "Learning", "Known"] as const;
type Filter = (typeof FILTERS)[number];
type SortBy = "Default" | "Mastery ↑" | "Mastery ↓";
const SORT_OPTIONS: SortBy[] = ["Default", "Mastery ↑", "Mastery ↓"];
type ContentTab = "words" | "phrases" | "conjugation";

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

function progressOf(c: Card): number {
  const rep = Math.min(c.repetitions / 3, 1);
  const intv = Math.min(c.interval / 21, 1);
  return Math.round(((rep + intv) / 2) * 100);
}

export default function VocabClient() {
  const [cards, setCards] = useState<Card[] | null>(null);
  const [contentTab, setContentTab] = useState<ContentTab>("words");
  const [filter, setFilter] = useState<Filter>("All");
  const [sortBy, setSortBy] = useState<SortBy>("Default");
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<Card | null>(null);
  const [forms, setForms] = useState<WordForm[]>([]);
  const [formsLoading, setFormsLoading] = useState(false);
  const [addingAllForms, setAddingAllForms] = useState(false);
  const [addingFormId, setAddingFormId] = useState<string | null>(null);
  const [usingBaseOnly, setUsingBaseOnly] = useState(false);
  const [showConjugations, setShowConjugations] = useState(false);
  
  // Note editing state
  const [editingNote, setEditingNote] = useState(false);
  const [noteText, setNoteText] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  
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

  function openCard(card: Card) {
    setForms([]);
    setShowConjugations(false);
    setFormsLoading(Boolean(card.wordId && card.dictionary));
    setSelected(card);
    setEditingNote(false);
    setNoteText(card.note || "");
  }

  useEffect(() => {
    if (!selected?.wordId || !selected.dictionary) {
      return;
    }
    let cancelled = false;
    fetch(`/api/dictionary/lookup?dictForm=${encodeURIComponent(selected.dictionary)}`)
      .then((r) => r.ok ? r.json() : null)
      .then((data) => {
        if (!cancelled) setForms(data?.type === "word" ? data.forms : []);
      })
      .catch(() => !cancelled && setForms([]))
      .finally(() => !cancelled && setFormsLoading(false));
    return () => { cancelled = true; };
  }, [selected?.wordId, selected?.dictionary]);

  async function addAllConjugations() {
    if (!selected?.wordId) return;
    const unsavedFormIds = forms
      .filter((form) => form.formType !== "dictionary" && !form.saved)
      .map((form) => form.id);
    if (!unsavedFormIds.length) return;
    setAddingAllForms(true);
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: selected.wordId, wordFormIds: unsavedFormIds }),
    });
    if (res.ok) {
      setForms((current) => current.map((form) => ({ ...form, saved: true })));
      load();
    }
    setAddingAllForms(false);
  }

  async function addConjugation(form: WordForm) {
    if (!selected?.wordId || form.saved) return;
    setAddingFormId(form.id);
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: selected.wordId, wordFormId: form.id }),
    });
    if (res.ok) {
      setForms((current) => current.map((item) =>
        item.id === form.id ? { ...item, saved: true } : item
      ));
      load();
    }
    setAddingFormId(null);
  }

  async function useBaseOnly() {
    if (!selected?.wordId) return;
    setUsingBaseOnly(true);
    const res = await fetch("/api/flashcards", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ wordId: selected.wordId, baseOnly: true }),
    });
    if (res.ok) {
      setSelected(null);
      load();
    }
    setUsingBaseOnly(false);
  }

  const contentCards = useMemo(
    () => {
      if (!cards) return [];
      const filtered = cards.filter((card) => card.isPhrase === (contentTab === "phrases"));
      console.log(`ContentTab: ${contentTab}, Total cards: ${cards.length}, Filtered: ${filtered.length}`);
      return filtered;
    },
    [cards, contentTab]
  );

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

  const hasMore = useMemo(() => {
    const totalFiltered = filtered.length;
    return displayCount < totalFiltered;
  }, [filtered.length, displayCount]);

  const counts = useMemo(() => {
    const c = { known: 0, learning: 0, total: contentCards.length };
    contentCards.forEach((x) => {
      if (x.status === "known") c.known++;
      else c.learning++; // treat 'new' as learning
    });
    return c;
  }, [contentCards]);

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
    setCards((cs) => {
      const updated = cs?.filter((c) => c.id !== id) ?? null;
      if (updated) saveToCache(updated);
      return updated;
    });
    setSelected(null);
    await fetch(`/api/flashcards/${id}`, { method: "DELETE" });
  }

  async function saveNote() {
    if (!selected) return;
    
    setSavingNote(true);
    try {
      const res = await fetch(`/api/flashcards/${selected.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "updateNote", note: noteText.trim() || null }),
      });
      
      if (res.ok) {
        // Update local state
        setCards((cs) => {
          const updated = cs?.map((c) =>
            c.id === selected.id ? { ...c, note: noteText.trim() || null } : c
          ) ?? null;
          if (updated) saveToCache(updated);
          return updated;
        });
        setSelected((s) => s ? { ...s, note: noteText.trim() || null } : null);
        setEditingNote(false);
      }
    } finally {
      setSavingNote(false);
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

      {/* Combined search + filter + sort toolbar */}
      <div className="flex flex-col gap-2 px-5 py-3 sm:px-8">
        {/* Search */}
        <div className="relative mx-auto w-full max-w-3xl">
          <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted/50">
            🔍
          </span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={`Filter your ${contentTab}...`}
            className="h-11 w-full rounded-2xl border-2 border-border bg-card pl-10 pr-4 text-sm outline-none focus:border-indigo-ai"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="absolute right-3 top-1/2 -translate-y-1/2 flex h-6 w-6 items-center justify-center rounded-full bg-border/50 text-xs text-muted hover:bg-border"
            >
              ✕
            </button>
          )}
        </div>
        {/* Filter chips + sort on one row */}
        <div className="mx-auto flex w-full max-w-3xl items-center gap-2 overflow-x-auto no-scrollbar scrollbar-none">
          {FILTERS.map((f) => (
            <Chip key={f} active={filter === f} onClick={() => setFilter(f)}>
              {f}
            </Chip>
          ))}
          <div className="ml-auto flex shrink-0 items-center gap-1.5">
            <span className="text-xs font-semibold text-muted">Sort:</span>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              className="rounded-xl border-2 border-border bg-card px-2.5 py-1 text-xs font-bold text-fg outline-none focus:border-indigo-ai"
            >
              {SORT_OPTIONS.map((o) => (
                <option key={o} value={o}>{o}</option>
              ))}
            </select>
          </div>
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
            {contentTab === "phrases"
              ? "Save phrases while chatting with Kai to collect them here."
              : "Tap words while chatting with Kai to collect them here."}
          </p>
        </div>
      ) : (
        <div className="relative flex-1 overflow-y-auto px-5 py-2 sm:px-8">
          <div className="mx-auto max-w-3xl">
            {visibleGroups.map(([pos, items]) => (
              <div key={pos} className="mb-6">
                <h3 className="mb-2.5 flex items-center gap-2 font-display text-xs font-bold uppercase tracking-wide text-muted">
                  {pos}
                  <span className="rounded-full bg-border/50 px-2 py-0.5 text-[10px]">
                    {items.length}
                  </span>
                </h3>
                <div className="grid gap-2.5 sm:grid-cols-2 min-w-0">
                  {items.map((c) => (
                    <div
                      key={c.id}
                      onClick={() => openCard(c)}
                      className="group flex cursor-pointer items-center gap-3 rounded-2xl border-2 border-border bg-card px-4 py-3 text-left transition-all hover:-translate-y-0.5 hover:border-indigo-soft hover:shadow-md hover:shadow-indigo-ai/5 min-w-0 max-w-full overflow-hidden"
                    >
                      <Ring pct={progressOf(c)} />
                      <div className="min-w-0 flex-1 overflow-hidden">
                        <div className="flex items-baseline gap-2 min-w-0 overflow-hidden">
                          <p className="font-jp text-lg font-bold leading-tight shrink-0 max-w-[60%] truncate">
                            {c.word}
                          </p>
                          <p className="truncate font-jp text-xs text-indigo-ai/70 min-w-0 flex-1">
                            {c.reading}
                          </p>
                          {c.note && (
                            <span className="text-xs shrink-0" title="Has note">📝</span>
                          )}
                        </div>
                        <p className="truncate text-xs text-muted min-w-0 block">
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
            
            {/* Infinite scroll sentinel */}
            {hasMore && (
              <div ref={sentinelRef} className="flex items-center justify-center py-8">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-ai border-t-transparent" />
              </div>
            )}
            
            {/* Show total when done loading */}
            {!hasMore && filtered.length > 0 && (
              <div className="py-6 text-center text-sm text-muted">
                All {filtered.length} {contentTab} loaded
              </div>
            )}
          </div>

          {/* FAB — add word from dictionary */}
          <div className="sticky bottom-4 flex justify-end pr-1 pt-2">
            <LookupBox onAdded={load} />
          </div>
        </div>
      )}
        </>
      )}

      {/* detail sheet */}
      {contentTab !== "conjugation" && selected && (
        <div
          className="fixed inset-0 z-40 flex items-end justify-center bg-black/30 sm:items-center"
          onClick={() => setSelected(null)}
        >
          <div
            className="max-h-[calc(100vh-2rem)] w-full max-w-md overflow-y-auto rounded-t-3xl border-2 border-border bg-card p-6 sm:rounded-3xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="font-jp text-3xl font-bold">{selected.word}</p>
                <p className="font-jp text-base text-indigo-ai">{selected.reading}</p>
                {selected.romaji && <p className="text-sm text-muted">{selected.romaji}</p>}
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

            <div className="mt-4 rounded-2xl bg-surface px-4 py-3">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted">Meaning</p>
              <p className="mt-1 text-base font-semibold leading-6 break-words whitespace-pre-wrap">{selected.meaning}</p>
            </div>
            <div className="mt-2 flex flex-wrap gap-2 text-xs">
              <span className="rounded-full bg-border/60 px-2.5 py-1 font-bold uppercase text-muted">
                {selected.partOfSpeech}
              </span>
              {formLabel(selected.formType) && (
                <span className="rounded-full bg-indigo-ai/10 px-2.5 py-1 font-bold uppercase text-indigo-ai">
                  {formLabel(selected.formType)}
                </span>
              )}
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

            {formsLoading ? (
              <p className="mt-4 text-xs text-muted">Loading conjugations…</p>
            ) : forms.length > 1 && (
              <section className="mt-4 border-t border-border pt-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-xs font-bold uppercase tracking-widest text-muted">Conjugations</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {forms.filter((form) => form.formType !== "dictionary").length} forms available
                    </p>
                  </div>
                  <button
                    onClick={() => setShowConjugations((show) => !show)}
                    className="shrink-0 rounded-full border border-border px-3 py-1.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
                  >
                    {showConjugations ? "Hide forms" : "View forms"}
                  </button>
                </div>
                {showConjugations && forms.some((form) => form.formType !== "dictionary" && !form.saved) && (
                  <button
                    onClick={addAllConjugations}
                    disabled={addingAllForms}
                    className="mt-3 w-full rounded-full border border-indigo-ai/30 px-3 py-2 text-xs font-bold text-indigo-ai transition-colors hover:bg-indigo-ai/10 disabled:opacity-60"
                  >
                    {addingAllForms ? "Adding…" : `+ Add all ${forms.filter((form) => form.formType !== "dictionary" && !form.saved).length} conjugations`}
                  </button>
                )}
                {showConjugations && (
                  <button
                    onClick={useBaseOnly}
                    disabled={usingBaseOnly}
                    className="mt-2 w-full rounded-full border border-border px-3 py-2 text-xs font-bold text-muted transition-colors hover:border-sakura/50 hover:bg-sakura/5 hover:text-sakura disabled:opacity-60"
                  >
                    {usingBaseOnly ? "Updating…" : "Use base form only (remove conjugation cards)"}
                  </button>
                )}
                {showConjugations && (
                  <div className="mt-3 grid grid-cols-2 gap-2">
                    {forms.map((form) => (
                      <div key={form.id} className={`rounded-xl border px-3 py-2 ${form.saved ? "border-mint/30 bg-mint/5" : "border-border bg-card"}`}>
                        <p className="font-jp text-base font-bold">{form.form}</p>
                        <p className="font-jp text-xs text-indigo-ai">{form.reading}</p>
                        <p className="mt-1 text-[10px] font-bold uppercase tracking-wide text-muted">{formLabel(form.formType) ?? "Dictionary form"}</p>
                        {form.formType !== "dictionary" && (
                          form.saved ? (
                            <p className="mt-2 text-[10px] font-bold uppercase tracking-wide text-mint">In deck</p>
                          ) : (
                            <button
                              onClick={() => addConjugation(form)}
                              disabled={addingFormId === form.id}
                              className="mt-2 rounded-full border border-indigo-ai/30 px-2 py-1 text-[10px] font-bold text-indigo-ai transition-colors hover:bg-indigo-ai/10 disabled:opacity-60"
                            >
                              {addingFormId === form.id ? "Adding…" : "+ Add this form"}
                            </button>
                          )
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </section>
            )}

            <KanjiBreakdown word={selected.word} />

            {/* Custom Note Section */}
            <div className="mt-4 border-t border-border pt-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-xs font-bold uppercase tracking-widest text-muted">Personal Note</p>
                {!editingNote && (
                  <button
                    onClick={() => setEditingNote(true)}
                    className="text-xs font-bold text-indigo-ai hover:underline"
                  >
                    {selected.note ? "Edit" : "+ Add note"}
                  </button>
                )}
              </div>
              
              {editingNote ? (
                <div>
                  <textarea
                    value={noteText}
                    onChange={(e) => setNoteText(e.target.value)}
                    placeholder="Add examples, mnemonics, or anything to help you remember..."
                    className="w-full rounded-lg border-2 border-border bg-surface px-3 py-2 text-sm outline-none focus:border-indigo-ai"
                    rows={4}
                    autoFocus
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      onClick={saveNote}
                      disabled={savingNote}
                      className="rounded-full bg-indigo-ai px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-indigo-soft disabled:opacity-60"
                    >
                      {savingNote ? "Saving..." : "Save"}
                    </button>
                    <button
                      onClick={() => {
                        setEditingNote(false);
                        setNoteText(selected.note || "");
                      }}
                      className="rounded-full border-2 border-border px-4 py-1.5 text-xs font-bold text-muted transition-colors hover:border-indigo-ai hover:text-indigo-ai"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : selected.note ? (
                <div className="rounded-lg bg-amber/5 border border-amber/20 px-3 py-2">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{selected.note}</p>
                </div>
              ) : (
                <p className="text-xs text-muted italic">No note yet. Click &quot;+ Add note&quot; to create one.</p>
              )}
            </div>

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
