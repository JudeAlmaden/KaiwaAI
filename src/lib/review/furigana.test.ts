import { describe, it, expect } from "vitest";
import { resolveShowFurigana } from "./furigana";
import type { FuriganaMode } from "./types";

/** Regression: Daily Quest sessions (studyMode=due) are composed mostly of
 * maintenance-pool cards, so "Always" must show furigana on them too. */
describe("resolveShowFurigana — regression (reported bug)", () => {
  it("always: shows furigana on maintenance-pool cards (Daily Quest)", () => {
    expect(
      resolveShowFurigana("always", { status: "learning", _pool: "maintenance" })
    ).toBe(true);
    expect(resolveShowFurigana("always", { _pool: "maintenance" })).toBe(true);
  });
});

describe("resolveShowFurigana — mode × status × pool matrix", () => {
  const cases: {
    mode: FuriganaMode;
    card: { status?: "new" | "learning" | "known"; _pool?: "active" | "maintenance" };
    expected: boolean;
  }[] = [
    // always: unconditional
    { mode: "always", card: { status: "new", _pool: "active" }, expected: true },
    { mode: "always", card: { status: "learning", _pool: "active" }, expected: true },
    { mode: "always", card: { status: "known", _pool: "active" }, expected: true },
    { mode: "always", card: { status: "learning", _pool: "maintenance" }, expected: true },
    { mode: "always", card: { status: "known", _pool: "maintenance" }, expected: true },
    { mode: "always", card: {}, expected: true },

    // never: unconditional
    { mode: "never", card: { status: "new", _pool: "active" }, expected: false },
    { mode: "never", card: { status: "learning", _pool: "active" }, expected: false },
    { mode: "never", card: { status: "known", _pool: "active" }, expected: false },
    { mode: "never", card: { status: "learning", _pool: "maintenance" }, expected: false },
    { mode: "never", card: {}, expected: false },

    // learning_only ("Smart"): show while learning, hide once known / in retention
    { mode: "learning_only", card: { status: "new", _pool: "active" }, expected: true },
    { mode: "learning_only", card: { status: "learning", _pool: "active" }, expected: true },
    { mode: "learning_only", card: { status: "known", _pool: "active" }, expected: false },
    { mode: "learning_only", card: { status: "learning", _pool: "maintenance" }, expected: false },
    { mode: "learning_only", card: { status: "known", _pool: "maintenance" }, expected: false },
    { mode: "learning_only", card: {}, expected: true }, // no status/pool → treated as learning
  ];

  for (const { mode, card, expected } of cases) {
    it(`${mode} + status=${card.status ?? "—"} + pool=${card._pool ?? "—"} → ${expected}`, () => {
      expect(resolveShowFurigana(mode, card)).toBe(expected);
    });
  }
});
