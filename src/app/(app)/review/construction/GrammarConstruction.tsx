"use client";

import { CONCEPT_BY_ID, MODULES } from "@/lib/grammar/curriculum";
import { useHintShortcut } from "../hooks/useHintShortcut";
import { useSavedWords } from "../hooks/useSavedWords";
import { ExerciseCard } from "./ExerciseCard";
import { FeedbackPanel } from "./FeedbackPanel";
import { StreamHeader } from "./StreamHeader";
import { TopicBrowser } from "./TopicBrowser";
import { useGrammarStream } from "./useGrammarStream";

/**
 * Grammar Construction is an endless stream: one exercise at a time, chosen
 * from current mastery. There is no round, no queue and no unlock order.
 */
export default function GrammarConstruction() {
  const stream = useGrammarStream();
  const { savedWords, markSaved } = useSavedWords();
  useHintShortcut(stream.toggleHint, stream.result === null && stream.exercise !== null);
  const concept = stream.exercise ? CONCEPT_BY_ID.get(stream.exercise.concept) ?? null : null;
  const moduleInfo = concept
    ? MODULES.find((item) => item.id === concept.moduleId) ?? null
    : null;
  const focusTitle = stream.focus ? CONCEPT_BY_ID.get(stream.focus)?.title ?? stream.focus : null;
  const familiar = Boolean(
    stream.exercise?.words?.some((word) => stream.knownWords.has(word))
  );

  return (
    <div className="space-y-4">
      {!stream.loading && !stream.exercise && (
        <div className="space-y-3 rounded-3xl border-2 border-dashed border-border p-8 text-center">
          <p className="text-sm font-bold text-foreground">No exercises available.</p>
          <p className="text-xs text-muted">
            {stream.focus
              ? "This topic has no exercises yet — switch back to the adaptive stream."
              : "Reload the page to try the bank again."}
          </p>
          <button
            onClick={stream.next}
            className="inline-block rounded-2xl bg-sky px-4 py-2 text-sm font-bold text-white"
          >
            Try again
          </button>
        </div>
      )}

      {stream.exercise && concept && moduleInfo && (
        <>
          <StreamHeader
            concept={concept}
            moduleTitle={moduleInfo.title}
            moduleJp={moduleInfo.jp}
            sitting={stream.sitting}
            focusTitle={focusTitle}
            onAdaptive={() => stream.chooseFocus(null)}
            onFocusConcept={stream.chooseFocus}
            onEndSitting={stream.resetSitting}
          />

          <ExerciseCard
            exercise={stream.exercise}
            concept={concept}
            result={stream.result}
            hintShown={stream.hintShown}
            familiar={familiar}
            retryKey={stream.retryKey}
            savedWords={savedWords}
            onSaved={markSaved}
            onToggleHint={stream.toggleHint}
            onSubmit={stream.submit}
          />

          {stream.result && (
            <FeedbackPanel
              exercise={stream.exercise}
              concept={concept}
              result={stream.result}
              hintShown={stream.hintShown}
              misses={stream.misses}
              savedWords={savedWords}
              onSaved={markSaved}
              onNext={stream.next}
              onRetry={stream.retry}
              onFocusConcept={stream.chooseFocus}
            />
          )}

          <TopicBrowser stats={stream.stats} focus={stream.focus} onFocus={stream.chooseFocus} />
        </>
      )}

      {stream.error && (
        <p role="alert" className="text-sm font-bold text-rose-500">
          {stream.error}
        </p>
      )}
    </div>
  );
}
