// "Kai's Room" mood engine for the /gome prototype home screen.
// Maps DashboardStats to a pet-style mood, a speech bubble, and portrait art.
// Pure and deterministic so it stays unit-testable; no React or Prisma here.

import type { DashboardStats } from "@/lib/dashboard-stats";

/** Base room moods derived from data (greeting is a timed phase, not data). */
export type RoomMood = "idle" | "worried" | "sleepy" | "proud" | "lapsed";

/** Transient moods triggered by taps, timers, or other screens. */
export type TransientMood = "greeting" | "celebrate" | "poke" | "pet";

/** Everything the avatar needs to render a mood. */
export type KaiMood = {
  mood: RoomMood | TransientMood;
  /** File name inside /images/kai/portraits/ (557×470 scenes). */
  portrait: string;
  /** Speech bubble line (Japanese greeting lives on the title line). */
  line: string;
};

/** 557×470 portrait scene used for each mood (public/images/kai/portraits). */
export const MOOD_PORTRAIT: Record<RoomMood | TransientMood, string> = {
  idle: "studying", // calm default — she studies while you're away
  worried: "looking_away", // glancing back over her shoulder, uneasy
  sleepy: "sleeping", // in bed with a plushie
  proud: "sparkling_joy", // star-struck close-up
  lapsed: "looking_away", // turned away — she notices the gap
  greeting: "greeting_wave", // welcome-back wave
  celebrate: "snack_break", // rewarding treat moment
  poke: "sparkling_joy", // brief surprise/joy close-up
  pet: "sparkling_joy", // brief happy close-up
};

export function isLateNight(hour: number): boolean {
  return hour < 5 || hour >= 22;
}

/** Base mood from stats + hour. Precedence: sleepy > worried > proud > lapsed > idle. */
export function roomMoodFor(
  stats: Pick<DashboardStats, "dueNow" | "streak" | "activeToday"> | null,
  hour: number
): RoomMood {
  if (isLateNight(hour)) return "sleepy";
  if (!stats) return "idle";
  if (stats.dueNow > 15) return "worried";
  if (stats.streak >= 3 && stats.activeToday) return "proud";
  if (stats.streak === 0) return "lapsed";
  return "idle";
}

/** The mood, matching portrait, and speech line for the current state. */
export function kaiMoodFor(
  stats: Pick<
    DashboardStats,
    "dueNow" | "streak" | "activeToday" | "progressLevel"
  > | null,
  hour: number
): KaiMood {
  const mood = roomMoodFor(stats, hour);
  return { mood, portrait: MOOD_PORTRAIT[mood], line: kaiLineFor(mood, stats) };
}

/** Speech-bubble line for a base mood (mirrors /home's getKaiSpeech tone). */
export function kaiLineFor(
  mood: RoomMood,
  stats: Pick<DashboardStats, "dueNow" | "streak" | "progressLevel"> | null
): string {
  if (!stats) return "Loading your progress…";
  switch (mood) {
    case "sleepy": {
      const n = stats.dueNow;
      return n > 0
        ? `${n} card${n === 1 ? "" : "s"} can wait until morning… probably.`
        : "So sleepy… but you showed up today. That counts.";
    }
    case "worried": {
      const n = stats.dueNow;
      return `${n} card${n === 1 ? " is" : "s are"} piling up! Even 10 will shrink the pile.`;
    }
    case "proud":
      return `${stats.streak} day streak — sensei would be proud! 🔥`;
    case "lapsed":
      return "I saved your deck. One card today restarts everything!";
    case "idle":
      return stats.dueNow > 0
        ? `${stats.dueNow} review${stats.dueNow === 1 ? "" : "s"} ready when you are!`
        : `All caught up! Ready for a chat, ${stats.progressLevel.toLowerCase()} learner?`;
  }
}

/** Japanese greeting line by hour (shown big on the bubble's title row). */
export function greetingForHour(h: number): string {
  if (h < 5) return "おやすみなさい";
  if (h < 11) return "おはよう";
  if (h < 17) return "こんにちは";
  return "こんばんは";
}

/** Bubble content + portrait for transient reactions. */
export function transientLineFor(mood: TransientMood, name?: string | null): {
  line: string;
  portrait: string;
} {
  switch (mood) {
    case "greeting":
      return {
        line: name ? `Welcome back, ${name}さん!` : "Welcome back!",
        portrait: MOOD_PORTRAIT.greeting,
      };
    case "celebrate":
      return {
        line: "やった! Great session!",
        portrait: MOOD_PORTRAIT.celebrate,
      };
    case "poke":
      return { line: "ひゃっ! You found me!", portrait: MOOD_PORTRAIT.poke };
    case "pet":
      return { line: "えへへ… that feels nice.", portrait: MOOD_PORTRAIT.pet };
  }
}

/** When the session's celebrate flag has expired (ms since stored). */
export const CELEBRATION_TTL_MS = 60_000;

export const CELEBRATION_KEY = "home:celebrate";

/**
 * True when a cross-screen celebration is pending for this mount.
 * Reads sessionStorage once and clears the flag (consume-once).
 */
export function consumeCelebration(): boolean {
  try {
    const raw = sessionStorage.getItem(CELEBRATION_KEY);
    if (!raw) return false;
    sessionStorage.removeItem(CELEBRATION_KEY);
    const t = Number(raw);
    return Number.isFinite(t) && Date.now() - t < CELEBRATION_TTL_MS;
  } catch {
    return false;
  }
}

/** Fire a celebration that plays the next time /gome mounts. */
export function queueKaiCelebration(): void {
  try {
    sessionStorage.setItem(CELEBRATION_KEY, String(Date.now()));
  } catch {
    // private mode etc. — celebration is cosmetic, ignore
  }
}

/**
 * Delay until the next ambient "life" moment (a tiny sway variation), so the
 * room feels alive without ever swapping Kai's portrait on a timer.
 */
export function nextIdleSwayDelayMs(rand: () => number = Math.random): number {
  return 2600 + Math.floor(rand() * 3200);
}
