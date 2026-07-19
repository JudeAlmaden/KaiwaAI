"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Kai from "../../Kai";
import PageHeader from "../PageHeader";
import { PopButton } from "../../PopButton";
import { speakJa, canSpeak } from "@/lib/speak";
import KanjiBreakdown from "../chat/KanjiBreakdown";
import { formLabel } from "@/lib/form-label";
import { scheduleReviewNotifications } from "@/lib/review-notifications";
import Furigana from "./Furigana";
import Petals from "../../Petals";
import QuestGallery from "./QuestGallery";

type Card = {
  id: string;
  type?: "vocabulary" | "kanji"; // For mixed mode
  // Vocabulary fields
  word?: string;
  reading?: string;
  romaji?: string;
  meaning?: string;
  partOfSpeech?: string;
  formType?: string | null;
  dictionary?: string | null;
  note?: string | null; // User's personal note
  // Kanji fields
  character?: string;
  meanings?: string[];
  readingsOn?: string[];
  readingsKun?: string[];
  radicals?: string[];
  mnemonic?: string; // User's mnemonic for this kanji
  // Common
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

type CardDirection = "jp-to-en" | "en-to-jp" | "mixed";
type ReviewType = "vocabulary" | "kanji" | "mixed";

type Setup = {
  reviewType: ReviewType;
  studyMode: StudyMode;
  direction: CardDirection;
  practice: boolean; // if true, don't update SRS/mastery
  limit: number;
  isContinuous: boolean;
  activeLimit: number | "all";
};

export default function ReviewClient() {
  const [phase, setPhase] = useState<"setup" | "session" | "done">("setup");
  const [setup, setSetup] = useState<Setup>({ 
    reviewType: "vocabulary",
    studyMode: "due", 
    direction: "jp-to-en",
    practice: false,
    limit: 20,
    isContinuous: false,
    activeLimit: 5
  });
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showCustomModal, setShowCustomModal] = useState(false);

  const [activePool, setActivePool] = useState<Card[]>([]);
  const [incomingQueue, setIncomingQueue] = useState<Card[]>([]);
  const [postedCardIds, setPostedCardIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ again: 0, good: 0 });
  const [showHint, setShowHint] = useState(false);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);

  const handleGenerateMnemonic = useCallback(async (kanjiChar: string, meanings: string[], radicals: string[], isRegenerate: boolean) => {
    if (isRegenerate) {
      const confirmed = window.confirm(
        "⚠️ Are you sure you want to regenerate the mnemonic?\n\nThis will replace the existing mnemonic with a new one."
      );
      if (!confirmed) return;
    }

    setGeneratingMnemonic(true);
    try {
      const { generateKanjiMnemonicClient } = await import("@/lib/kanji-mnemonic-client");
      
      const mnemonic = await generateKanjiMnemonicClient({
        character: kanjiChar,
        meanings,
        radicals,
      });

      // Save to server
      await fetch(`/api/kanji/${encodeURIComponent(kanjiChar)}/mnemonic`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mnemonic }),
      });

      // Update the current card in activePool
      setActivePool(prev => {
        const updated = [...prev];
        if (updated[0]) {
          updated[0] = { ...updated[0], mnemonic };
        }
        return updated;
      });
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : "Failed to generate mnemonic";
      if (errorMsg === "NO_API_KEY") {
        alert("💡 Add your Gemini API key in Settings to generate mnemonics.\n\nThis feature uses your own API key (BYOK).");
      } else if (errorMsg === "BAD_API_KEY") {
        alert("❌ Invalid API key. Check your Gemini key in Settings.");
      } else if (errorMsg === "RATE_LIMIT") {
        alert("⏳ Rate limit exceeded. Please try again in a moment.");
      } else {
        alert(`Failed to generate mnemonic: ${errorMsg}`);
      }
    } finally {
      setGeneratingMnemonic(false);
    }
  }, []);

  const handleShowHint = useCallback(async () => {
    const card = activePool[0];
    if (!card) return;
    
    // Only for kanji cards
    const cardType = card.type || setup.reviewType;
    if (cardType === "vocabulary") return;

    // If mnemonic already exists, just show it
    if (card.mnemonic) {
      setShowHint(true);
      return;
    }

    // Otherwise, generate it
    await handleGenerateMnemonic(
      card.character!,
      card.meanings!,
      card.radicals || [],
      false
    );
    setShowHint(true);
  }, [activePool, setup.reviewType, handleGenerateMnemonic]);

  useEffect(() => {
    const endpoint = `/api/${setup.reviewType === "kanji" ? "kanji" : "flashcards"}/review?studyMode=due&limit=200`;
    fetch(endpoint)
      .then((r) => r.json())
      .then((d) => setDueCount(d.cards?.length ?? 0))
      .catch(() => setDueCount(0));
  }, [setup.reviewType]);

  const fetchMoreCards = useCallback(async () => {
    const endpoint = setup.reviewType === "mixed" 
      ? "/api/review/mixed"
      : `/api/${setup.reviewType === "kanji" ? "kanji" : "flashcards"}/review`;
      
    const params = new URLSearchParams({ 
      studyMode: setup.studyMode, 
      limit: "100"
    });
    if (setup.practice) params.set("practice", "true");
    
    try {
      const res = await fetch(`${endpoint}?${params}`);
      const d = await res.json();
      const newCards: Card[] = d.cards ?? [];
      if (newCards.length === 0) return [];
      
      const existingIds = new Set([
        ...activePool.map((c) => c.id),
        ...postedCardIds,
      ]);
      const filtered = newCards.filter((c) => !existingIds.has(c.id));
      
      const shuffled = setup.direction === "mixed" 
        ? filtered.map(c => ({ ...c, _dir: Math.random() < 0.5 ? "jp-to-en" : "en-to-jp" as const }))
        : filtered.map(c => ({ ...c, _dir: setup.direction as "jp-to-en" | "en-to-jp" }));
        
      return shuffled;
    } catch {
      return [];
    }
  }, [setup, activePool, postedCardIds]);

  async function start(custom?: Partial<Setup>) {
    const s = { ...setup, ...custom };
    
    // For mixed mode, use the dedicated mixed endpoint
    const endpoint = s.reviewType === "mixed" 
      ? "/api/review/mixed"
      : `/api/${s.reviewType === "kanji" ? "kanji" : "flashcards"}/review`;
      
    const params = new URLSearchParams({ 
      studyMode: s.studyMode, 
      limit: String(s.limit) 
    });
    if (s.practice) params.set("practice", "true");
    const res = await fetch(`${endpoint}?${params}`);
    const d = await res.json();
    const cards: Card[] = d.cards ?? [];
    if (cards.length === 0) {
      setActivePool([]);
      setIncomingQueue([]);
      setPhase("done");
      return;
    }
    
    // Shuffle for mixed direction
    const shuffled = s.direction === "mixed" 
      ? cards.map(c => ({ ...c, _dir: Math.random() < 0.5 ? "jp-to-en" : "en-to-jp" as const }))
      : cards.map(c => ({ ...c, _dir: s.direction as "jp-to-en" | "en-to-jp" }));
    
    const activeLimitNum = s.activeLimit === "all" ? shuffled.length : s.activeLimit;
    const initialActive = shuffled.slice(0, activeLimitNum);
    const initialIncoming = shuffled.slice(activeLimitNum);

    setActivePool(initialActive);
    setIncomingQueue(initialIncoming);
    setPostedCardIds(new Set());
    setTotal(shuffled.length);
    setTally({ again: 0, good: 0 });
    setFlipped(false);
    setShowHint(false);
    setPhase("session");
  }

  const grade = useCallback(
    async (g: number) => {
      const card = activePool[0];
      if (!card) return;

      const isFirstAttempt = !postedCardIds.has(card.id);

      // Only update SRS if not in practice mode and it's first attempt
      if (!setup.practice && isFirstAttempt) {
        const cardType = card.type || setup.reviewType;
        const endpoint = cardType === "kanji" 
          ? "/api/kanji/review"
          : "/api/flashcards/review";
          
        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ cardId: card.id, grade: g }),
        }).catch(() => {});
      }

      if (isFirstAttempt) {
        setTally((t) => ({
          again: t.again + (g === 0 ? 1 : 0),
          good: t.good + (g > 0 ? 1 : 0),
        }));
        setPostedCardIds((prev) => {
          const next = new Set(prev);
          next.add(card.id);
          return next;
        });
      }

      const nextActive = [...activePool];
      const nextIncoming = [...incomingQueue];

      if (g > 0) {
        // Correct/passed: remove card from active pool
        nextActive.shift();
        
        // Refill from incoming queue if possible
        if (nextIncoming.length > 0) {
          const newCard = nextIncoming.shift();
          if (newCard) {
            nextActive.push(newCard);
          }
          setActivePool(nextActive);
          setIncomingQueue(nextIncoming);
        } else if (setup.isContinuous) {
          // If in continuous mode and incoming is empty, fetch more
          setActivePool(nextActive);
          setIncomingQueue([]);
          
          fetchMoreCards().then((more) => {
            if (more.length > 0) {
              const firstCard = more[0];
              setIncomingQueue(more.slice(1));
              setActivePool((currentActive) => [...currentActive, firstCard]);
              setTotal((t) => t + more.length);
            } else {
              if (nextActive.length === 0) {
                setPhase("done");
              }
            }
          });
        } else {
          setActivePool(nextActive);
          setIncomingQueue([]);
          if (nextActive.length === 0) {
            setPhase("done");
          }
        }
      } else {
        // Failed (g === 0): keep in active pool, but move it to the end
        const failedCard = nextActive.shift();
        if (failedCard) {
          nextActive.push(failedCard);
        }
        setActivePool(nextActive);
      }

      setFlipped(false);
      setShowHint(false); // Reset hint when moving to next card
    },
    [activePool, incomingQueue, postedCardIds, setup, fetchMoreCards]
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

  // Reschedule notifications after completing review
  useEffect(() => {
    if (phase !== "done") return;
    // Fetch updated due count and reschedule notifications
    fetch("/api/stats")
      .then((res) => res.json())
      .then((data) => {
        void scheduleReviewNotifications(data.dueCount || 0);
      })
      .catch(() => {
        // Silently fail - not critical
      });
  }, [phase]);

  // ── SETUP ──────────────────────────────────────────────────────────────
  if (phase === "setup") {
    return (
      <div className="flex flex-1 flex-col">
        <PageHeader title="Review" jp="復習" subtitle="Choose a quest to begin your session." />
        <QuestGallery
          dueCount={dueCount}
          setup={setup}
          setSetup={setSetup}
          onStartQuest={start}
          showCustomModal={showCustomModal}
          setShowCustomModal={setShowCustomModal}
          showAdvanced={showAdvanced}
          setShowAdvanced={setShowAdvanced}
        />
      </div>
    );
  }

  // ── DONE ───────────────────────────────────────────────────────────────
  if (phase === "done") {
    const reviewed = tally.again + tally.good;
    const accuracy = reviewed > 0 ? Math.round((tally.good / reviewed) * 100) : 0;
    
    const radius = 40;
    const circumference = 2 * Math.PI * radius;
    const strokeDashoffset = circumference - (accuracy / 100) * circumference;

    return (
      <div className="flex flex-1 flex-col relative overflow-hidden">
        {/* Celebrating drifting sakura petals in background */}
        {reviewed > 0 && <Petals />}
        
        <PageHeader title="Review" jp="復習" subtitle="Review complete! Here's your performance." />
        
        <div className="flex flex-1 flex-col items-center justify-center px-6 py-8 text-center z-10">
          <Kai size={80} />
          <h2 className="mt-4 font-display text-2xl font-extrabold text-foreground">
            {reviewed > 0 ? "Nice work! 🎉" : "Nothing to review"}
          </h2>
          
          {reviewed > 0 ? (
            <>
              {/* Radial Accuracy Ring */}
              <div className="relative flex items-center justify-center h-28 w-28 mt-6">
                <svg className="w-full h-full transform -rotate-90">
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    className="stroke-border"
                    strokeWidth="8"
                    fill="transparent"
                  />
                  <circle
                    cx="56"
                    cy="56"
                    r={radius}
                    className="stroke-indigo-ai transition-all duration-1000 ease-out"
                    strokeWidth="8"
                    fill="transparent"
                    strokeDasharray={circumference}
                    strokeDashoffset={strokeDashoffset}
                    strokeLinecap="round"
                  />
                </svg>
                <div className="absolute flex flex-col items-center justify-center">
                  <span className="text-2xl font-extrabold text-foreground">{accuracy}%</span>
                  <span className="text-[10px] uppercase font-bold tracking-widest text-muted">Accuracy</span>
                </div>
              </div>

              {/* Stats Cards Dashboard */}
              <div className="grid grid-cols-3 gap-3 w-full max-w-md mt-6">
                <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 text-center shadow-sm hover:scale-[1.02] transition-transform">
                  <span className="text-xl">📚</span>
                  <span className="block text-lg font-extrabold text-foreground mt-1">{reviewed}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted">Reviewed</span>
                </div>
                <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 text-center shadow-sm hover:scale-[1.02] transition-transform">
                  <span className="text-xl">✅</span>
                  <span className="block text-lg font-extrabold text-mint mt-1">{tally.good}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">Solid</span>
                </div>
                <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-4 text-center shadow-sm hover:scale-[1.02] transition-transform">
                  <span className="text-xl">🔁</span>
                  <span className="block text-lg font-extrabold text-sakura mt-1">{tally.again}</span>
                  <span className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">To Revisit</span>
                </div>
              </div>
            </>
          ) : (
            <p className="mt-1.5 text-sm text-muted">
              You have no pending cards left to review right now.
            </p>
          )}

          <div className="mt-8 flex gap-4 w-full max-w-xs">
            <PopButton onClick={() => setPhase("setup")} size="md" className="flex-1">
              New session
            </PopButton>
            <Link
              href="/chat"
              className="inline-flex h-12 flex-1 items-center justify-center rounded-2xl border-2 border-border bg-card/40 backdrop-blur-sm px-6 text-sm font-bold text-muted transition-all hover:border-indigo-ai hover:text-indigo-ai"
            >
              Back to chat
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // ── SESSION ──────────────────────────────────────────────────────────────
  const card = activePool[0] as Card & { _dir?: "jp-to-en" | "en-to-jp" };
  // Guard against a transient empty queue between the last grade and the
  // phase flip to "done" — rendering the card below assumes one exists.
  if (!card) return null;
  const doneCount = total - (activePool.length + incomingQueue.length);
  const pct = total ? (doneCount / total) * 100 : 0;

  // Determine if this is vocabulary or kanji (for mixed mode)
  const cardType = card.type || setup.reviewType;
  const isVocab = cardType === "vocabulary";
  const isJpToEn = card._dir === "jp-to-en";

  // Front side content
  const frontContent = isJpToEn
    ? (isVocab ? card.word : card.character)
    : (isVocab ? card.meaning : card.meanings?.[0]);

  // Back side content (flipped)
  const backContent = isVocab ? {
    japanese: card.word,
    reading: card.reading,
    romaji: card.romaji,
    english: card.meaning,
    meta: card.partOfSpeech,
    mnemonic: undefined,
  } : {
    japanese: card.character,
    reading: [...(card.readingsOn || []), ...(card.readingsKun || [])].join(", "),
    romaji: "",
    english: card.meanings?.join(", "),
    meta: "Kanji",
    mnemonic: card.mnemonic,
  };

  return (
    <div className="flex flex-1 flex-col">
      {/* progress */}
      <div className="px-5 pt-4 sm:px-8">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => {
              if (tally.again + tally.good > 0) {
                setPhase("done");
              } else {
                setPhase("setup");
              }
            }}
            className="text-sm font-bold text-muted hover:text-indigo-ai"
            title="End session and see summary"
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
            {setup.isContinuous ? `${doneCount} reviewed` : `${doneCount}/${total}`}
          </span>
        </div>
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4">
        {/* Active memory pool indicators */}
        {setup.activeLimit !== "all" && (
          <div className="flex items-center justify-center gap-2">
            {activePool.map((c, idx) => {
              const isCurrent = idx === 0;
              const hasBeenAttempted = postedCardIds.has(c.id);
              return (
                <div
                  key={c.id}
                  className={`h-2.5 w-2.5 rounded-full transition-all duration-300 ${
                    isCurrent
                      ? "bg-indigo-ai ring-4 ring-indigo-ai/20 scale-125"
                      : hasBeenAttempted
                        ? "bg-sakura animate-pulse"
                        : "bg-border border border-muted/20"
                  }`}
                  title={isCurrent ? "Current card" : hasBeenAttempted ? "Needs review" : "Up next"}
                />
              );
            })}
          </div>
        )}

        {/* 3D Flip Card */}
        <div className="card-perspective w-full max-w-md min-h-[320px] sm:min-h-[360px]">
          <div
            onClick={() => setFlipped((f) => !f)}
            className={`card-inner cursor-pointer ${flipped ? "is-flipped" : ""}`}
          >
            {/* Front Side */}
            <div className="card-front hover:border-indigo-ai/30 transition-all select-none">
              {canSpeak() && isJpToEn && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    speakJa(backContent.japanese || "");
                  }}
                  className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-indigo-ai/10 text-indigo-ai hover:bg-indigo-ai/20 transition-colors"
                  title="Hear it"
                >
                  🔊
                </button>
              )}
              <span className={`font-bold ${isJpToEn ? "font-jp text-5xl" : "text-3xl"}`}>
                {isJpToEn && isVocab && card.word && card.reading ? (
                  <Furigana word={card.word} reading={card.reading} className="text-5xl" />
                ) : (
                  frontContent
                )}
              </span>
              {isVocab && formLabel(card.formType) && (
                <p className="mt-2 text-[10px] font-bold uppercase tracking-widest text-indigo-ai font-display">
                  {formLabel(card.formType)}
                </p>
              )}
              {!isVocab && card.radicals && card.radicals.length > 0 && (
                <div className="mt-4 w-full" onClick={(e) => e.stopPropagation()}>
                  <p className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">Radicals</p>
                  <div className="mt-2 flex flex-wrap justify-center gap-2">
                    {card.radicals.map((radical, i) => (
                      <button
                        key={i}
                        onClick={(e) => {
                          e.stopPropagation();
                          window.open(`/kanji?search=${encodeURIComponent(radical)}`, '_blank');
                        }}
                        className="rounded-full bg-indigo-ai/20 px-3 py-1 text-xs font-semibold text-indigo-ai transition-all hover:bg-indigo-ai/30 hover:scale-105"
                        title={`Search for ${radical}`}
                      >
                        {radical}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <p className="mt-5 text-xs text-muted/80">Tap or press Space to flip</p>

              {!isVocab && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (showHint && card.mnemonic) {
                      setShowHint(false);
                    } else {
                      handleShowHint();
                    }
                  }}
                  disabled={generatingMnemonic}
                  className="mt-3 rounded-full border-2 border-mint/30 bg-mint/5 px-4 py-2 text-xs font-bold text-mint transition-colors hover:bg-mint/10 disabled:opacity-50"
                >
                  {generatingMnemonic ? "✨ Generating..." : showHint ? "Hide hint" : "💡 Show hint"}
                </button>
              )}
              {showHint && !isVocab && card.mnemonic && (
                <div className="mt-3 w-full space-y-2" onClick={(e) => e.stopPropagation()}>
                  <div className="rounded-2xl border-2 border-mint/30 bg-mint/5 px-3 py-2 text-left">
                    <p className="text-[10px] font-bold uppercase tracking-wide text-mint font-display">
                      💡 Mnemonic
                    </p>
                    <p className="mt-1 text-xs text-foreground whitespace-pre-wrap leading-relaxed">{card.mnemonic}</p>
                  </div>
                  <button
                    onClick={() => {
                      handleGenerateMnemonic(
                        card.character!,
                        card.meanings!,
                        card.radicals || [],
                        true
                      );
                    }}
                    disabled={generatingMnemonic}
                    className="w-full rounded-full border-2 border-mint/30 bg-mint/10 px-3 py-1.5 text-xs font-bold text-mint transition-all hover:bg-mint/20 disabled:opacity-50"
                  >
                    {generatingMnemonic ? "⏳ Regenerating..." : "🔄 Regenerate"}
                  </button>
                </div>
              )}
            </div>

            {/* Back Side */}
            <div className="card-back overflow-y-auto">
              {isJpToEn ? (
                <>
                  {backContent.reading && (
                    <p className="font-jp text-2xl font-bold text-indigo-ai">{backContent.reading}</p>
                  )}
                  {backContent.romaji && (
                    <p className="text-xs text-muted mt-0.5">{backContent.romaji}</p>
                  )}
                  <p className="mt-2.5 text-xl font-bold text-foreground">{backContent.english}</p>
                  <p className="mt-0.5 text-[10px] font-bold uppercase tracking-wide text-muted font-display">
                    {backContent.meta}
                  </p>
                  {isVocab && formLabel(card.formType) && card.dictionary && (
                    <p className="mt-2 text-xs font-semibold text-indigo-ai">
                      {formLabel(card.formType)} · base: <span className="font-jp">{card.dictionary}</span>
                    </p>
                  )}
                  {isVocab && card.word && <KanjiBreakdown word={card.word} />}
                  {!isVocab && card.radicals && card.radicals.length > 0 && (
                    <div className="mt-3 rounded-2xl bg-surface/50 px-3 py-2 w-full" onClick={(e) => e.stopPropagation()}>
                      <p className="text-[10px] font-bold uppercase tracking-wide text-muted font-display">Radicals</p>
                      <div className="mt-1.5 flex flex-wrap justify-center gap-1.5">
                        {card.radicals.map((radical, i) => (
                          <button
                            key={i}
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(`/kanji/${encodeURIComponent(radical)}`, '_blank');
                            }}
                            className="rounded-full bg-indigo-ai/20 px-2.5 py-0.5 text-xs font-semibold text-indigo-ai transition-all hover:bg-indigo-ai/30 hover:scale-105"
                            title={`Open ${radical}`}
                          >
                            {radical}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                  {!isVocab && backContent.mnemonic && (
                    <div className="mt-3 rounded-2xl border-2 border-mint/30 bg-mint/5 px-3 py-2 text-left w-full">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-mint font-display">
                        💡 Mnemonic
                      </p>
                      <p className="mt-1 text-xs text-foreground leading-relaxed">{backContent.mnemonic}</p>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <p className="font-jp text-4xl font-bold text-indigo-ai">
                    {backContent.japanese}
                  </p>
                  {backContent.reading && (
                    <p className="mt-2 text-sm font-jp text-muted">{backContent.reading}</p>
                  )}
                  {isVocab && formLabel(card.formType) && card.dictionary && (
                    <p className="mt-2 text-xs font-semibold text-indigo-ai">
                      {formLabel(card.formType)} · base: <span className="font-jp">{card.dictionary}</span>
                    </p>
                  )}
                  {!isVocab && backContent.mnemonic && (
                    <div className="mt-3 rounded-2xl border-2 border-mint/30 bg-mint/5 px-3 py-2 text-left w-full">
                      <p className="text-[10px] font-bold uppercase tracking-wide text-mint font-display">
                        💡 Mnemonic
                      </p>
                      <p className="mt-1 text-xs text-foreground leading-relaxed">{backContent.mnemonic}</p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        {flipped ? (
          <div className="grid w-full max-w-md grid-cols-4 gap-2">
            {GRADES.map((g) => (
              <button
                key={g.grade}
                onClick={() => grade(g.grade)}
                className={`flex flex-col items-center rounded-2xl border-2 py-3 text-sm font-bold transition-all hover:-translate-y-0.5 hover:shadow-md active:scale-95 ${g.color}`}
              >
                {g.label}
                <span className="mt-0.5 text-[10px] opacity-70">{g.key}</span>
              </button>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted">
            {isJpToEn ? "What does this mean?" : "How do you say this in Japanese?"}
          </p>
        )}
      </div>
    </div>
  );
}
