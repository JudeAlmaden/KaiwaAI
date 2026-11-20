import { describe, expect, it } from "vitest";
import { normalizePersonaRole } from "./persona-role";

const base = { blurb: "", avatar: "🦊", mine: false };

describe("normalizePersonaRole", () => {
  it("keeps an explicit kind", () => {
    expect(
      normalizePersonaRole({ ...base, name: "Kai", builtin: true, kind: "kai" })
    ).toMatchObject({ kind: "kai", label: null });
    expect(
      normalizePersonaRole({
        ...base,
        name: "Hana",
        builtin: true,
        kind: "kai_mode",
        label: "Calm",
      })
    ).toMatchObject({ kind: "kai_mode", label: "Calm" });
  });

  it("derives roles for rows cached before the kind column existed", () => {
    expect(
      normalizePersonaRole({ ...base, name: "Kai", builtin: true })
    ).toMatchObject({ kind: "kai" });
    expect(
      normalizePersonaRole({ ...base, name: "Hana", builtin: true })
    ).toMatchObject({ kind: "kai_mode", label: "Calm" });
    expect(
      normalizePersonaRole({ ...base, name: "Riku", builtin: true })
    ).toMatchObject({ kind: "kai_mode", label: "Playful" });
    expect(
      normalizePersonaRole({ ...base, name: "Sora", builtin: true })
    ).toMatchObject({ kind: "kai_mode", label: "Thoughtful" });
  });

  it("treats a user's own persona as custom, even if named like an attitude", () => {
    expect(
      normalizePersonaRole({ ...base, name: "Hana", builtin: false })
    ).toMatchObject({ kind: "custom" });
  });
});
