// Personas seen by the chat UI always carry a role: Kai, one of Kai's attitudes,
// or a custom character. Rows written before the personalities migration (and
// the browser cache holding them) have no `kind`, so derive it once here rather
// than scattering built-in name checks through the modals.

export type PersonaRole = "kai" | "kai_mode" | "custom";

const LEGACY_ATTITUDES: Record<string, string> = {
  hana: "Calm",
  riku: "Playful",
  sora: "Thoughtful",
};

type PersonaLike = {
  name: string;
  builtin: boolean;
  kind?: string | null;
  label?: string | null;
};

export function normalizePersonaRole<T extends PersonaLike>(
  persona: T
): T & { kind: PersonaRole; label: string | null } {
  const name = persona.name.trim().toLowerCase();

  if (persona.kind === "kai" || persona.kind === "kai_mode" || persona.kind === "custom") {
    return {
      ...persona,
      kind: persona.kind,
      label: persona.label ?? LEGACY_ATTITUDES[name] ?? null,
    };
  }

  if (persona.builtin && name === "kai") {
    return { ...persona, kind: "kai", label: null };
  }
  if (persona.builtin && name in LEGACY_ATTITUDES) {
    return {
      ...persona,
      kind: "kai_mode",
      label: persona.label ?? LEGACY_ATTITUDES[name],
    };
  }
  return { ...persona, kind: "custom", label: persona.label ?? null };
}
