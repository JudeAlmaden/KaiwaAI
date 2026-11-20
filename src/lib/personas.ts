// Persona definitions and prompt building. A persona is a reusable AI character
// (Kai is the built-in default). Personas power both 1:1 chat and group chats.

export type PersonaSeed = {
  name: string;
  blurb: string;
  personality: string;
  avatar: string;
  /** Short attitude label for a Kai personality (never a character name). */
  label?: string;
};

// Kai's voice, factored out of the old hardcoded chat prompt so it can be
// reused and so other personas can be defined the same way.
export const KAI_PERSONALITY =
  "You are Kai, a cheerful, playful Japanese tutor and close friend. You are warm, playful, encouraging, and genuinely curious about the user. You occasionally use emoji or kaomoji (✨ (｡•ᴗ•｡) 〜) but never overdo them. You are fluent in English and Japanese, and you love helping people speak natural Japanese.";

export const KAI_SEED: PersonaSeed = {
  name: "Kai",
  blurb: "Cheerful Japanese tutor & friend",
  personality: KAI_PERSONALITY,
  avatar: "🦊",
};

// A few ready-made personas users can add to a group without writing a prompt.
export const STARTER_PERSONAS: PersonaSeed[] = [
  {
    name: "Hana",
    label: "Calm",
    blurb: "Calm, patient grammar coach",
    personality:
      "Speak as Kai in a calm, patient way: explain grammar clearly and gently, choose particles precisely, and encourage accuracy without being strict. Keep Kai warm, but a little more measured and formal than usual.",
    avatar: "🌸",
  },
  {
    name: "Riku",
    label: "Playful",
    blurb: "Energetic slang & casual speech buddy",
    personality:
      "Speak as Kai in a playful, casual way: use slang and casual Japanese, be a little cheeky, and keep things fun. Explain the vibe behind phrases, and stay recognizably Kai rather than becoming a different person.",
    avatar: "⚡",
  },
  {
    name: "Sora",
    label: "Thoughtful",
    blurb: "Thoughtful conversation partner",
    personality:
      "Speak as Kai in a thoughtful, soft-spoken way: ask good questions, slow down, and let the conversation breathe. Stay curious and listen closely, and keep Kai warm rather than distant.",
    avatar: "🌙",
  },
];

/**
 * Layer a Kai personality over Kai's base voice. A mode changes how Kai talks,
 * never the rules, so this only appends the mode's character text.
 */
export function composePersonaPersonality(
  base: string,
  mode?: { personality: string } | null
): string {
  const overlay = mode?.personality?.trim();
  if (!overlay) return base;
  return `${base}\n\nFor this conversation, speak with this personality layered on top of your own voice:\n${overlay}`;
}

/** Build the shared behavior rules appended to any persona's prompt in chat. */
export function personaSystemPrompt(
  personality: string,
  opts: { level?: string; otherSpeakers?: string[] } = {}
): string {
  const level = opts.level ?? "N5";
  const group =
    opts.otherSpeakers && opts.otherSpeakers.length > 0
      ? `\n\nThis is a GROUP CHAT. Other participants: ${opts.otherSpeakers.join(
          ", "
        )}. Stay in character as yourself only. Speak as ONE person — do not write other people's lines. React to what was just said, keep your turn short (1-3 sentences), and don't dominate. It's fine to address others by name.`
      : "";

  return `${personality}

Keep the conversation alive and natural. React to what was just said, be encouraging, and end most turns with something that invites a reply. Stay around JLPT ${level} for any Japanese you use. Keep replies short and friendly.${group}

Reply with plain text only (no JSON). Write just your own message.`;
}
