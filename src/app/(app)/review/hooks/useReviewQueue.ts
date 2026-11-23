"use client";

import { useCallback, useState } from "react";
import type { ActiveCard, Card, Setup } from "../types";
import { getLearningConfig } from "@/lib/learning-config";
import type { ComponentContext } from "@/lib/kanji-mnemonic/types";
import { saveKanjiMnemonicClient } from "@/lib/kanji-mnemonic/save-client";
import {
  summarizeComposition,
  type CompositionCounts,
} from "@/lib/review/composition";

export function useReviewQueue(setup: Setup, onDone: () => void) {
  const [activePool, setActivePool] = useState<ActiveCard[]>([]);
  const [incomingQueue, setIncomingQueue] = useState<ActiveCard[]>([]);
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

  const initSession = useCallback((cards: Card[], sessionSetup: Setup) => {
    // Shuffle for mixed direction
    const shuffled: ActiveCard[] = sessionSetup.direction === "mixed"
      ? cards.map((c) => ({
          ...c,
          _dir: Math.random() < 0.5 ? "jp-to-en" : ("en-to-jp" as const),
        }))
      : cards.map((c) => ({
          ...c,
          _dir: sessionSetup.direction as "jp-to-en" | "en-to-jp",
        }));

    const activeLimitNum =
      sessionSetup.activeLimit === "all" ? shuffled.length : sessionSetup.activeLimit;
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
  }, []);

  const handleGenerateMnemonic = useCallback(
    async (
      kanji: {
        character: string;
        meanings: string[];
        primitives?: string[];
        components?: ComponentContext[];
        heisigKeyword?: string | null;
        heisigNumber?: number | null;
      },
      isRegenerate: boolean
    ) => {
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
          character: kanji.character,
          meanings: kanji.meanings,
          primitives: kanji.primitives,
          components: kanji.components,
          heisigKeyword: kanji.heisigKeyword,
          heisigNumber: kanji.heisigNumber,
        });

        await saveKanjiMnemonicClient(kanji.character, mnemonic);

        // Update the current card in activePool
        setActivePool((prev) => {
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
    },
    []
  );

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
      {
        character: card.character!,
        meanings: card.meanings ?? [],
        primitives: card.primitives,
        components: card.components,
        heisigKeyword: card.heisigKeyword,
        heisigNumber: card.heisigNumber,
      },
      false
    );
    setShowHint(true);
  }, [activePool, setup.reviewType, handleGenerateMnemonic]);

  const fetchMoreCards = useCallback(async (): Promise<ActiveCard[]> => {
    const endpoint =
      setup.reviewType === "mixed"
        ? "/api/review/mixed"
        : `/api/${setup.reviewType === "kanji" ? "kanji" : "flashcards"}/review`;

    const resolvedStudyMode =
      setup.studyMode === "new" || setup.studyMode === "custom" ? "all" : setup.studyMode;
    const learningCfg = getLearningConfig();
    const learningRatio = setup.learningRatio ?? learningCfg.defaultLearningRatio ?? 0.5;
    const params = new URLSearchParams({
      studyMode: resolvedStudyMode,
      limit: "100",
      learningRatio: String(learningRatio),
      maxLearningPool: String(learningCfg.maxLearningPool),
      maxNewCards: String(learningCfg.maxNewCards),
      newPerSession: String(learningCfg.newPerSession),
      maxDailyReviews: String(learningCfg.maxDailyReviews),
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

      const shuffled: ActiveCard[] =
        setup.direction === "mixed"
          ? filtered.map((c) => ({
              ...c,
              _dir: Math.random() < 0.5 ? "jp-to-en" : ("en-to-jp" as const),
            }))
          : filtered.map((c) => ({
              ...c,
              _dir: setup.direction as "jp-to-en" | "en-to-jp",
            }));

      return shuffled;
    } catch {
      return [];
    }
  }, [setup, activePool, postedCardIds]);

  const grade = useCallback(
    async (g: number) => {
      const card = activePool[0];
      if (!card) return;

      const isFirstAttempt = !postedCardIds.has(card.id);

      // Only update SRS if not in practice mode and it's first attempt
      if (!setup.practice && isFirstAttempt) {
        const cardType = card.type || setup.reviewType;
        const endpoint =
          cardType === "kanji" ? "/api/kanji/review" : "/api/flashcards/review";

        fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
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
                onDone();
              }
            }
          });
        } else {
          setActivePool(nextActive);
          setIncomingQueue([]);
          if (nextActive.length === 0) {
            onDone();
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
    [activePool, incomingQueue, postedCardIds, passedCardIds, setup, fetchMoreCards, onDone]
  );

  const currentCard = activePool[0];
  const isCardFailed = currentCard ? failedCardIds.has(currentCard.id) : false;

  return {
    activePool,
    incomingQueue,
    postedCardIds,
    failedCardIds,
    passedCardIds,
    total,
    sessionComposition,
    flipped,
    setFlipped,
    cardEpoch,
    tally,
    showHint,
    setShowHint,
    generatingMnemonic,
    currentCard,
    isCardFailed,
    initSession,
    handleGenerateMnemonic,
    handleShowHint,
    grade,
  };
}
