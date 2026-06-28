import { describe, it, expect } from "vitest";
import { personaSystemPrompt, KAI_SEED, STARTER_PERSONAS } from "./personas";

describe("personaSystemPrompt", () => {
  it("includes the persona's personality and a default level", () => {
    const p = personaSystemPrompt("You are Test, a robot.");
    expect(p).toContain("You are Test, a robot.");
    expect(p).toContain("N5");
    expect(p).toContain("plain text");
  });

  it("uses the provided JLPT level", () => {
    expect(personaSystemPrompt("x", { level: "N3" })).toContain("N3");
  });

  it("adds group-chat guidance when other speakers are present", () => {
    const p = personaSystemPrompt("x", { otherSpeakers: ["Hana", "Riku"] });
    expect(p).toContain("GROUP CHAT");
    expect(p).toContain("Hana");
    expect(p).toContain("Riku");
  });

  it("omits group guidance for a solo chat", () => {
    expect(personaSystemPrompt("x")).not.toContain("GROUP CHAT");
  });
});

describe("persona seeds", () => {
  it("Kai is well-formed", () => {
    expect(KAI_SEED.name).toBe("Kai");
    expect(KAI_SEED.personality.length).toBeGreaterThan(20);
  });

  it("starter personas each have a name and personality", () => {
    for (const s of STARTER_PERSONAS) {
      expect(s.name.length).toBeGreaterThan(0);
      expect(s.personality.length).toBeGreaterThan(20);
      expect(s.avatar.length).toBeGreaterThan(0);
    }
  });
});
