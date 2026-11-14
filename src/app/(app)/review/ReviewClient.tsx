"use client";

import { useCallback, useEffect, useState } from "react";
import Kai from "../../Kai";
import PageHeader from "../PageHeader";
import QuestGallery from "./QuestGallery";
import EmptyReviewScreen from "./screens/EmptyReviewScreen";
import ErrorReviewScreen from "./screens/ErrorReviewScreen";
import DoneReviewScreen from "./screens/DoneReviewScreen";
import { useAppBlockerCompletion } from "@/hooks/useAppBlockerCompletion";
import OfflineBanner from "@/components/OfflineBanner";
import { AppBlocker } from "@/plugins/app-blocker";
import ReviewCard, { Card } from "./ReviewCard";
import { FALLBACK_OFFLINE_CARDS, FALLBACK_OFFLINE_KANJI_CARDS } from "@/lib/fallback-cards";
import { getLearningConfig } from "@/lib/learning-config";
import { resolveShowFurigana } from "@/lib/review/furigana";
import type { FuriganaMode } from "@/lib/review/types";
import {
  formatComposition,
  summarizeComposition,
  type CompositionCounts,
} from "@/lib/review/composition";

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
  heisigLesson?: number;
  groupId?: string;
  groupName?: string;
  learningRatio?: number;
};

export default function ReviewClient() {
  const [phase, setPhase] = useState<"setup" | "session" | "done" | "empty" | "error">("setup");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
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
  const [failedCardIds, setFailedCardIds] = useState<Set<string>>(new Set());
  const [passedCardIds, setPassedCardIds] = useState<Set<string>>(new Set());
  const [total, setTotal] = useState(0);
  const [sessionComposition, setSessionComposition] = useState<CompositionCounts | null>(null);
  const [flipped, setFlipped] = useState(false);
  const [cardEpoch, setCardEpoch] = useState(0);
  const [tally, setTally] = useState({ again: 0, good: 0 });
  const [showHint, setShowHint] = useState(false);
  const [generatingMnemonic, setGeneratingMnemonic] = useState(false);
  // Furigana preference (Learning settings) — snapshotted at session start
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>("always");

  // App Blocker Completion Tracking (only successful cards count towards unlock)
  // Use total cards in session (active + incoming) as the target, falling back to setup.limit.
  // This is snapshotted at session start via total state, which is set in start().
  const completedCount = passedCardIds.size;
  useAppBlockerCompletion(completedCount, total > 0 ? total : setup.limit);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [appBlockerConfig, setAppBlockerConfig] = useState<import('@/plugins/app-blocker').AppBlockerConfig>({
    count: 10,
    blockChance: 100,
    unlockDurationMinutes: 45,
    reviewType: 'vocabulary',
    direction: 'mixed',
    studyMode: 'all',
    practice: false,
    noDueAction: 'autoOpen',
    learningRatio: 0.5,
  });

  useEffect(() => {
    AppBlocker.isMonitoring().then((r) => setIsMonitoring(r.active)).catch(() => {});
    AppBlocker.getAppBlockerConfig().then((cfg) => setAppBlockerConfig(cfg)).catch(() => {});
  }, []);



  const handleUpdateAppBlockerConfig = async (update: Partial<import('@/plugins/app-blocker').AppBlockerConfig>) => {
    const next = { ...appBlockerConfig, ...update };
    setAppBlockerConfig(next);
    try {
      await AppBlocker.setAppBlockerConfig(next);
    } catch (e) {
      console.error(e);
    }
  };


  // Auto-start review session directly if already configured, triggered by App Blocker, or from Kanji Lesson study
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const isAutostart = params.get("autostart") === "true" || params.get("mode") === "app-blocker";
      const isConfigured = localStorage.getItem("kaiwa_review_setup_configured") === "true";
      const countParam = params.get("count");
      const typeParam = params.get("type");
      const heisigLessonParam = params.get("heisigLesson");
      const groupIdParam = params.get("groupId");
      const groupNameParam = params.get("groupName");

      // Direct Lesson or Group Kanji Study
      if (typeParam === "kanji" || heisigLessonParam || groupIdParam) {
        const customSetup: Partial<Setup> = {
          reviewType: "kanji",
          studyMode: "all",
          heisigLesson: heisigLessonParam ? parseInt(heisigLessonParam) : undefined,
          groupId: groupIdParam || undefined,
          groupName: groupNameParam || undefined,
          limit: countParam ? parseInt(countParam) : 50,
        };
        // eslint-disable-next-line react-hooks/set-state-in-effect
        setSetup((prev) => ({ ...prev, ...customSetup }));
        // Auto-start if coming with autostart=true or direct lesson link
        if (isAutostart || heisigLessonParam || groupIdParam) {
          start(customSetup);
        }
        return;
      }

      if ((isAutostart || isConfigured) && phase === "setup") {
        const urlStudyMode = params.get("studyMode") as StudyMode | null;
        const urlReviewType = params.get("reviewType") as ReviewType | null;
        const urlDirection = params.get("direction") as CardDirection | null;
        const urlLearningRatio = params.get("learningRatio");

        AppBlocker.getAppBlockerConfig()
          .then((cfg) => {
            const reqCount = countParam ? parseInt(countParam, 10) || 10 : (cfg?.count || 10);
            const resolvedMode = urlStudyMode ?? (cfg?.studyMode as StudyMode) ?? "all";
            const resolvedType = urlReviewType ?? (cfg?.reviewType as ReviewType) ?? "vocabulary";
            const resolvedDir = urlDirection ?? (cfg?.direction as CardDirection) ?? "jp-to-en";
            const resolvedRatio =
              urlLearningRatio !== null && !isNaN(parseFloat(urlLearningRatio))
                ? parseFloat(urlLearningRatio)
                : (cfg?.learningRatio ?? getLearningConfig().defaultLearningRatio ?? 0.5);

            const sessionParams: Partial<Setup> = {
              studyMode: resolvedMode,
              reviewType: resolvedType,
              direction: resolvedDir,
              practice: cfg?.practice ?? false,
              limit: reqCount,
              learningRatio: resolvedRatio,
            };
            setSetup((prev) => ({ ...prev, ...sessionParams }));
            start(sessionParams);
          })
          .catch(() => {
            const reqCount = countParam ? parseInt(countParam, 10) || 10 : 10;
            const sessionParams: Partial<Setup> = {
              studyMode: urlStudyMode ?? "all",
              limit: reqCount,
            };
            setSetup((prev) => ({ ...prev, ...sessionParams }));
            start(sessionParams);
          });
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

  const refreshDueCount = useCallback(() => {
    fetch("/api/review/mixed?studyMode=due&limit=200")
      .then((r) => r.json())
      .then((d) => setDueCount(d.cards?.length ?? 0))
      .catch(() => setDueCount(0));
  }, []);

  useEffect(() => {
    refreshDueCount();
  }, [refreshDueCount]);

  const fetchMoreCards = useCallback(async () => {
    const endpoint = setup.reviewType === "mixed" 
      ? "/api/review/mixed"
      : `/api/${setup.reviewType === "kanji" ? "kanji" : "flashcards"}/review`;
      
    const resolvedStudyMode = setup.studyMode === "new" || setup.studyMode === "custom" ? "all" : setup.studyMode;
    const learningCfg = getLearningConfig();
    const learningRatio = setup.learningRatio ?? learningCfg.defaultLearningRatio ?? 0.5;
    const params = new URLSearchParams({ 
      studyMode: resolvedStudyMode, 
      limit: "100",
      learningRatio: String(learningRatio),
      maxLearningPool: String(learningCfg.maxLearningPool),
      maxNewCards: String(learningCfg.maxNewCards),
      newPerSession: String(learningCfg.newPerSession),
    });
    if (setup.studyMode === "new") params.set("status", "new");
    if (setup.practice) params.set("practice", "true");
    if (setup.heisigLesson) params.set("heisigLesson", String(setup.heisigLesson));
    if (setup.groupId) params.set("groupId", setup.groupId);
    
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

    // Persist the resolved session config into state so that downstream
    // consumers (fetchMoreCards, grade, useAppBlockerCompletion) all operate
    // on the actual session parameters rather than the stale initial defaults.
    setSetup(s);
    
    // For mixed mode, use the dedicated mixed endpoint
    const endpoint = s.reviewType === "mixed" 
      ? "/api/review/mixed"
      : `/api/${s.reviewType === "kanji" ? "kanji" : "flashcards"}/review`;
      
    const resolvedStudyMode = s.studyMode === "new" || s.studyMode === "custom" ? "all" : s.studyMode;
    const learningCfg = getLearningConfig();
    const learningRatio = s.learningRatio ?? learningCfg.defaultLearningRatio ?? 0.5;
    const params = new URLSearchParams({ 
      studyMode: resolvedStudyMode, 
      limit: String(s.limit),
      learningRatio: String(learningRatio),
      maxLearningPool: String(learningCfg.maxLearningPool),
      maxNewCards: String(learningCfg.maxNewCards),
      newPerSession: String(learningCfg.newPerSession),
    });
    if (s.studyMode === "new") params.set("status", "new");
    if (s.practice) params.set("practice", "true");
    if (s.heisigLesson) params.set("heisigLesson", String(s.heisigLesson));
    if (s.groupId) params.set("groupId", s.groupId);
    
    let cards: Card[] = [];
    let isNetworkError = false;
    try {
      const res = await fetch(`${endpoint}?${params}`);
      if (res.ok) {
        const d = await res.json();
        cards = d.cards ?? [];
      } else {
        isNetworkError = true;
      }
    } catch {
      isNetworkError = true;
      cards = [];
    }

    // Fallback to offline cards ONLY if network error occurred and user is offline
    if (isNetworkError && typeof navigator !== "undefined" && !navigator.onLine) {
      const fallbackSource = s.reviewType === "kanji" ? FALLBACK_OFFLINE_KANJI_CARDS : FALLBACK_OFFLINE_CARDS;
      cards = fallbackSource.slice(0, Math.min(s.limit, fallbackSource.length));
    }

    if (isNetworkError && cards.length === 0) {
      setErrorMessage("Unable to load review cards. Please check your network connection or try again.");
      setPhase("error");
      return;
    }

    // If deck is legitimately empty, show clear empty state instead of fake cards or blank screen
    if (cards.length === 0) {
      setPhase("empty");
      return;
    }

    // Snapshot furigana preference (Learning settings) for this session
    setFuriganaMode(getLearningConfig().defaultFuriganaMode);
    
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
    setFailedCardIds(new Set());
    setPassedCardIds(new Set());
    setTotal(shuffled.length);
    setSessionComposition(summarizeComposition(shuffled));
    setTally({ again: 0, good: 0 });
    setFlipped(false);
    setCardEpoch((e) => e + 1);
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
          // Send the user's configured early-review strategy: without it the
          // scheduler treats every early review (e.g. in-session relearn after
          // "Again", or study-ahead) as on-time and grants full stability
          // growth — same class of bug as the retrievability doom loop.
          body: JSON.stringify({
            cardId: card.id,
            grade: g,
            earlyReviewStrategy: getLearningConfig().earlyReviewStrategy,
            desiredRetention: getLearningConfig().desiredRetention,
          }),
        }).catch(() => {});
      }

      if (g === 0) {
        // Track card as failed in this session so Good & Easy become disabled
        setFailedCardIds((prev) => new Set(prev).add(card.id));
      }

      if (isFirstAttempt) {
        if (g === 0) {
          setTally((t) => ({ ...t, again: t.again + 1 }));
        }
        setPostedCardIds((prev) => {
          const next = new Set(prev);
          next.add(card.id);
          return next;
        });
      }

      if (g > 0) {
        const isFirstSuccess = !passedCardIds.has(card.id);
        if (isFirstSuccess) {
          setPassedCardIds((prev) => new Set(prev).add(card.id));
          setTally((t) => ({ ...t, good: t.good + 1 }));
        }
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
      setCardEpoch((e) => e + 1);
      setShowHint(false); // Reset hint when moving to next card
    },
    [activePool, incomingQueue, postedCardIds, passedCardIds, setup, fetchMoreCards]
  );

  const currentCard = activePool[0];
  const isCardFailed = currentCard ? failedCardIds.has(currentCard.id) : false;

  // keyboard shortcuts during a session
  useEffect(() => {
    if (phase !== "session") return;
    function onKey(e: KeyboardEvent) {
      if (e.key === " ") {
        e.preventDefault();
        setFlipped((f) => !f);
      } else if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        const selectedGrade = Number(e.key) - 1;
        if (isCardFailed && (selectedGrade === 2 || selectedGrade === 3)) {
          return;
        }
        grade(selectedGrade);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, flipped, grade, isCardFailed]);

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
          onUpdateAppBlockerConfig={handleUpdateAppBlockerConfig}
        />
      </div>
    );
  }

  // ── EMPTY ──────────────────────────────────────────────────────────────
  if (phase === "empty") {
    return (
      <EmptyReviewScreen
        reviewType={setup.reviewType}
        studyMode={setup.studyMode}
        onStudyAhead={() => start({ ...setup, studyMode: "all" })}
        onBack={() => {
          refreshDueCount();
          setPhase("setup");
        }}
      />
    );
  }

  // ── ERROR ──────────────────────────────────────────────────────────────
  if (phase === "error") {
    return (
      <ErrorReviewScreen
        message={errorMessage}
        onRetry={() => start()}
        onBack={() => {
          refreshDueCount();
          setPhase("setup");
        }}
      />
    );
  }

  // ── DONE ────────────────────────────────────────────────────────────────
  if (phase === "done") {
    return (
      <DoneReviewScreen
        again={tally.again}
        good={tally.good}
        onNewSession={() => {
          refreshDueCount();
          setPhase("setup");
        }}
      />
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
    <div className="flex flex-1 flex-col" data-hide-bottom-nav="true">
      <OfflineBanner isAppBlockerMode={isAppBlockerSession} />
      {/* progress */}
      <div className="px-5 pt-4 sm:px-8">
        <div className="mx-auto flex max-w-md items-center gap-3">
          <button
            onClick={() => {
              if (tally.again + tally.good > 0) {
                setPhase("done");
              } else {
                refreshDueCount();
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
        {sessionComposition && (sessionComposition.newCount > 0 || sessionComposition.reviewCount > 0) && (
          <p className="mx-auto mt-1.5 max-w-md text-center text-[10px] font-bold uppercase tracking-wide text-muted">
            {formatComposition(sessionComposition)}
          </p>
        )}
      </div>

      <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 py-4 pb-8">
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
          key={`${card.id}-${cardEpoch}`}
          card={card}
          reviewType={setup.reviewType}
          flipped={flipped}
          disabledGrades={isCardFailed ? [2, 3] : undefined}
          showFurigana={resolveShowFurigana(furiganaMode, card)}
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
