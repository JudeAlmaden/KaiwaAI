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
const SURPRISE_BLOCKLIST_KEY = "kaiwa_surprise_recent";
const SURPRISE_BLOCKLIST_MAX = 12;

// ── Surprise Me diversity pools ───────────────────────────────────────────────

/** Broad life-domain categories the model must stay inside for Surprise Me */
const SURPRISE_CATEGORIES = [
  "Outdoors / nature — e.g. hiking trail info desk, cherry-blossom picnic spot, river fishing pier, botanical garden guided tour, mountain hut check-in",
  "Community / civic — e.g. neighbourhood festival booth, local council notice board, volunteer river clean-up, community garden allotment",
  "Healthcare / wellness — e.g. dental check-up, optician eye test, gym membership inquiry, acupuncture clinic, sports injury first aid",
  "Education / learning — e.g. cram-school open day, driving school simulator, library card registration, calligraphy trial class, cooking school sign-up",
  "Entertainment / leisure — e.g. karaoke box ordering snacks, arcade prize counter, escape room briefing, bowling shoe rental, batting cage token machine",
  "Transport / logistics — e.g. shinkansen dining car order, ferry ticket window, coin locker at a bus terminal, bicycle-share docking station, taxi lost-property call",
  "Home / neighbourhood services — e.g. coin laundromat, DIY hardware store advice counter, locksmith call-out, gas-meter reading visit, recycling centre drop-off",
  "Food production / specialty retail — e.g. sake brewery tasting, artisan tofu shop, early-morning fish-market stall, wagashi confectionery demo, miso paste custom order",
  "Work / professional life — e.g. part-time job orientation, business-card exchange at a trade fair, print shop order, co-working space front desk, office supply delivery",
  "Arts / crafts / culture — e.g. ikebana flower-arranging studio, taiko drumming trial, pottery wheel class, manga-café seat selection, rakugo storytelling interval chat",
  "Sport / fitness — e.g. public swimming pool lane booking, martial-arts dojo visitor inquiry, yoga studio mat rental, tennis court reservation, rock-climbing wall induction",
  "Animal / pet — e.g. vet clinic check-up, cat café ordering, dog grooming salon drop-off, pet-food specialty store, goldfish-scooping festival stall",
];

/** Friction twists injected as a second axis — forces non-generic scenes */
const SURPRISE_COMPLICATIONS = [
  "you only have cash and need to check if the exact amount is right",
  "you are in a slight hurry and must politely speed up the interaction without being rude",
  "the staff member is very enthusiastic and keeps recommending add-ons you didn't ask for",
  "you need to fill in a short paper form you don't fully understand",
  "the item or time-slot you wanted is unavailable and you must ask for an alternative",
  "you must compare two similar options before deciding and ask the staff to explain the difference",
  "you are meeting someone there and need to describe where exactly you are waiting",
  "you realise you forgot to bring something important and must explain the situation",
  "a small misunderstanding about quantity or size needs to be politely corrected",
  "you want to ask if there is a discount, loyalty card, or special deal available",
  "the staff member speaks very fast and you need to politely ask them to repeat or slow down",
  "you need to make a reservation or appointment for a future date while you are there",
];

/** Read the blocklist of recently generated surprise scenario titles */
function readSurpriseBlocklist(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(SURPRISE_BLOCKLIST_KEY);
    return raw ? (JSON.parse(raw) as string[]) : [];
  } catch {
    return [];
  }
}

/** Record a newly generated surprise quest title into the rolling blocklist */
function recordSurpriseTitle(title: string): void {
  if (typeof window === "undefined") return;
  try {
    const list = readSurpriseBlocklist();
    list.unshift(title);
    localStorage.setItem(
      SURPRISE_BLOCKLIST_KEY,
      JSON.stringify(list.slice(0, SURPRISE_BLOCKLIST_MAX))
    );
  } catch {
    // quota — ignore
  }
}

/** Pick a uniformly random element from an array */
function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

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
  let surpriseAnchors = "";

  if (customPrompt) {
    themeLabel = `a user-specified custom scenario: "${customPrompt}"`;
  } else if (theme === "surprise") {
    // ── Four-axis diversity system ────────────────────────────────────────
    // Axis 1: random life-domain category (JS picks, model can't default-cluster)
    const category = pickRandom(SURPRISE_CATEGORIES);
    // Axis 2: random slot number (treats each generation as a unique numbered slot)
    const slot = Math.floor(Math.random() * 50) + 1;
    // Axis 3: random complication / friction twist
    const complication = pickRandom(SURPRISE_COMPLICATIONS);
    // Axis 4: rotating blocklist of recent titles
    const recentTitles = readSurpriseBlocklist();
    const blocklistNote = recentTitles.length > 0
      ? `RECENTLY USED SCENARIOS (do NOT repeat or closely resemble any of these): ${recentTitles.map(t => `"${t}"`).join(", ")}.`
      : "";

    themeLabel = `a surprising, vivid, and highly specific Japanese daily-life scenario`;
    surpriseAnchors = `
RANDOMISATION ANCHORS — apply all three to guarantee variety:
1. Life-domain category: ${category}
2. Scenario slot: #${slot} of 50 — treat this as a unique, distinct scenario slot that has never been used before.
3. Complication twist: weave this friction naturally into the scene without announcing it: "${complication}"
${blocklistNote}

ADDITIONAL STRICT RULES FOR SURPRISE:
- Do NOT frame the scenario as someone being lost, something missing, or finding directions.
- Do NOT set the scene in a rental shop, video/movie rental, or any generic convenience store.
- Do NOT reuse clichés: no hidden cafés, hidden alleys, beach scenes, ocean, or sea.
- Do NOT set the scene in a shop, store, or retail context unless it is highly specific and unusual (e.g. a speciality wagashi shop, not a generic clothing store).
- The complication twist must be embedded organically — it should feel like a natural part of the interaction, not an added plot point.`;
  } else {
    themeLabel = QUEST_THEMES.find((t) => t.id === theme)?.label ?? "daily life in Japan";
  }

  const reinforce =
    ctx.reinforce.length > 0
      ? `\nThe user is currently learning these words — incorporate them naturally into objectives where possible: ${ctx.reinforce.join(", ")}.`
      : "";

  return `Generate a unique, creative, and interactive Japanese conversation roleplay quest for a learner at JLPT ${ctx.level} (${ctx.knownCount} words known).

Theme: ${themeLabel}
${surpriseAnchors}
${reinforce}

Create a vivid, culturally authentic scenario set in Japan. The quest should:
- Feel like a realistic, specific situation (e.g. don't just generate a generic store scenario; make it a specific themed store, boutique, or shop).
- Be completable through natural Japanese conversation (5-10 turns).
- Have exactly 5 objectives, each achievable with one or two Japanese utterances.
- Be tailored to the grammar structure of JLPT ${ctx.level}.
- CRITICAL FOR VARIATION & LEARNING: Do NOT limit the vocabulary to only what the user already knows. Deliberately introduce 2 to 3 new theme-appropriate words or expressions (e.g. scenario-specific nouns like ticket gates, special dishes, hotel amenities) in the scene description and objectives. The user will learn these from context and hints.
- Ensure high variation: generate diverse characters, settings, times of day, and situations for this theme. Do NOT default to sea, beach, or ocean-themed scenarios. Avoid repeating the same scenario.
- CRITICAL AVOIDANCE: Avoid starting or framing the scenario with clichés like "a hidden cafe", "a hidden alley", "a hidden bar", or "a hidden shop".

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
      // Record title in rolling blocklist for surprise theme
      if (theme === "surprise") recordSurpriseTitle(quest.title);
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
