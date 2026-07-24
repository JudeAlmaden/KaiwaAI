import { useEffect, useRef } from 'react';
import { AppBlocker } from '@/plugins/app-blocker';

/**
 * Hook to track flashcard completion for app blocker feature
 * Call this from your review session component
 */
export function useAppBlockerCompletion(completedCount: number, requiredCount: number) {
  const hasCompleted = useRef(false);

  useEffect(() => {
    // Check if user has completed the required amount (must be > 0)
    if (requiredCount > 0 && completedCount >= requiredCount && !hasCompleted.current) {
      hasCompleted.current = true;
      
      // Mark flashcards as completed in app blocker (15-minute unlock window)
      AppBlocker.markFlashcardsCompleted()
        .then(() => {
          console.log('App blocker: Flashcards completed successfully. App unlocked for 15 minutes!');
          
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('kaiwa:appblocker:unlocked', {
              detail: { requiredCount, completedCount }
            }));
          }

          // Show browser notification if granted
          if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('🔒 App Unlocked!', {
              body: `Great job! You completed ${completedCount} flashcards. Your app is unlocked for 15 minutes.`,
              icon: '/icons/icon-192.png'
            });
          }
        })
        .catch((err) => {
          console.error('Failed to mark flashcards completed:', err);
        });
    }
  }, [completedCount, requiredCount]);

  // Reset when component unmounts
  useEffect(() => {
    return () => {
      hasCompleted.current = false;
    };
  }, []);
}
