'use client';

import { useState } from 'react';
import { Target, X, Sliders } from '@phosphor-icons/react';
import type { BlockerStudyMode, BlockerNoDueAction } from '@/plugins/app-blocker/definitions';
import InterceptionRulesEditor, {
  type InterceptionRulesState,
} from './InterceptionRulesEditor';

interface RulesConfigCardProps {
  flashcardCount: number;
  blockChance?: number;
  unlockDurationMinutes?: number;
  reviewType?: string;
  direction?: string;
  studyMode?: BlockerStudyMode;
  practice?: boolean;
  noDueAction?: BlockerNoDueAction;
  earlyReviewStrategy?: 'practice' | 'proportional';
  learningRatio?: number;
  onUpdateFlashcardCount: (count: number) => void;
  onUpdateAppBlockerConfig?: (updates: {
    count?: number;
    blockChance?: number;
    unlockDurationMinutes?: number;
    reviewType?: 'mixed' | 'vocabulary' | 'kanji';
    direction?: 'jp-to-en' | 'en-to-jp' | 'mixed';
    studyMode?: BlockerStudyMode;
    practice?: boolean;
    noDueAction?: BlockerNoDueAction;
    earlyReviewStrategy?: 'practice' | 'proportional';
    learningRatio?: number;
  }) => void;
}

export default function RulesConfigCard({
  flashcardCount,
  blockChance = 100,
  unlockDurationMinutes = 15,
  reviewType = 'mixed',
  direction = 'mixed',
  studyMode = 'all',
  practice = false,
  noDueAction = 'autoOpen',
  earlyReviewStrategy = 'practice',
  learningRatio = 0.5,
  onUpdateFlashcardCount,
  onUpdateAppBlockerConfig,
}: RulesConfigCardProps) {
  const [showModal, setShowModal] = useState(false);

  const editorValues: InterceptionRulesState = {
    count: flashcardCount,
    blockChance,
    unlockDurationMinutes,
    reviewType: reviewType as InterceptionRulesState['reviewType'],
    direction: direction as InterceptionRulesState['direction'],
    studyMode,
    practice,
    noDueAction,
    earlyReviewStrategy,
    learningRatio,
  };

  function handleEditorChange(updates: Partial<InterceptionRulesState>) {
    if (updates.count !== undefined) {
      onUpdateFlashcardCount(updates.count);
    }
    const pluginUpdates = { ...updates };
    delete pluginUpdates.useReviewDefaults;
    if (Object.keys(pluginUpdates).length > 0) {
      onUpdateAppBlockerConfig?.(pluginUpdates);
    }
  }

  return (
    <>
      <section className="rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5 min-w-0">
          <div className="w-10 h-10 rounded-2xl bg-indigo-ai/10 text-indigo-ai flex items-center justify-center font-bold shrink-0">
            <Target size={20} />
          </div>
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-foreground">Review &amp; Interception Rules</h2>
            <div className="flex flex-wrap items-center gap-1.5 text-xs text-muted font-medium pt-0.5">
              <span className="font-bold text-indigo-ai">{flashcardCount} Flashcards</span>
              <span>•</span>
              <span>{blockChance}% Chance</span>
              <span>•</span>
              <span>{unlockDurationMinutes}m Grace Period</span>
            </div>
          </div>
        </div>

        <button
          onClick={() => setShowModal(true)}
          className="w-full sm:w-auto px-4 py-2.5 rounded-2xl border-2 border-border bg-background hover:bg-muted/10 text-foreground font-bold text-xs flex items-center justify-center gap-2 transition active:scale-95 shrink-0"
        >
          <Sliders size={16} className="text-indigo-ai" />
          <span>Edit Rules &amp; Goal</span>
        </button>
      </section>

      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="relative w-full max-w-md rounded-3xl border-2 border-border bg-card p-5 sm:p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-ai/10 text-indigo-ai flex items-center justify-center font-bold shrink-0">
                  <Sliders size={20} />
                </div>
                <div>
                  <h3 className="font-display text-base font-bold text-foreground">
                    Interception rules
                  </h3>
                  <p className="text-xs text-muted">Focus Guard study &amp; unlock behavior</p>
                </div>
              </div>

              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 rounded-xl bg-muted/15 text-muted hover:text-foreground flex items-center justify-center text-xs font-bold transition"
              >
                <X size={16} />
              </button>
            </div>

            <InterceptionRulesEditor
              values={editorValues}
              onChange={handleEditorChange}
              onCountChange={onUpdateFlashcardCount}
            />

            <button
              onClick={() => setShowModal(false)}
              className="w-full py-3 bg-indigo-ai border-b-4 border-indigo-deep hover:brightness-105 active:translate-y-[2px] text-white font-bold text-xs rounded-2xl shadow-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </>
  );
}
