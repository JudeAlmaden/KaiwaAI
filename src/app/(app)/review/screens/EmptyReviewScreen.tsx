"use client";

import Link from "next/link";
import Kai from "../../../Kai";
import PageHeader from "../../PageHeader";

export default function EmptyReviewScreen({
  reviewType,
  studyMode,
  onStudyAhead,
  onBack,
}: {
  reviewType: "vocabulary" | "kanji" | "mixed";
  studyMode: string;
  onStudyAhead: () => void;
  onBack: () => void;
}) {
  const isKanji = reviewType === "kanji";
  const isDue = studyMode === "due";
  const isStruggling = studyMode === "struggling" || studyMode === "leeches";

  const emptyTitle = isKanji
    ? "No Kanji to Study Yet"
    : isDue
      ? "All Caught Up! 🎉"
      : isStruggling
        ? "Gauntlet Cleared! 🔥"
        : "No Flashcards Found";

  const emptySubtitle = isKanji
    ? "No kanji in study list"
    : isDue
      ? "No cards due for review"
      : isStruggling
        ? "No difficult cards found"
        : "No cards match this criteria";

  const emptyDescription = isKanji
    ? "You haven't added any kanji to your study list yet. Create a lesson folder, import from your Heisig RTK notes, or browse your folders to start studying!"
    : isDue
      ? "You have reviewed all flashcards currently due. Great work! You can study ahead with all cards or chat with Kai to learn new words."
      : isStruggling
        ? "You don't have any cards currently marked as struggling or leeches. Keep reviewing to maintain your mastery!"
        : "No flashcards match this review criteria. Chat with Kai or save new vocabulary to build your review deck.";

  return (
    <div className="flex flex-1 flex-col relative overflow-hidden">
      <PageHeader title="Review" jp="復習" subtitle={emptySubtitle} />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center z-10 max-w-md mx-auto">
        {isKanji ? (
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber/15 border-2 border-amber/30 text-4xl font-bold font-jp text-amber shadow-lg shadow-amber/10 mb-5 animate-pulse">
            漢
          </div>
        ) : isStruggling ? (
          <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-sakura/15 border-2 border-sakura/30 text-3xl mb-5">
            🔥
          </div>
        ) : (
          <Kai size={80} className="mb-4" />
        )}

        <h2 className="font-display text-2xl font-extrabold text-foreground">
          {emptyTitle}
        </h2>

        <p className="mt-3 text-sm text-muted leading-relaxed">
          {emptyDescription}
        </p>

        <div className="mt-8 flex flex-col gap-3 w-full">
          {isKanji ? (
            <Link
              href="/kanji"
              className="w-full inline-flex h-12 items-center justify-center rounded-2xl bg-amber-500 border-b-4 border-amber-600 px-6 text-sm font-bold text-white shadow-sm hover:brightness-105 transition active:translate-y-[2px]"
            >
              ⛩️ Open Kanji Lessons
            </Link>
          ) : (
            <>
              {(isDue || isStruggling) && (
                <button
                  onClick={onStudyAhead}
                  className="w-full inline-flex h-12 items-center justify-center rounded-2xl bg-indigo-ai border-b-4 border-indigo-deep px-6 text-sm font-bold text-white shadow-sm hover:brightness-105 transition active:translate-y-[2px]"
                >
                  📖 Study Ahead (All Cards)
                </button>
              )}
              <Link
                href="/chat"
                className="w-full inline-flex h-12 items-center justify-center rounded-2xl border-2 border-border bg-card/60 backdrop-blur-sm px-6 text-sm font-bold text-foreground transition hover:border-indigo-ai hover:text-indigo-ai"
              >
                💬 Chat with Kai
              </Link>
            </>
          )}

          <button
            onClick={onBack}
            className="w-full inline-flex h-12 items-center justify-center rounded-2xl border border-border bg-card/40 px-6 text-sm font-bold text-muted transition hover:text-foreground"
          >
            ← Back to Quest Gallery
          </button>
        </div>
      </div>
    </div>
  );
}
