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
import { AppBlocker, type AppBlockerConfig } from "@/plugins/app-blocker";
import { FALLBACK_OFFLINE_CARDS, FALLBACK_OFFLINE_KANJI_CARDS } from "@/lib/fallback-cards";
import { getLearningConfig } from "@/lib/learning-config";
import { fetchProjectedMix } from "@/lib/review/session-ready";
import { mirrorBlockerDefaultsToLearning } from "@/lib/review/blocker-sync";
import type { FuriganaMode } from "@/lib/review/types";
import type { Card, CardDirection, ReviewType, Setup, StudyMode } from "./types";
import { useReviewQueue } from "./hooks/useReviewQueue";
import { ReviewSessionView } from "./components/ReviewSessionView";

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
    activeLimit: 5,
  });
  const [dueCount, setDueCount] = useState<number | null>(null);
  const [kanjiDueCount, setKanjiDueCount] = useState<number | null>(null);
  const [furiganaMode, setFuriganaMode] = useState<FuriganaMode>("always");

  const queue = useReviewQueue(setup, () => setPhase("done"));

  // App Blocker Completion Tracking (only successful cards count towards unlock)
  useAppBlockerCompletion(queue.passedCardIds.size, queue.total > 0 ? queue.total : setup.limit);

  const [isMonitoring, setIsMonitoring] = useState(false);
  const [appBlockerConfig, setAppBlockerConfig] = useState<AppBlockerConfig>({
    count: 10,
    blockChance: 100,
    unlockDurationMinutes: 45,
    reviewType: "vocabulary",
    direction: "mixed",
    studyMode: "all",
    practice: false,
    noDueAction: "autoOpen",
    learningRatio: 0.5,
  });

  useEffect(() => {
    AppBlocker.isMonitoring().then((r) => setIsMonitoring(r.active)).catch(() => {});
    AppBlocker.getAppBlockerConfig().then((cfg) => setAppBlockerConfig(cfg)).catch(() => {});
  }, []);

  const handleUpdateAppBlockerConfig = async (update: Partial<AppBlockerConfig>) => {
    const next = { ...appBlockerConfig, ...update };
    setAppBlockerConfig(next);
    // The Learning tab owns the same defaults; keep them in step.
    mirrorBlockerDefaultsToLearning(update);
    try {
      await AppBlocker.setAppBlockerConfig(next);
    } catch (e) {
      console.error(e);
    }
  };

  const refreshDueCount = useCallback(() => {
    // Each quest card counts what its own session will hand over, and the nav
    // badge and home pill are exactly the sum of the two.
    fetchProjectedMix()
      .then((mix) => {
        setDueCount(mix?.dailyDue ?? 0);
        setKanjiDueCount(mix?.kanjiDue ?? 0);
      })
      .catch(() => {
        setDueCount(0);
        setKanjiDueCount(0);
      });
  }, []);

  useEffect(() => {
    refreshDueCount();
  }, [refreshDueCount]);

  const start = useCallback(
    async (custom?: Partial<Setup>) => {
      const s = { ...setup, ...custom };
      setSetup(s);

      const endpoint =
        s.reviewType === "mixed"
          ? "/api/review/mixed"
          : `/api/${s.reviewType === "kanji" ? "kanji" : "flashcards"}/review`;

      const resolvedStudyMode =
        s.studyMode === "new" || s.studyMode === "custom" ? "all" : s.studyMode;
      const learningCfg = getLearningConfig();
      const learningRatio = s.learningRatio ?? learningCfg.defaultLearningRatio ?? 0.5;
      const params = new URLSearchParams({
        studyMode: resolvedStudyMode,
        limit: String(s.limit),
        learningRatio: String(learningRatio),
        maxLearningPool: String(learningCfg.maxLearningPool),
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
        const fallbackSource =
          s.reviewType === "kanji" ? FALLBACK_OFFLINE_KANJI_CARDS : FALLBACK_OFFLINE_CARDS;
        cards = fallbackSource.slice(0, Math.min(s.limit, fallbackSource.length));
      }

      if (isNetworkError && cards.length === 0) {
        setErrorMessage(
          "Unable to load review cards. Please check your network connection or try again."
        );
        setPhase("error");
        return;
      }

      if (cards.length === 0) {
        setPhase("empty");
        return;
      }

      setFuriganaMode(getLearningConfig().defaultFuriganaMode);
      queue.initSession(cards, s);
      setPhase("session");
    },
    [setup, queue]
  );

  // Auto-start review session directly if configured or triggered by App Blocker / direct study
  useEffect(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const isAutostart =
        params.get("autostart") === "true" || params.get("mode") === "app-blocker";
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
            const reqCount = countParam ? parseInt(countParam, 10) || 10 : cfg?.count || 10;
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

  // ── SETUP ──────────────────────────────────────────────────────────────
  if (phase === "setup") {
    const isAppBlocker =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("mode") === "app-blocker";
    const isAutostart =
      typeof window !== "undefined" &&
      (new URLSearchParams(window.location.search).get("autostart") === "true" || isAppBlocker);

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
          kanjiDueCount={kanjiDueCount}
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
        again={queue.tally.again}
        good={queue.tally.good}
        onNewSession={() => {
          refreshDueCount();
          setPhase("setup");
        }}
      />
    );
  }

  // ── SESSION ──────────────────────────────────────────────────────────────
  return (
    <ReviewSessionView
      setup={setup}
      activePool={queue.activePool}
      incomingQueue={queue.incomingQueue}
      postedCardIds={queue.postedCardIds}
      failedCardIds={queue.failedCardIds}
      total={queue.total}
      sessionComposition={queue.sessionComposition}
      tally={queue.tally}
      flipped={queue.flipped}
      setFlipped={queue.setFlipped}
      cardEpoch={queue.cardEpoch}
      showHint={queue.showHint}
      setShowHint={queue.setShowHint}
      generatingMnemonic={queue.generatingMnemonic}
      furiganaMode={furiganaMode}
      onGrade={queue.grade}
      onClose={() => {
        if (queue.tally.again + queue.tally.good > 0) {
          setPhase("done");
        } else {
          refreshDueCount();
          setPhase("setup");
        }
      }}
      onShowHint={queue.handleShowHint}
      onGenerateMnemonic={queue.handleGenerateMnemonic}
    />
  );
}
