/**
 * Client-side review notification scheduler
 * Schedules up to 3 reminder notifications when the user has due cards
 * Resets when user logs in or completes reviews
 */

export type ReviewNotificationConfig = {
  enabled: boolean;
  intervals: number[]; // Hours after first check: [4, 8, 12]
};

export type ScheduledNotification = {
  id: string;
  scheduledFor: number; // Unix timestamp
  dueCount: number;
  sent: boolean;
};

const STORAGE_KEY = "kaiwa_review_notifications";
const DEFAULT_INTERVALS = [4, 8, 12]; // hours

/**
 * Get current notification schedule from localStorage
 */
export function getScheduledNotifications(): ScheduledNotification[] {
  if (typeof window === "undefined") return [];
  
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];
    return JSON.parse(stored);
  } catch {
    return [];
  }
}

/**
 * Save notification schedule to localStorage
 */
function saveSchedule(schedule: ScheduledNotification[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(schedule));
}

/**
 * Clear all scheduled notifications
 */
export function clearNotificationSchedule(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}

/**
 * Schedule review reminder notifications
 * Call this when:
 * 1. User opens the app
 * 2. User completes a review session (to reschedule if still have due cards)
 */
export async function scheduleReviewNotifications(dueCount: number): Promise<void> {
  if (typeof window === "undefined") return;
  
  // Check if notifications are supported and permitted
  if (!("Notification" in window)) {
    console.log("Notifications not supported");
    return;
  }

  // If no cards due, clear any existing schedule
  if (dueCount === 0) {
    clearNotificationSchedule();
    return;
  }

  // Check permission
  let permission = Notification.permission;
  if (permission === "default") {
    permission = await Notification.requestPermission();
  }

  if (permission !== "granted") {
    console.log("Notification permission not granted");
    return;
  }

  // Clear old schedule and create new one
  clearNotificationSchedule();

  const now = Date.now();
  const schedule: ScheduledNotification[] = DEFAULT_INTERVALS.map((hoursDelay, index) => ({
    id: `review-${now}-${index}`,
    scheduledFor: now + hoursDelay * 60 * 60 * 1000,
    dueCount,
    sent: false,
  }));

  saveSchedule(schedule);

  // Start the notification checker
  startNotificationChecker();
}

/**
 * Check if any notifications are due and show them
 * This runs periodically when the app is open
 */
export function checkAndShowDueNotifications(): void {
  if (typeof window === "undefined") return;

  const schedule = getScheduledNotifications();
  if (schedule.length === 0) return;

  const now = Date.now();
  let updated = false;

  for (const notification of schedule) {
    if (!notification.sent && notification.scheduledFor <= now) {
      showReviewNotification(notification.dueCount);
      notification.sent = true;
      updated = true;
    }
  }

  if (updated) {
    // Remove sent notifications older than 24h
    const cutoff = now - 24 * 60 * 60 * 1000;
    const filtered = schedule.filter(n => !n.sent || n.scheduledFor > cutoff);
    saveSchedule(filtered);
  }
}

/**
 * Show a browser notification for due reviews
 */
function showReviewNotification(dueCount: number): void {
  if (typeof window === "undefined" || Notification.permission !== "granted") return;

  const title = dueCount === 1 
    ? "📚 1 card ready for review!"
    : `📚 ${dueCount} cards ready for review!`;
  
  const body = "Keep your streak going! Review now to stay sharp.";

  const notification = new Notification(title, {
    body,
    icon: "/icons/icon-192.png",
    badge: "/icons/icon-192.png",
    tag: "review-reminder", // Replaces previous notification
    requireInteraction: false,
    data: { url: "/review" },
  });

  notification.onclick = () => {
    window.focus();
    window.location.href = "/review";
    notification.close();
  };
}

/**
 * Start a background checker that runs every 5 minutes
 * This needs to be called when the app loads
 */
let checkerInterval: NodeJS.Timeout | null = null;

export function startNotificationChecker(): void {
  if (typeof window === "undefined") return;
  
  // Clear existing interval if any
  if (checkerInterval) {
    clearInterval(checkerInterval);
  }

  // Check immediately
  checkAndShowDueNotifications();

  // Then check every 5 minutes
  checkerInterval = setInterval(() => {
    checkAndShowDueNotifications();
  }, 5 * 60 * 1000); // 5 minutes
}

/**
 * Stop the notification checker (call on unmount)
 */
export function stopNotificationChecker(): void {
  if (checkerInterval) {
    clearInterval(checkerInterval);
    checkerInterval = null;
  }
}

/**
 * Get user's notification preferences from localStorage
 */
export function getNotificationPreferences(): ReviewNotificationConfig {
  if (typeof window === "undefined") {
    return { enabled: true, intervals: DEFAULT_INTERVALS };
  }

  try {
    const stored = localStorage.getItem("kaiwa_notification_prefs");
    if (!stored) return { enabled: true, intervals: DEFAULT_INTERVALS };
    return JSON.parse(stored);
  } catch {
    return { enabled: true, intervals: DEFAULT_INTERVALS };
  }
}

/**
 * Save user's notification preferences
 */
export function saveNotificationPreferences(config: ReviewNotificationConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("kaiwa_notification_prefs", JSON.stringify(config));
}
