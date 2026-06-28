// Gemini model registry + client-side model/output settings (BYOK, localStorage).

export type GeminiModel = {
  id: string; // API model id used in the endpoint
  label: string; // friendly name
  blurb: string; // one-line description
  tier: "lite" | "balanced" | "pro";
  preview?: boolean;
};

// Curated list of chat-capable Gemini models (structured-output capable).
// Keep ids in sync with the Gemini API. Newer-gen first.
export const MODELS: GeminiModel[] = [
  {
    id: "gemini-3.5-flash",
    label: "Gemini 3.5 Flash",
    blurb: "Near-Pro quality at Flash speed. Best replies.",
    tier: "pro",
    preview: true,
  },
  {
    id: "gemini-3-flash",
    label: "Gemini 3 Flash",
    blurb: "Current-gen default. Great balance.",
    tier: "balanced",
    preview: true,
  },
  {
    id: "gemini-3.1-flash-lite",
    label: "Gemini 3.1 Flash-Lite",
    blurb: "Lightning fast and cheap. Strong at translation.",
    tier: "lite",
    preview: true,
  },
  {
    id: "gemini-2.5-flash",
    label: "Gemini 2.5 Flash",
    blurb: "Stable hybrid-reasoning model. Reliable.",
    tier: "balanced",
  },
  {
    id: "gemini-2.5-flash-lite",
    label: "Gemini 2.5 Flash-Lite",
    blurb: "Stable, lowest latency and cost.",
    tier: "lite",
  },
];

export const DEFAULT_MODEL = "gemini-2.5-flash";

// Output token cap. Higher = longer replies + more tokenization room, but
// slower and more BYOK quota. Chat replies are short, so this can stay modest.
export const OUTPUT_TOKEN_OPTIONS = [512, 1024, 2048, 4096] as const;
export const DEFAULT_MAX_OUTPUT_TOKENS = 2048;

const MODEL_KEY = "kaiwa_gemini_model";
const TOKENS_KEY = "kaiwa_max_output_tokens";
const AUTOSAVE_KEY = "kaiwa_autosave_words";

export function getModel(): string {
  if (typeof window === "undefined") return DEFAULT_MODEL;
  const stored = localStorage.getItem(MODEL_KEY);
  if (stored && MODELS.some((m) => m.id === stored)) return stored;
  return DEFAULT_MODEL;
}

export function setModel(id: string) {
  localStorage.setItem(MODEL_KEY, id);
}

// Auto-fallback toggle: when on, the app tries other models if the chosen one
// is rate-limited/unavailable. On by default.
const FALLBACK_KEY = "kaiwa_model_fallback";

export function getAutoFallback(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(FALLBACK_KEY) !== "0";
}

export function setAutoFallback(on: boolean) {
  localStorage.setItem(FALLBACK_KEY, on ? "1" : "0");
}

/** Models to try in order: the chosen one first, then the rest (lighter models
 *  first, since they have higher rate limits and are more likely to succeed). */
export function modelFallbackOrder(): string[] {
  const chosen = getModel();
  const tierRank = { lite: 0, balanced: 1, pro: 2 };
  const rest = MODELS.filter((m) => m.id !== chosen).sort(
    (a, b) => tierRank[a.tier] - tierRank[b.tier]
  );
  return [chosen, ...rest.map((m) => m.id)];
}

export function getMaxOutputTokens(): number {
  if (typeof window === "undefined") return DEFAULT_MAX_OUTPUT_TOKENS;
  const stored = Number(localStorage.getItem(TOKENS_KEY));
  return OUTPUT_TOKEN_OPTIONS.includes(stored as (typeof OUTPUT_TOKEN_OPTIONS)[number])
    ? stored
    : DEFAULT_MAX_OUTPUT_TOKENS;
}

export function setMaxOutputTokens(n: number) {
  localStorage.setItem(TOKENS_KEY, String(n));
}

// Whether to auto-add every word Kai introduces to the deck. Default OFF — the
// deck grows from words the user deliberately taps to add.
export function getAutoSaveWords(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTOSAVE_KEY) === "1";
}

export function setAutoSaveWords(on: boolean) {
  localStorage.setItem(AUTOSAVE_KEY, on ? "1" : "0");
}

// Auto-memory: when on, durable facts Kai notices are saved silently. When off
// (default), they're shown as "Remember this?" suggestions you tap to save.
const AUTO_MEMORY_KEY = "kaiwa_auto_memory";

export function getAutoMemory(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(AUTO_MEMORY_KEY) === "1";
}

export function setAutoMemory(on: boolean) {
  localStorage.setItem(AUTO_MEMORY_KEY, on ? "1" : "0");
}
