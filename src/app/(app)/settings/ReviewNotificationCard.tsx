"use client";

import { useState, useEffect } from "react";
import {
  getNotificationPreferences,
  saveNotificationPreferences,
  scheduleReviewNotifications,
  type ReviewNotificationConfig,
} from "@/lib/review-notifications";

export default function ReviewNotificationCard() {
  const [config, setConfig] = useState<ReviewNotificationConfig>({
    enabled: true,
    intervals: [4, 8, 12],
  });
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [supported, setSupported] = useState(false);

  useEffect(() => {
    // Check browser support
    if (typeof window !== "undefined" && "Notification" in window) {
      setSupported(true);
      setPermission(Notification.permission);
    }

    // Load saved preferences
    const prefs = getNotificationPreferences();
    setConfig(prefs);
  }, []);

  async function toggleEnabled() {
    const newEnabled = !config.enabled;
    
    // If enabling, request permission first
    if (newEnabled && Notification.permission === "default") {
      const perm = await Notification.requestPermission();
      setPermission(perm);
      
      if (perm !== "granted") {
        alert("Please allow notifications to enable review reminders.");
        return;
      }
    }

    const newConfig = { ...config, enabled: newEnabled };
    setConfig(newConfig);
    saveNotificationPreferences(newConfig);

    // If enabling, schedule immediately
    if (newEnabled) {
      // Fetch current due count
      try {
        const res = await fetch("/api/stats");
        if (res.ok) {
          const data = await res.json();
          await scheduleReviewNotifications(data.dueCount || 0);
        }
      } catch (err) {
        console.error("Failed to schedule notifications:", err);
      }
    }
  }

  if (!supported) {
    return (
      <div className="rounded-xl border-2 border-border bg-card p-5">
        <h3 className="font-display text-lg font-bold">Review Reminders</h3>
        <p className="mt-2 text-sm text-muted">
          Browser notifications are not supported on this device.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border-2 border-border bg-card p-5">
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-display text-lg font-bold">Review Reminders</h3>
          <p className="mt-1 text-sm text-muted">
            {permission === "denied"
              ? "Notifications blocked. Please reset in your browser settings."
              : config.enabled
                ? "Get reminders when you have cards due for review. Up to 3 notifications per day."
                : "Enable notifications to get review reminders."}
          </p>
        </div>

        <button
          onClick={toggleEnabled}
          disabled={permission === "denied"}
          className={`relative h-6 w-11 rounded-full transition-colors ${
            config.enabled ? "bg-indigo-ai" : "bg-border"
          } ${permission === "denied" ? "opacity-50" : ""}`}
        >
          <span
            className={`absolute left-0.5 top-0.5 h-5 w-5 rounded-full bg-white transition-transform ${
              config.enabled ? "translate-x-5" : ""
            }`}
          />
        </button>
      </div>

      {config.enabled && permission === "granted" && (
        <div className="mt-4 rounded-lg bg-surface/50 p-3">
          <p className="text-xs font-bold uppercase tracking-wide text-muted">
            Notification Schedule
          </p>
          <p className="mt-1 text-sm">
            You'll receive up to 3 reminders at: <strong>4 hours</strong>,{" "}
            <strong>8 hours</strong>, and <strong>12 hours</strong> after opening the app
            (only if you have cards due).
          </p>
          <p className="mt-2 text-xs text-muted">
            💡 Tip: The schedule resets each time you open the app or complete reviews.
          </p>
        </div>
      )}

      {!config.enabled && permission !== "denied" && (
        <div className="mt-3 rounded-lg bg-amber/10 p-3">
          <p className="text-xs text-amber">
            ⚠️ Review reminders are currently disabled. Enable them to stay on track with
            your spaced repetition schedule.
          </p>
        </div>
      )}
    </div>
  );
}
