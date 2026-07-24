'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AppBlocker } from '@/plugins/app-blocker';

export default function FlashcardCompletePage() {
  const router = useRouter();

  useEffect(() => {
    // Mark as completed
    AppBlocker.markFlashcardsCompleted()
      .then(() => {
        // Redirect after a short delay to show success message
        setTimeout(() => {
          // Try to trigger the blocked app to open
          // On Android, this will be handled by the native layer
          window.location.href = 'flashcards-completed://success';
        }, 1500);
      })
      .catch((err) => {
        console.error('Failed to mark completion:', err);
      });
  }, []);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center p-6 text-center">
      <div className="animate-bounce text-6xl mb-4">🎉</div>
      <h1 className="text-3xl font-bold mb-2">Great Job!</h1>
      <p className="text-lg text-muted mb-4">
        You've completed your flashcards!
      </p>
      <p className="text-sm text-muted">
        You can now access your blocked app.
      </p>
      
      <button
        onClick={() => router.push('/review')}
        className="mt-8 px-6 py-3 bg-indigo-ai text-white rounded-full font-semibold hover:opacity-90 transition"
      >
        Continue Studying
      </button>
    </div>
  );
}
