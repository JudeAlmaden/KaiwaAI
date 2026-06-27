import { describe, it, expect } from "vitest";
import { applyReview, progress } from "./srs";

const fresh = { easeFactor: 2.5, interval: 0, repetitions: 0 };

describe("srs (SM-2)", () => {
  it("a failing grade resets reps and schedules a short relearn", () => {
    const seasoned = { easeFactor: 2.5, interval: 10, repetitions: 4 };
    const r = applyReview(seasoned, 0);
    expect(r.repetitions).toBe(0);
    expect(r.interval).toBe(0);
    expect(r.status).toBe("learning");
    // comes back within the hour, not a full day
    expect(r.nextReview.getTime()).toBeLessThan(Date.now() + 60 * 60 * 1000);
  });

  it("first correct review schedules 1 day out", () => {
    const r = applyReview(fresh, 2);
    expect(r.repetitions).toBe(1);
    expect(r.interval).toBe(1);
    expect(r.status).toBe("learning");
  });

  it("second correct review schedules 6 days out", () => {
    const after1 = applyReview(fresh, 2);
    const after2 = applyReview(after1, 2);
    expect(after2.repetitions).toBe(2);
    expect(after2.interval).toBe(6);
  });

  it("graduates to known after enough reps and a long interval", () => {
    let s = applyReview(fresh, 3);
    for (let i = 0; i < 4; i++) s = applyReview(s, 3); // repeated Easy
    expect(s.status).toBe("known");
    expect(s.interval).toBeGreaterThanOrEqual(21);
  });

  it("ease factor never drops below 1.3", () => {
    let s = applyReview(fresh, 1);
    for (let i = 0; i < 9; i++) s = applyReview(s, 1); // repeated Hard
    expect(s.easeFactor).toBeGreaterThanOrEqual(1.3);
  });

  it("progress is 0 for a fresh card and 1 for a mastered one", () => {
    expect(progress(fresh)).toBe(0);
    expect(progress({ easeFactor: 2.5, interval: 30, repetitions: 5 })).toBe(1);
  });
});
