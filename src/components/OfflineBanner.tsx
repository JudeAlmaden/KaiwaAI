'use client';

import { useNetworkStatus } from '@/hooks/useNetworkStatus';
import { WifiSlash } from '@phosphor-icons/react';

interface OfflineBannerProps {
  isAppBlockerMode?: boolean;
}

export default function OfflineBanner({ isAppBlockerMode }: OfflineBannerProps) {
  const { isOnline } = useNetworkStatus();

  if (isOnline) return null;

  return (
    <div className="w-full bg-amber-500/15 border-b-2 border-amber-500/30 px-4 py-2.5 text-xs text-amber-900 dark:text-amber-200 flex items-center justify-between gap-3 shadow-xs animate-in fade-in">
      <div className="flex items-center gap-2.5 min-w-0 mx-auto">
        <WifiSlash size={18} className="shrink-0 text-amber-600 dark:text-amber-400 animate-pulse" />
        <span className="font-medium truncate">
          {isAppBlockerMode ? (
            <>
              <strong className="font-bold">Offline Review Mode:</strong> KaiwaAI is using offline flashcards to let you unlock your app without internet.
            </>
          ) : (
            <>
              <strong className="font-bold">Offline Mode:</strong> AI Chat &amp; Quests require internet, but your flashcard reviews work offline.
            </>
          )}
        </span>
      </div>
    </div>
  );
}
