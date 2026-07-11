"use client";

import { useEffect } from "react";
import {
  scheduleReviewNotifications,
  startNotificationChecker,
  stopNotificationChecker,
  clearNotificationSchedule,
  getNotificationPreferences,
} from "@/lib/review-notifications";

/**
 * Hook to manage review reminder notifications
 * Call this in your root layout or main app component
 */
export function useReviewNotifications(dueCount?: number) {
  useEffect(() => {
    const prefs = getNotificationPreferences();
    
    if (!prefs.enabled) {
      return;
    }

    // Start the checker when component mounts
    startNotificationChecker();

    // Cleanup on unmount
    return () => {
      stopNotificationChecker();
    };
  }, []);

  // Schedule notifications when due count changes
  useEffect(() => {
    if (dueCount === undefined) return;

    const prefs = getNotificationPreferences();
    if (!prefs.enabled) return;

    void scheduleReviewNotifications(dueCount);
  }, [dueCount]);

  return {
    clearSchedule: clearNotificationSchedule,
  };
}
