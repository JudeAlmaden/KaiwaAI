import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  CELEBRATION_KEY,
  MOOD_PORTRAIT,
  consumeCelebration,
  greetingForHour,
  isLateNight,
  kaiLineFor,
  nextIdleSwayDelayMs,
  roomMoodFor,
  transientLineFor,
} from "./kai-mood";

const stats = (overrides: Partial<{ dueNow: number; streak: number; activeToday: boolean }> = {}) => ({
  dueNow: 3,
  streak: 1,
  activeToday: true,
  ...overrides,
});

describe("isLateNight", () => {
  it("flags 22:00–05:00 as night", () => {
    expect(isLateNight(23)).toBe(true);
    expect(isLateNight(2)).toBe(true);
    expect(isLateNight(4)).toBe(true);
  });
  it("keeps daytime and evening edges awake", () => {
    expect(isLateNight(5)).toBe(false);
    expect(isLateNight(12)).toBe(false);
    expect(isLateNight(21)).toBe(false);
  });
});

describe("roomMoodFor", () => {
  it("is idle by default in daytime", () => {
    expect(roomMoodFor(stats(), 12)).toBe("idle");
  });
  it("is idle with no stats in daytime", () => {
    expect(roomMoodFor(null, 12)).toBe("idle");
  });
  it("gets sleepy at night regardless of stats", () => {
    expect(roomMoodFor(stats({ dueNow: 99 }), 23)).toBe("sleepy");
  });
  it("worries when many cards are due", () => {
    expect(roomMoodFor(stats({ dueNow: 16 }), 12)).toBe("worried");
  });
  it("does not worry at exactly 15 due", () => {
    expect(roomMoodFor(stats({ dueNow: 15 }), 12)).toBe("idle");
  });
  it("is proud on an active 3+ streak with nothing worrying", () => {
    expect(roomMoodFor(stats({ streak: 3, activeToday: true }), 12)).toBe("proud");
  });
  it("is not proud when today is not logged yet", () => {
    expect(roomMoodFor(stats({ streak: 10, activeToday: false }), 12)).toBe("idle");
  });
  it("is lapsed when the streak has died", () => {
    expect(roomMoodFor(stats({ streak: 0 }), 12)).toBe("lapsed");
  });
});

describe("kaiLineFor", () => {
  it("handles a loading state", () => {
    expect(kaiLineFor("idle", null)).toBe("Loading your progress…");
  });
  it("uses singular cards in worried lines", () => {
    const line = kaiLineFor("worried", stats({ dueNow: 1 }) as never);
    expect(line).toBe("1 card is piling up! Even 10 will shrink the pile.");
  });
  it("pluralizes review counts in idle lines", () => {
    const line = kaiLineFor("idle", { dueNow: 2, progressLevel: "Beginner" } as never);
    expect(line).toBe("2 reviews ready when you are!");
  });
  it("keeps sleepy lines calm", () => {
    const line = kaiLineFor("sleepy", stats({ dueNow: 0 }) as never);
    expect(line).toContain("So sleepy");
  });
});

describe("transient lines and portrait tables", () => {
  it("greets a named user in Japanese", () => {
    expect(transientLineFor("greeting", "Jude")).toEqual({
      line: "Welcome back, Judeさん!",
      portrait: "greeting_wave",
    });
  });
  it("maps pokes to the joyful portrait", () => {
    expect(transientLineFor("poke").portrait).toBe("sparkling_joy");
  });
  it("has a portrait for every mood", () => {
    for (const p of Object.values(MOOD_PORTRAIT)) expect(p).toMatch(/^[a-z_]+$/);
  });
  it("keeps the base moods on distinct scenes", () => {
    const base = ["idle", "worried", "sleepy", "proud", "lapsed"] as const;
    const scenes = base.map((m) => MOOD_PORTRAIT[m]);
    expect(new Set(scenes).size).toBeGreaterThanOrEqual(4);
  });
});

describe("greetingForHour", () => {
  it("matches the /home greeting table", () => {
    expect(greetingForHour(3)).toBe("おやすみなさい");
    expect(greetingForHour(8)).toBe("おはよう");
    expect(greetingForHour(14)).toBe("こんにちは");
    expect(greetingForHour(20)).toBe("こんばんは");
  });
});

describe("nextIdleSwayDelayMs", () => {
  it("is deterministic for a fixed rng", () => {
    expect(nextIdleSwayDelayMs(() => 0.5)).toBe(nextIdleSwayDelayMs(() => 0.5));
  });
  it("stays inside the 2.6–5.8s window", () => {
    for (let i = 0; i < 50; i++) {
      const d = nextIdleSwayDelayMs();
      expect(d).toBeGreaterThanOrEqual(2600);
      expect(d).toBeLessThan(5800);
    }
  });
});

describe("consumeCelebration", () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    vi.stubGlobal("sessionStorage", {
      getItem: (k: string) => (store.has(k) ? store.get(k)! : null),
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
    });
  });

  it("consumes a fresh flag exactly once", () => {
    sessionStorage.setItem(CELEBRATION_KEY, String(Date.now()));
    expect(consumeCelebration()).toBe(true);
    expect(consumeCelebration()).toBe(false);
  });
  it("ignores expired or missing flags", () => {
    sessionStorage.removeItem(CELEBRATION_KEY);
    expect(consumeCelebration()).toBe(false);
    sessionStorage.setItem(CELEBRATION_KEY, String(Date.now() - 120_000));
    expect(consumeCelebration()).toBe(false);
  });
});
