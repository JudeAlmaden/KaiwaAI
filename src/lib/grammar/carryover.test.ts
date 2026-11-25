import { describe, expect, it } from "vitest";
import {
  MAX_UNANSWERED_LOADS,
  clearCurrent,
  decodeCarryOver,
  emptyCarryOver,
  encodeCarryOver,
  noteLoaded,
  resolveCarryOver,
  setCurrent,
} from "./carryover";

const now = new Date("2026-11-25T09:00:00");
const ids = new Set(["m2-ga-3", "gen:猫:particle:particle-wa"]);

describe("construction carry-over", () => {
  it("starts empty and survives a round trip", () => {
    const empty = emptyCarryOver(now);
    expect(empty.current).toBeNull();
    expect(decodeCarryOver(null, now)).toEqual(empty);

    const saved = setCurrent(empty, "m2-ga-3", now);
    expect(decodeCarryOver(encodeCarryOver(saved), now)).toEqual(saved);
  });

  it("forgets yesterday", () => {
    const saved = setCurrent(emptyCarryOver(now), "m2-ga-3", now);
    const tomorrow = new Date("2026-11-26T09:00:00");
    expect(resolveCarryOver(decodeCarryOver(encodeCarryOver(saved), tomorrow), ids, tomorrow)).toBeNull();
  });

  it("ignores corrupt or foreign payloads", () => {
    expect(decodeCarryOver("{not json", now).current).toBeNull();
    expect(decodeCarryOver(JSON.stringify({ day: "1999-01-01", current: "x" }), now).current).toBeNull();
  });

  it("drops ids the rebuilt bank no longer has", () => {
    const saved = setCurrent(emptyCarryOver(now), "gen:削除:particle:particle-wa", now);
    expect(resolveCarryOver(saved, ids, now)).toBeNull();
  });

  it("serves the id that is still in the bank", () => {
    const saved = setCurrent(emptyCarryOver(now), "gen:猫:particle:particle-wa", now);
    expect(resolveCarryOver(saved, ids, now)).toBe("gen:猫:particle:particle-wa");
  });

  it("stops restoring an item nobody answers", () => {
    let saved = setCurrent(emptyCarryOver(now), "m2-ga-3", now);
    for (let load = 0; load < MAX_UNANSWERED_LOADS; load += 1) {
      expect(resolveCarryOver(saved, ids, now), `load ${load}`).toBe("m2-ga-3");
      saved = noteLoaded(saved, now);
    }
    expect(resolveCarryOver(saved, ids, now)).toBeNull();
  });

  it("clears the pointer once the exercise is answered", () => {
    const saved = clearCurrent(setCurrent(emptyCarryOver(now), "m2-ga-3", now), now);
    expect(saved.current).toBeNull();
    expect(resolveCarryOver(saved, ids, now)).toBeNull();
  });
});
