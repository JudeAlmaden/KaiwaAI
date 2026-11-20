// Stranger chat (random 1:1 rooms) is off unless explicitly enabled. Kept as a
// server-only flag so the routes and the pages agree, and so the feature can be
// switched off without a deploy of client code.
export function isStrangerChatEnabled(): boolean {
  const raw = process.env.STRANGER_CHAT_ENABLED;
  return raw === "1" || raw?.toLowerCase() === "true";
}

export const STRANGER_QUEUE_TTL_MS = 2 * 60 * 1000; // waiting entry expires
export const STRANGER_SESSION_IDLE_MS = 30 * 60 * 1000; // extended by messages
export const STRANGER_SESSION_MAX_MS = 2 * 60 * 60 * 1000; // hard cap
export const STRANGER_ENDED_RETENTION_MS = 10 * 60 * 1000; // keep a closed room
export const STRANGER_CLEANUP_INTERVAL_MS = 60 * 1000; // per server instance

// A spare room is cheap; a message flood is not. The limiter is a DB count so it
// holds across Vercel instances (the in-memory one does not).
export const STRANGER_MESSAGE_BURST = 8;
export const STRANGER_MESSAGE_WINDOW_MS = 10 * 1000;

// New rooms are capped per user per window by counting their own recent
// `StrangerParticipant` rows. Six rooms in ten minutes is far above a real
// conversation pace and still stops a script from opening hundreds of rooms to
// fish for partners (or to spray harassment) across a burst of instances.
// The window is deliberately equal to the ended-room retention, so the rows the
// cap counts are the same rows the reaper keeps that long anyway.
export const STRANGER_ROOM_BURST = 6;
export const STRANGER_ROOM_WINDOW_MS = 10 * 60 * 1000;
