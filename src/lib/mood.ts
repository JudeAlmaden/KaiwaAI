// Shared mood domain for outreach (user-level ladder) and per-conversation chat mood.

export type Mood =
  | "cheerful"
  | "hopeful"
  | "wistful"
  | "sad"
  | "givingUp"
  | "dormant"
  | "neutral";

/** Outreach-only moods (no "neutral"). */
export type OutreachMood = Exclude<Mood, "neutral">;

export const DORMANT_AFTER = 7; // ignored streak at which Kai stops reaching out

/** Outreach ladder from User.consecutiveIgnored. */
export function moodFor(consecutiveIgnored: number): OutreachMood {
  if (consecutiveIgnored <= 0) return "cheerful";
  if (consecutiveIgnored === 1) return "hopeful";
  if (consecutiveIgnored <= 3) return "wistful";
  if (consecutiveIgnored <= 5) return "sad";
  if (consecutiveIgnored === 6) return "givingUp";
  return "dormant";
}

/** Tone guidance fed into opener / chat prompts for each mood. */
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
  neutral: "You're at ease with them — natural, warm, no special urgency.",
};

export const MOOD_EMOJI: Record<Mood, string> = {
  cheerful: "😊",
  hopeful: "🙂",
  wistful: "💭",
  sad: "😔",
  givingUp: "🌙",
  dormant: "💤",
  neutral: "✨",
};

export const MOOD_LABEL: Record<Mood, string> = {
  cheerful: "Cheerful",
  hopeful: "Hopeful",
  wistful: "Wistful",
  sad: "Missing you",
  givingUp: "Quiet",
  dormant: "Dormant",
  neutral: "Neutral",
};

const CHAT_MOODS: Mood[] = [
  "cheerful",
  "hopeful",
  "wistful",
  "sad",
  "givingUp",
  "dormant",
  "neutral",
];

export function isMood(v: unknown): v is Mood {
  return typeof v === "string" && (CHAT_MOODS as string[]).includes(v);
}

/** Map a numeric score (−10…+10) to a chat mood. Higher = warmer. */
export function moodFromScore(score: number): Mood {
  if (score >= 6) return "cheerful";
  if (score >= 3) return "hopeful";
  if (score >= 0) return "neutral";
  if (score >= -3) return "wistful";
  if (score >= -6) return "sad";
  if (score >= -9) return "givingUp";
  return "dormant";
}

export type ChatMoodDrivers = {
  /** Hours since the user's last message in this chat (Infinity if never). */
  hoursSinceUserReply: number;
  /** Consecutive AI/outreach turns without a user reply. */
  consecutiveIgnored: number;
  /** Whether the user just replied (reward bump). */
  userJustReplied: boolean;
  /** Current score before this update. */
  moodScore: number;
};

/**
 * Deterministic per-conversation mood update.
 * User reply raises score; ignored streaks and long gaps decay it.
 */
export function nextChatMood(drivers: ChatMoodDrivers): {
  mood: Mood;
  moodScore: number;
} {
  let score = drivers.moodScore;

  if (drivers.userJustReplied) {
    // Reward loop: reply resets toward cheerful.
    score = Math.min(10, Math.max(score, 0) + 4);
  } else {
    // Decay on ignored outreach / AI turns.
    if (drivers.consecutiveIgnored >= 1) score -= 1;
    if (drivers.consecutiveIgnored >= 3) score -= 1;
    if (drivers.consecutiveIgnored >= 5) score -= 2;
    if (drivers.hoursSinceUserReply >= 24) score -= 1;
    if (drivers.hoursSinceUserReply >= 72) score -= 2;
    if (drivers.hoursSinceUserReply >= 168) score -= 2;
    score = Math.max(-10, Math.min(10, score));
  }

  return { mood: moodFromScore(score), moodScore: score };
}

/** Short tone line injected into systemPrompt. */
export function moodToneLine(mood: Mood, hoursSinceUserReply?: number): string {
  const prompt = MOOD_PROMPT[mood];
  if (!prompt) return "";
  const gap =
    typeof hoursSinceUserReply === "number" && hoursSinceUserReply >= 24
      ? ` You last heard from them about ${Math.round(hoursSinceUserReply / 24)} day(s) ago.`
      : "";
  return `\n\n======================== YOUR MOOD ========================\n${prompt}${gap} Never guilt-trip; stay kind.`;
}

/**
 * Whether proactive in-chat outreach is allowed for this conversation mood.
 * Mirrors canReachOut's dormant gate, but per-chat.
 */
export function canBeProactiveForMood(mood: Mood): boolean {
  return mood !== "dormant" && mood !== "givingUp";
}

/**
 * Blend a model-classified mood hint with the deterministic score.
 * The deterministic mood remains the fallback when the model omits/invalidates.
 */
export function blendMood(
  deterministic: Mood,
  modelMood: unknown,
  currentScore: number
): { mood: Mood; moodScore: number } {
  if (!isMood(modelMood) || modelMood === "neutral") {
    return { mood: deterministic, moodScore: currentScore };
  }
  const target = moodFromScore(currentScore);
  // Nudge score one step toward the model's read, then re-derive.
  const order: Mood[] = [
    "dormant",
    "givingUp",
    "sad",
    "wistful",
    "neutral",
    "hopeful",
    "cheerful",
  ];
  const di = order.indexOf(target);
  const mi = order.indexOf(modelMood);
  if (di < 0 || mi < 0) return { mood: deterministic, moodScore: currentScore };
  const step = mi > di ? 1 : mi < di ? -1 : 0;
  const nextScore = Math.max(-10, Math.min(10, currentScore + step));
  return { mood: moodFromScore(nextScore), moodScore: nextScore };
}
