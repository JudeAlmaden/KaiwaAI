"use client";

import { useEffect, useState } from "react";
import { useReviewNotifications } from "@/hooks/useReviewNotifications";

/**
 * Manages review reminder notifications
 * Fetches due card count and schedules notifications
 */
export default function ReviewNotificationManager() {
  const [dueCount, setDueCount] = useState<number | undefined>(undefined);
  
  // Initialize notification system
  useReviewNotifications(dueCount);

  useEffect(() => {
    // Fetch due cards count on mount
    async function fetchDueCount() {
      try {
        const res = await fetch("/api/stats");
        if (!res.ok) return;
        
        const data = await res.json();
        setDueCount(data.dueCount || 0);
      } catch (err) {
        console.error("Failed to fetch due count:", err);
      }
    }

    fetchDueCount();

    // Re-fetch every 30 minutes while app is open
    const interval = setInterval(() => {
      fetchDueCount();
    }, 30 * 60 * 1000);

    return () => clearInterval(interval);
  }, []);

  // This component doesn't render anything
  return null;
}
