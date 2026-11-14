"use client";

import PageHeader from "../../PageHeader";

export default function ErrorReviewScreen({
  message,
  onRetry,
  onBack,
}: {
  message: string | null;
  onRetry: () => void;
  onBack: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col relative overflow-hidden">
      <PageHeader title="Review" jp="復習" subtitle="Connection issue" />

      <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 text-center z-10 max-w-md mx-auto">
        <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-rose-500/15 border-2 border-rose-500/30 text-3xl mb-5">
          ⚠️
        </div>

        <h2 className="font-display text-2xl font-extrabold text-foreground">
          Something Went Wrong
        </h2>

        <p className="mt-3 text-sm text-muted leading-relaxed">
          {message || "Unable to load review cards. Please check your network connection or try again."}
        </p>

        <div className="mt-8 flex flex-col gap-3 w-full">
          <button
            onClick={onRetry}
            className="w-full inline-flex h-12 items-center justify-center rounded-2xl bg-indigo-ai border-b-4 border-indigo-deep px-6 text-sm font-bold text-white shadow-sm hover:brightness-105 transition active:translate-y-[2px]"
          >
            🔄 Try Again
          </button>

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
