import { describe, expect, it } from "vitest";
import {
  maintenanceTargetFor,
  mergeUniqueById,
  needsMaintenanceTopUp,
} from "./maintenance-window";

const card = (id: string, repetitions: number) => ({ id, repetitions });

describe("maintenanceTargetFor", () => {
  it("is half a balanced session, rounded like the composer", () => {
    expect(maintenanceTargetFor(10, 0.5)).toBe(5);
    expect(maintenanceTargetFor(20, 0.5)).toBe(10);
  });

  it("is zero when everything is new (reviews-only is the inverse)", () => {
    expect(maintenanceTargetFor(10, 1)).toBe(0);
    expect(maintenanceTargetFor(10, 0)).toBe(10);
  });
});

describe("needsMaintenanceTopUp", () => {
  it("flags a window that is entirely new cards", () => {
    const window = Array.from({ length: 40 }, (_, i) => card(`new-${i}`, 0));
    expect(needsMaintenanceTopUp(window, 10, 0.5)).toBe(true);
  });

  it("does not fetch when the window already covers the maintenance half", () => {
    const window = [
      ...Array.from({ length: 30 }, (_, i) => card(`new-${i}`, 0)),
      ...Array.from({ length: 6 }, (_, i) => card(`reviewed-${i}`, 4)),
    ];
    expect(needsMaintenanceTopUp(window, 10, 0.5)).toBe(false);
  });

  it("fetches when reviewed cards are present but too few", () => {
    const window = [
      ...Array.from({ length: 30 }, (_, i) => card(`new-${i}`, 0)),
      card("reviewed-1", 4),
    ];
    // 50/50 of 20 needs 10 maintenance cards; one is not enough.
    expect(needsMaintenanceTopUp(window, 20, 0.5)).toBe(true);
  });

  it("never fetches when the session is all active cards", () => {
    expect(needsMaintenanceTopUp([], 10, 1)).toBe(false);
  });

  it("always wants maintenance in reviews-only sessions", () => {
    expect(needsMaintenanceTopUp([card("new-1", 0)], 10, 0)).toBe(true);
  });
});

describe("mergeUniqueById", () => {
  it("keeps the window order and drops duplicates", () => {
    const merged = mergeUniqueById([card("a", 0), card("b", 3)], [card("b", 3), card("c", 5)]);
    expect(merged.map((c) => c.id)).toEqual(["a", "b", "c"]);
  });
});
