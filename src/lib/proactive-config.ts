// Client-side toggle for Kai's in-chat proactivity (BYOK, localStorage).
// When on, Kai may message first while you're on the chat screen and
// occasionally add a short follow-up to her own messages.

const PROACTIVE_KEY = "kaiwa_proactive_chat";

export function getProactiveChat(): boolean {
  if (typeof window === "undefined") return true;
  // Default ON — it's a core part of Kai's personality.
  return localStorage.getItem(PROACTIVE_KEY) !== "0";
}

export function setProactiveChat(on: boolean) {
  localStorage.setItem(PROACTIVE_KEY, on ? "1" : "0");
}

// Timing knobs (ms). Kept here so they're easy to tune in one place.
export const PROACTIVE = {
  // How long the user must be idle (no send) before Kai may open a new thread.
  idleBeforeOpener: 45_000,
  // After Kai sends, the chance + delay she tacks on a continuous follow-up
  // during an ongoing conversation.
  followupChance: 0.2,
  followupDelayMin: 4_000,
  followupDelayMax: 9_000,
  // Hard ceiling on consecutive Kai messages with no user reply.
  maxConsecutive: 3,
  // Chance Kai opens a fresh thread when you've been idle (e.g. just logged in
  // and left the chat open). Low on purpose — she shouldn't greet every visit.
  openerChance: 0.05,
  // Minimum gap between proactive openers so she doesn't spam an idle tab.
  openerCooldown: 120_000,
} as const;
