"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import Kai from "../../Kai";
import PageHeader from "../PageHeader";
import { PopButton } from "../../PopButton";
import { scheduleReviewNotifications } from "@/lib/review-notifications";
import Petals from "../../Petals";
import QuestGallery from "./QuestGallery";
import { useAppBlockerCompletion } from "@/hooks/useAppBlockerCompletion";
import OfflineBanner from "@/components/OfflineBanner";
import { AppBlocker } from "@/plugins/app-blocker";
import ReviewCard, { Card } from "./ReviewCard";

const FALLBACK_OFFLINE_CARDS: Card[] = [
  { id: "off-1", status: "learning", word: "こんにちは", reading: "konnichiwa", romaji: "konnichiwa", meaning: "Hello / Good afternoon" },
  { id: "off-2", status: "learning", word: "ありがとう", reading: "arigatou", romaji: "arigatou", meaning: "Thank you" },
  { id: "off-3", status: "learning", word: "水", reading: "みず", romaji: "mizu", meaning: "Water" },
  { id: "off-4", status: "learning", word: "食べる", reading: "たべる", romaji: "taberu", meaning: "To eat" },
  { id: "off-5", status: "learning", word: "飲む", reading: "のむ", romaji: "nomu", meaning: "To drink" },
  { id: "off-6", status: "learning", word: "日本", reading: "にほん", romaji: "nihon", meaning: "Japan" },
  { id: "off-7", status: "learning", word: "友達", reading: "ともだち", romaji: "tomodachi", meaning: "Friend" },
  { id: "off-8", status: "learning", word: "勉強", reading: "べんきょう", romaji: "benkyou", meaning: "Study" },
  { id: "off-9", status: "learning", word: "学生", reading: "がくせい", romaji: "gakusei", meaning: "Student" },
  { id: "off-10", status: "learning", word: "先生", reading: "せんせい", romaji: "sensei", meaning: "Teacher" },
  { id: "off-11", status: "learning", word: "本", reading: "ほん", romaji: "hon", meaning: "Book" },
  { id: "off-12", status: "learning", word: "学校", reading: "がっこう", romaji: "gakkou", meaning: "School" },
  { id: "off-13", status: "learning", word: "猫", reading: "ねこ", romaji: "neko", meaning: "Cat" },
  { id: "off-14", status: "learning", word: "犬", reading: "いぬ", romaji: "inu", meaning: "Dog" },
  { id: "off-15", status: "learning", word: "大きい", reading: "おおきい", romaji: "ookii", meaning: "Big / Large" },
];



type StudyMode = 
  | "due"           // Cards with nextReview in the past
  | "all"           // Study ahead (any cards)
  | "recent"        // Recently added (last 7 days)
  | "struggling"    // Low ease factor (<2.0) or many reviews
  | "leeches"       // Cards reviewed 8+ times with interval <7 days
  | "new"
  | "custom";

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
  customCardIds?: string[];
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

  const [activePool, setActivePool] = useState<Card[]>([]);
  const [incomingQueue, setIncomingQueue] = useState<Card[]>([]);
  const [postedCardIds, setPostedCardIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [tally, setTally] = useState({ again: 0, good: 0 });
  const [showHint, setShowHint] = useState(false);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);

  // App Blocker Completion Tracking
  const completedCount = tally.good + tally.again;
  useAppBlockerCompletion(completedCount, setup.limit);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [appBlockerConfig, setAppBlockerConfig] = useState<import('@/plugins/app-blocker').AppBlockerConfig>({
    count: 10,
    blockChance: 100,
    unlockDurationMinutes: 15,
    reviewType: 'vocabulary',
    direction: 'jp-to-en',
  });

  useEffect(() => {
    AppBlocker.isMonitoring().then((r) => setIsMonitoring(r.active)).catch(() => {});
    AppBlocker.getAppBlockerConfig().then((cfg) => setAppBlockerConfig(cfg)).catch(() => {});
  }, []);

  const handleToggleMonitoring = async () => {
    try {
      if (isMonitoring) {
        await AppBlocker.stopMonitoring();
        setIsMonitoring(false);
      } else {
        await AppBlocker.setAppBlockerConfig(appBlockerConfig);
        await AppBlocker.startMonitoring();
        setIsMonitoring(true);
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateAppBlockerConfig = async (update: Partial<import('@/plugins/app-blocker').AppBlockerConfig>) => {
    const next = { ...appBlockerConfig, ...update };
    setAppBlockerConfig(next);
    try {
      await AppBlocker.setAppBlockerConfig(next);
    } catch (e) {
      console.error(e);
    }
  };


  // Auto-start review session directly if already configured or triggered by App Blocker
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const isAutostart = params.get("autostart") === "true" || params.get("mode") === "app-blocker";
      const isConfigured = localStorage.getItem("kaiwa_review_setup_configured") === "true";
      const countParam = params.get("count");
      
      if ((isAutostart || isConfigured) && phase === "setup") {
        if (countParam) {
          const reqCount = parseInt(countParam) || 10;
          // eslint-disable-next-line react-hooks/set-state-in-effect
          setSetup(prev => ({ ...prev, limit: reqCount }));
          start({ studyMode: "all", limit: reqCount });
        } else {
          AppBlocker.getFlashcardRequirement()
            .then(res => {
              const reqCount = res.count || 10;
              setSetup(prev => ({ ...prev, limit: reqCount }));
              start({ studyMode: "all", limit: reqCount });
            })
            .catch(() => {
              start({ studyMode: "all", limit: 10 });
            });
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    
    let cards: Card[] = [];
    try {
      const res = await fetch(`${endpoint}?${params}`);
      if (res.ok) {
        const d = await res.json();
        cards = d.cards ?? [];
      }
    } catch {
      cards = [];
    }

    // Fallback to offline cards if network request returned no cards or failed
    if (cards.length === 0) {
      cards = FALLBACK_OFFLINE_CARDS.slice(0, Math.min(s.limit, FALLBACK_OFFLINE_CARDS.length));
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
    const isAppBlocker = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "app-blocker";
    const isAutostart = typeof window !== "undefined" && (new URLSearchParams(window.location.search).get("autostart") === "true" || isAppBlocker);

    if (isAutostart) {
      return (
        <div className="flex flex-1 flex-col items-center justify-center p-6 bg-background text-center min-h-[60vh]">
          <Kai size={64} className="animate-bounce" />
          <p className="mt-4 text-sm font-bold text-muted font-display animate-pulse">
            Starting your Focus Guard review session...
          </p>
        </div>
      );
    }

    return (
      <div className="flex flex-1 flex-col pb-32 px-4 sm:px-8">
        <OfflineBanner isAppBlockerMode={isAppBlocker} />
        <PageHeader title="Review" jp="復習" subtitle="Choose a quest to begin your session." />
        <QuestGallery
          dueCount={dueCount || 0}
          isMonitoring={isMonitoring}
          isAndroid={true}
          appBlockerConfig={appBlockerConfig}
          onStartQuest={start}
          onToggleMonitoring={handleToggleMonitoring}
          onUpdateAppBlockerConfig={handleUpdateAppBlockerConfig}
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

          <div className="mt-8 flex flex-col sm:flex-row gap-3 w-full max-w-xs">
            {typeof window !== "undefined" && new URLSearchParams(window.location.search).get("blocked_package") && (
              <button
                onClick={() => {
                  const pkg = new URLSearchParams(window.location.search).get("blocked_package");
                  if (pkg) AppBlocker.launchApp({ packageName: pkg }).catch(() => {});
                }}
                className="w-full h-12 rounded-2xl bg-emerald-500 border-b-4 border-emerald-600 text-white font-bold text-sm shadow-sm hover:brightness-105 transition active:translate-y-[2px] flex items-center justify-center gap-2"
              >
                🚀 Launch App
              </button>
            )}
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
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const frontContent = isJpToEn
    ? (isVocab ? card.word : card.character)
    : (isVocab ? card.meaning : card.meanings?.[0]);

  // Back side content (flipped)
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
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

  const isAppBlockerSession = typeof window !== "undefined" && new URLSearchParams(window.location.search).get("mode") === "app-blocker";

  return (
    <div className="flex flex-1 flex-col">
      <OfflineBanner isAppBlockerMode={isAppBlockerSession} />
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

        {/* Modular Review Card (with 3D flip, audio, kanji breakdown, mnemonics, & 3D icon grade buttons) */}
        <ReviewCard
          card={card}
          reviewType={setup.reviewType}
          flipped={flipped}
          onFlip={() => setFlipped((f) => !f)}
          onGrade={(g) => grade(g)}
          showHint={showHint}
          generatingMnemonic={generatingMnemonic}
          onToggleHint={() => {
            if (showHint && card.mnemonic) {
              setShowHint(false);
            } else {
              handleShowHint();
            }
          }}
          onGenerateMnemonic={(isRegen) => {
            handleGenerateMnemonic(
              card.character!,
              card.meanings!,
              card.radicals || [],
              isRegen
            );
          }}
        />
      </div>
    </div>
  );
}
