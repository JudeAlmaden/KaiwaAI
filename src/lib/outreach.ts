// Kai's outreach ("messages first") logic: mood ladder + eligibility.

export type Mood =
  | "cheerful"
  | "hopeful"
  | "wistful"
  | "sad"
  | "givingUp"
  | "dormant";

export const DORMANT_AFTER = 7; // ignored streak at which Kai stops reaching out

export function moodFor(consecutiveIgnored: number): Mood {
  if (consecutiveIgnored <= 0) return "cheerful";
  if (consecutiveIgnored === 1) return "hopeful";
  if (consecutiveIgnored <= 3) return "wistful";
  if (consecutiveIgnored <= 5) return "sad";
  if (consecutiveIgnored === 6) return "givingUp";
  return "dormant";
}

/** Tone guidance fed into the opener prompt for each mood. */
export const MOOD_PROMPT: Record<Mood, string> = {
  cheerful:
    "You're upbeat and curious. Greet them warmly and invite a little chat.",
  hopeful:
    "You haven't heard back since last time. Stay positive and gently hopeful.",
  wistful:
    "It's been a few unanswered messages. You miss them a little — warm but slightly subdued.",
  sad: "They've ignored several messages. You're genuinely a bit sad and miss them, but still kind — no guilt-tripping.",
  givingUp:
    "You've reached out many times with no reply. Send one last gentle, understanding message letting them know you'll be here whenever they're ready.",
  dormant: "",
};

export type Eligibility = {
  ok: boolean;
  reason?: string;
};

/** Whether Kai may reach out right now. `now` is evaluated in the user's tz. */
export function canReachOut(params: {
  mode: string; // off | scheduled | random
  consecutiveIgnored: number;
  hourLocal: number; // 0-23 in user's tz
  minutesLocal: number; // 0-59
  quietStart: number;
  quietEnd: number;
  lastOutreachAt: Date | null;
  now: Date;
  scheduledTimes: string[]; // "HH:MM"
}): Eligibility {
  if (params.mode === "off") return { ok: false, reason: "outreach off" };
  if (moodFor(params.consecutiveIgnored) === "dormant")
    return { ok: false, reason: "dormant" };

  if (inQuietHours(params.hourLocal, params.quietStart, params.quietEnd))
    return { ok: false, reason: "quiet hours" };

  // At most one outreach per ~6h regardless of mode (anti-spam).
  if (params.lastOutreachAt) {
    const hrs = (params.now.getTime() - params.lastOutreachAt.getTime()) / 3.6e6;
    if (hrs < 6) return { ok: false, reason: "too soon" };
  }

  if (params.mode === "scheduled") {
    // Fire if the current time matches a scheduled HH:MM within a 10-min window.
    const match = params.scheduledTimes.some((t) => {
      const [h, m] = t.split(":").map(Number);
      if (Number.isNaN(h) || Number.isNaN(m)) return false;
      const diff =
        params.hourLocal * 60 + params.minutesLocal - (h * 60 + m);
      return diff >= 0 && diff < 10;
    });
    return match
      ? { ok: true }
      : { ok: false, reason: "no scheduled time now" };
  }

  // random mode: caller throttles via lastOutreachAt; allow within active hours.
  return { ok: true };
}

export function inQuietHours(hour: number, start: number, end: number): boolean {
  // Quiet window may wrap midnight (e.g. 22 → 8).
  if (start === end) return false;
  if (start < end) return hour >= start && hour < end;
  return hour >= start || hour < end;
}
