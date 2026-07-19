/**
 * Quest Gallery - Gallery-style layout for review quest modes
 */

import { Chip } from "../ui";
import { PopButton } from "@/app/PopButton";
import {
  DailyQuestCard,
  GauntletCard,
  VocabularyCard,
  KanjiQuestCard,
  EndlessZenCard,
  CustomSessionCard,
} from "./quest-cards";

type Setup = {
  reviewType: "vocabulary" | "kanji" | "mixed";
  studyMode: "due" | "all" | "recent" | "struggling" | "leeches";
  direction: "jp-to-en" | "en-to-jp" | "mixed";
  practice: boolean;
  limit: number;
  isContinuous: boolean;
  activeLimit: number | "all";
};

type QuestGalleryProps = {
  dueCount: number | null;
  setup: Setup;
  setSetup: React.Dispatch<React.SetStateAction<Setup>>;
  onStartQuest: (custom?: Partial<Setup>) => void;
  showCustomModal: boolean;
  setShowCustomModal: (show: boolean) => void;
  showAdvanced: boolean;
  setShowAdvanced: (show: boolean) => void;
};

export default function QuestGallery({
  dueCount,
  setup,
  setSetup,
  onStartQuest,
  showCustomModal,
  setShowCustomModal,
  showAdvanced,
  setShowAdvanced,
}: QuestGalleryProps) {
  return (
    <>
      {/* Gallery-style grid layout */}
      <div className="mx-auto w-full max-w-6xl px-4 sm:px-6 lg:px-8 py-6">
        
        {/* Masonry grid - 2 columns on mobile, 2 on tablet, 3 on desktop */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4 auto-rows-auto">
          
          {/* Daily Quest - Full width (spans 2 columns on mobile/tablet, 3 on desktop) */}
          <DailyQuestCard
            dueCount={dueCount}
            onStart={() => onStartQuest({ studyMode: "due", limit: 50, isContinuous: false, reviewType: "mixed", activeLimit: 5 })}
          />

          {/* The Gauntlet - Left column on mobile */}
          <GauntletCard
            onStart={() => onStartQuest({ studyMode: "struggling", limit: 50, isContinuous: false, reviewType: "mixed", activeLimit: 5 })}
          />

          {/* Vocabulary Learning - Right column on mobile */}
          <VocabularyCard
            onStart={() => onStartQuest({ studyMode: "all", limit: 5, isContinuous: false, reviewType: "vocabulary", direction: "mixed", activeLimit: 5 })}
          />

          {/* Kanji Quest - Left column on mobile */}
          <KanjiQuestCard
            onStart={() => onStartQuest({ studyMode: "all", limit: 10, isContinuous: false, reviewType: "kanji", activeLimit: 5 })}
          />

          {/* Custom Session Button - Right column on mobile */}
          <CustomSessionCard onClick={() => setShowCustomModal(true)} />

          {/* Endless Zen - Full width (spans 2 columns on mobile/tablet) */}
          <EndlessZenCard
            onStart={() => onStartQuest({ studyMode: "all", limit: 200, isContinuous: true, reviewType: "mixed", activeLimit: 5 })}
          />

        </div>
      </div>

      {/* Custom Session Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={() => setShowCustomModal(false)}>
          <div 
            className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-3xl border-2 border-border bg-background p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={() => setShowCustomModal(false)}
              className="absolute top-4 right-4 flex h-8 w-8 items-center justify-center rounded-xl bg-muted/20 text-muted hover:bg-muted/40 hover:text-foreground transition-colors"
            >
              ✕
            </button>

            <h2 className="font-display text-2xl font-extrabold text-foreground mb-2">Custom Session Builder</h2>
            <p className="text-sm text-muted mb-6">Define your own review rules and limits.</p>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted font-display">
                  Review Type
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    active={setup.reviewType === "vocabulary"}
                    onClick={() => setSetup((s) => ({ ...s, reviewType: "vocabulary" }))}
                  >
                    Vocabulary
                  </Chip>
                  <Chip
                    active={setup.reviewType === "kanji"}
                    onClick={() => setSetup((s) => ({ ...s, reviewType: "kanji" }))}
                  >
                    Kanji
                  </Chip>
                  <Chip
                    active={setup.reviewType === "mixed"}
                    onClick={() => setSetup((s) => ({ ...s, reviewType: "mixed" }))}
                  >
                    Mixed
                  </Chip>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted font-display">
                  Card Direction
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    active={setup.direction === "jp-to-en"}
                    onClick={() => setSetup((s) => ({ ...s, direction: "jp-to-en" }))}
                  >
                    Japanese → English
                  </Chip>
                  <Chip
                    active={setup.direction === "en-to-jp"}
                    onClick={() => setSetup((s) => ({ ...s, direction: "en-to-jp" }))}
                  >
                    English → Japanese
                  </Chip>
                  <Chip
                    active={setup.direction === "mixed"}
                    onClick={() => setSetup((s) => ({ ...s, direction: "mixed" }))}
                  >
                    Mixed
                  </Chip>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted font-display">
                  Study Focus
                </p>
                <div className="flex flex-wrap gap-2">
                  <Chip
                    active={setup.studyMode === "due"}
                    onClick={() => setSetup((s) => ({ ...s, studyMode: "due" }))}
                  >
                    Due now
                  </Chip>
                  <Chip
                    active={setup.studyMode === "all"}
                    onClick={() => setSetup((s) => ({ ...s, studyMode: "all" }))}
                  >
                    Study ahead
                  </Chip>
                  <Chip
                    active={setup.studyMode === "recent"}
                    onClick={() => setSetup((s) => ({ ...s, studyMode: "recent" }))}
                  >
                    Recent
                  </Chip>
                  <Chip
                    active={setup.studyMode === "struggling"}
                    onClick={() => setSetup((s) => ({ ...s, studyMode: "struggling" }))}
                  >
                    Struggling
                  </Chip>
                  <Chip
                    active={setup.studyMode === "leeches"}
                    onClick={() => setSetup((s) => ({ ...s, studyMode: "leeches" }))}
                  >
                    Leeches
                  </Chip>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted font-display">
                  Session Size
                </p>
                <div className="flex flex-wrap gap-2">
                  {[10, 20, 50].map((n) => (
                    <Chip
                      key={n}
                      active={!setup.isContinuous && setup.limit === n}
                      onClick={() => setSetup((s) => ({ ...s, limit: n, isContinuous: false }))}
                    >
                      {n}
                    </Chip>
                  ))}
                  <Chip
                    active={setup.isContinuous}
                    onClick={() => setSetup((s) => ({ ...s, limit: 200, isContinuous: true }))}
                  >
                    Continuous
                  </Chip>
                </div>
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted font-display">
                  Active Working Pool
                </p>
                <div className="flex flex-wrap gap-2">
                  {[3, 5, 10, "all"].map((n) => (
                    <Chip
                      key={n}
                      active={setup.activeLimit === n}
                      onClick={() => setSetup((s) => ({ ...s, activeLimit: n as number | "all" }))}
                    >
                      {n === "all" ? "All (Classic)" : `${n} cards`}
                    </Chip>
                  ))}
                </div>
              </div>

              <button
                onClick={() => setShowAdvanced(!showAdvanced)}
                className="text-xs font-semibold text-indigo-soft hover:text-indigo-ai hover:underline cursor-pointer"
              >
                {showAdvanced ? "Hide" : "Show"} advanced options
              </button>

              {showAdvanced && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted font-display">
                    Mode
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Chip
                      active={!setup.practice}
                      onClick={() => setSetup((s) => ({ ...s, practice: false }))}
                    >
                      Review
                    </Chip>
                    <Chip
                      active={setup.practice}
                      onClick={() => setSetup((s) => ({ ...s, practice: true }))}
                    >
                      Practice only
                    </Chip>
                  </div>
                  <p className="mt-1 text-[10px] text-muted">
                    Practice mode won&apos;t affect your mastery scores
                  </p>
                </div>
              )}

              <PopButton 
                onClick={() => {
                  setShowCustomModal(false);
                  onStartQuest();
                }} 
                size="lg" 
                className="mt-6 w-full font-display"
              >
                Start Custom Session
              </PopButton>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
