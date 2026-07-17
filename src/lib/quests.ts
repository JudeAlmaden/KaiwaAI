// Client-side Gemini quest generation (BYOK). Quests are AI-generated scenarios
// tailored to the user's JLPT level and chosen theme. Results are cached in
// localStorage for 24h to avoid regenerating on every render.

import { keysForRequest, hasAnyKey } from "./api-keys";
import { getModel } from "./model-config";

// ── Types ────────────────────────────────────────────────────────────────────

export type QuestObjective = {
  id: string;           // e.g. "obj_1"
  description: string;  // "Greet the shop owner in Japanese"
  jpHint: string;       // "いらっしゃいませ！"
};

export type GeneratedQuest = {
  id: string;           // uuid
  title: string;        // "Ordering Ramen at a Local Shop"
  jpTitle: string;      // 「ラーメン屋で注文する」
  emoji: string;        // 🍜
  theme: string;        // "food"
  level: string;        // JLPT level the quest was generated for
  sceneDescription: string; // "You're at a small ramen counter in Shibuya on a rainy evening…"
  personaRole: string;  // full system-prompt excerpt for Kai to play the NPC
  objectives: QuestObjective[];
  generatedAt: number;  // Date.now() — used for 24h cache expiry
};

export type QuestTheme =
  | "food"
  | "travel"
  | "directions"
  | "shopping"
  | "emergency"
  | "surprise";

export const QUEST_THEMES: { id: QuestTheme; label: string; emoji: string }[] = [
  { id: "food", label: "Food & Drink", emoji: "🍜" },
  { id: "travel", label: "Travel", emoji: "🏨" },
  { id: "directions", label: "Directions", emoji: "🗺️" },
  { id: "shopping", label: "Shopping", emoji: "🛒" },
  { id: "emergency", label: "Emergencies", emoji: "🏥" },
  { id: "surprise", label: "Surprise Me", emoji: "🎌" },
];

// ── Quest state stored per active conversation ────────────────────────────────
// Key: kaiwa_quest_<groupId>  →  ActiveQuestState

export type ActiveQuestState = {
  quest: GeneratedQuest;
  completedObjectiveIds: string[];
  startedAt: number;
  completed: boolean;
};

const QUEST_CONV_PREFIX = "kaiwa_quest_conv_";
const CACHE_PREFIX = "kaiwa_quest_cache_";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24h

export function saveQuestForConv(groupId: string, quest: GeneratedQuest): void {
  if (typeof window === "undefined") return;
  const state: ActiveQuestState = {
    quest,
    completedObjectiveIds: [],
    startedAt: Date.now(),
    completed: false,
  };
  localStorage.setItem(QUEST_CONV_PREFIX + groupId, JSON.stringify(state));
}

export function loadQuestForConv(groupId: string): ActiveQuestState | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(QUEST_CONV_PREFIX + groupId);
    return raw ? (JSON.parse(raw) as ActiveQuestState) : null;
  } catch {
    return null;
  }
}

export function updateQuestState(groupId: string, patch: Partial<ActiveQuestState>): void {
  if (typeof window === "undefined") return;
  const state = loadQuestForConv(groupId);
  if (!state) return;
  localStorage.setItem(QUEST_CONV_PREFIX + groupId, JSON.stringify({ ...state, ...patch }));
}

export function clearQuestForConv(groupId: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(QUEST_CONV_PREFIX + groupId);
}

// ── Quest generation ──────────────────────────────────────────────────────────

type QuestContext = {
  level: string;
  knownCount: number;
  reinforce: string[];
};

const QUEST_SCHEMA = {
  type: "object",
  properties: {
    title: { type: "string" },
    jpTitle: { type: "string" },
    emoji: { type: "string" },
    sceneDescription: { type: "string" },
    personaRole: { type: "string" },
    objectives: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          description: { type: "string" },
          jpHint: { type: "string" },
        },
        required: ["id", "description", "jpHint"],
      },
    },
  },
  required: ["title", "jpTitle", "emoji", "sceneDescription", "personaRole", "objectives"],
};

function buildPrompt(theme: QuestTheme, ctx: QuestContext, customPrompt?: string): string {
  let themeLabel = "";
  if (customPrompt) {
    themeLabel = `a user-specified custom scenario: "${customPrompt}"`;
  } else if (theme === "surprise" || theme === "surprise" as string) {
    themeLabel = "a random, interesting daily life situation in Japan (e.g. at a train station, convenience store, cafe, bakery, post office, clothing store, clinic, park, library, or taxi)";
  } else {
    themeLabel = QUEST_THEMES.find((t) => t.id === theme)?.label ?? "daily life in Japan";
  }

  const reinforce =
    ctx.reinforce.length > 0
      ? `\nThe user is currently learning these words — incorporate them naturally into objectives where possible: ${ctx.reinforce.join(", ")}.`
      : "";

  return `Generate a unique, creative, and interactive Japanese conversation roleplay quest for a learner at JLPT ${ctx.level} (${ctx.knownCount} words known).

Theme: ${themeLabel}
${reinforce}

Create a vivid, culturally authentic scenario set in Japan. The quest should:
- Feel like a realistic, specific situation (e.g. don't just generate a generic store scenario; make it a specific themed store, boutique, or shop).
- Be completable through natural Japanese conversation (5-10 turns).
- Have exactly 5 objectives, each achievable with one or two Japanese utterances.
- Be tailored to the grammar structure of JLPT ${ctx.level}.
- CRITICAL FOR VARIATION & LEARNING: Do NOT limit the vocabulary to only what the user already knows. Deliberately introduce 2 to 3 new theme-appropriate words or expressions (e.g. scenario-specific nouns like ticket gates, special dishes, hotel amenities) in the scene description and objectives. The user will learn these from context and hints.
- Ensure high variation: generate diverse characters, settings, times of day, and situations for this theme. Do NOT default to sea, beach, or ocean-themed scenarios (even though the tutor is named Kai, do not let that bias the scenarios toward the sea). Avoid repeating the same scenario.
- CRITICAL AVOIDANCE: Avoid starting or framing the scenario with clichés like "a hidden cafe", "a hidden alley", "a hidden bar", or "a hidden shop". Make it a normal, realistic everyday location in Japan (e.g. a bustling station, a local neighborhood family-owned shop, a standard clinic, etc.).

For personaRole: write a detailed character description for the NPC Kai will play (their name, personality, setting, how they speak). This will be injected directly as a system prompt.

For each objective:
- id: "obj_1" through "obj_5"  
- description: English description of what the user must say/do
- jpHint: A natural Japanese phrase or sentence they might use (show the correct target phrasing)

Respond ONLY with valid JSON.`;
}

function cacheKey(theme: QuestTheme, level: string): string {
  return `${CACHE_PREFIX}${theme}_${level}`;
}

function readCache(theme: QuestTheme, level: string): GeneratedQuest | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(cacheKey(theme, level));
    if (!raw) return null;
    const quest = JSON.parse(raw) as GeneratedQuest;
    if (Date.now() - quest.generatedAt > CACHE_TTL_MS) {
      localStorage.removeItem(cacheKey(theme, level));
      return null;
    }
    return quest;
  } catch {
    return null;
  }
}

function writeCache(quest: GeneratedQuest): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(cacheKey(quest.theme as QuestTheme, quest.level), JSON.stringify(quest));
  } catch {
    // quota — ignore
  }
}

export function bustQuestCache(theme: QuestTheme, level: string): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(cacheKey(theme, level));
}

/** Generate an AI quest. Returns cached quest if still fresh, otherwise calls Gemini. */
export async function generateQuest(
  theme: QuestTheme,
  ctx: QuestContext,
  forceRefresh = false,
  customPrompt?: string
): Promise<GeneratedQuest> {
  if (!hasAnyKey()) throw new Error("NO_API_KEY");

  if (!forceRefresh && !customPrompt) {
    const cached = readCache(theme, ctx.level);
    if (cached) return cached;
  }

  const keys = keysForRequest();
  const model = getModel();
  const prompt = buildPrompt(theme, ctx, customPrompt);

  let lastError: Error = new Error("Quest generation failed.");

  for (const key of keys) {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: QUEST_SCHEMA,
            temperature: 0.9, // creative variance
            maxOutputTokens: 1024,
            thinkingConfig: { thinkingBudget: 0 },
          },
        }),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error("Empty response from Gemini.");

      const raw = JSON.parse(text) as Omit<GeneratedQuest, "id" | "theme" | "level" | "generatedAt">;

      const quest: GeneratedQuest = {
        ...raw,
        id: crypto.randomUUID(),
        theme,
        level: ctx.level,
        generatedAt: Date.now(),
      };

      writeCache(quest);
      return quest;
    }

    if (res.status === 429) {
      lastError = new Error("RATE_LIMIT");
      continue;
    }
    if (res.status === 400 || res.status === 403) throw new Error("BAD_API_KEY");
    lastError = new Error(`Gemini error ${res.status}`);
  }

  throw lastError;
}

/** Build the system prompt injection for an active quest. Injected into personaRole. */
export function buildQuestSystemPromptSuffix(quest: GeneratedQuest): string {
  const objList = quest.objectives
    .map((o) => `- ${o.id}: ${o.description} (hint: ${o.jpHint})`)
    .join("\n");

  return `

[ROLEPLAY QUEST ACTIVE]
You are playing the following character for a language-learning roleplay quest:
${quest.personaRole}

Stay fully in character at all times. Never break character or mention that this is a quest or a game.
Respond naturally as this character would. Keep replies conversational and at JLPT ${quest.level} difficulty.

CRITICAL ROLEPLAY RULE:
You MUST ONLY mark an objective as completed if the user successfully expressed the objective in Japanese (either kana, kanji, or romaji). If the user types or responds purely in English, DO NOT mark the objective as completed, even if they expressed the correct meaning. Encourage them in character to try expressing it in Japanese.

When the user successfully completes one of the following objectives in Japanese through natural conversation, append
[OBJECTIVE_COMPLETED:objectiveId] EXACTLY at the very end of your reply, after all other text.
You may complete multiple objectives in one turn by appending multiple tags.

Quest objectives:
${objList}

Scene: ${quest.sceneDescription}`;
}

/** Strip [OBJECTIVE_COMPLETED:id] tags from reply text and return both the clean
 *  text and a list of completed objective ids. */
export function extractQuestCompletions(reply: string): {
  cleanReply: string;
  completedIds: string[];
} {
  const completedIds: string[] = [];
  const cleanReply = reply.replace(
    /\[OBJECTIVE_COMPLETED:([^\]]+)\]/g,
    (_, id: string) => {
      completedIds.push(id.trim());
      return "";
    }
  ).trim();
  return { cleanReply, completedIds };
}
