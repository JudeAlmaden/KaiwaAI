/**
 * The chat exchange a vocabulary card was first saved from.
 *
 * Stored denormalized on UserFlashcard (JSON string) so a review card can show
 * the sentence that gave the word meaning even after the message scrolls away
 * or is deleted.
 */
export type CardSourceContext = {
  /** The AI message the learner tapped the word in. */
  ai: string;
  /** The learner's own preceding message, when there is one. */
  user: string | null;
};

const MAX_SNIPPET_CHARS = 280;

/** Collapse whitespace and cap length so snippets stay readable on a card. */
export function clipSnippet(text: string, max = MAX_SNIPPET_CHARS): string {
  const clean = text.replace(/\s+/g, " ").trim();
  if (clean.length <= max) return clean;
  return `${clean.slice(0, max - 1).trimEnd()}…`;
}

export function buildCardSourceContext(
  aiText: string | null | undefined,
  userText?: string | null
): CardSourceContext | null {
  const ai = clipSnippet(aiText ?? "");
  if (!ai) return null;
  const user = clipSnippet(userText ?? "");
  return { ai, user: user || null };
}

export function serializeCardSource(ctx: CardSourceContext | null): string | null {
  return ctx ? JSON.stringify(ctx) : null;
}

/** Defensive parse — bad/legacy values simply yield null (no context block). */
export function parseCardSource(raw: string | null | undefined): CardSourceContext | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return null;
    const r = parsed as Record<string, unknown>;
    const ai = typeof r.ai === "string" ? r.ai.trim() : "";
    if (!ai) return null;
    const user = typeof r.user === "string" && r.user.trim() ? r.user.trim() : null;
    return { ai, user };
  } catch {
    return null;
  }
}
