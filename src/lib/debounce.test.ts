import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { debounce } from "./debounce";

describe("debounce helper", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("delays execution until wait time has elapsed", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced("call 1");
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(199);
    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(1);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("call 1");
  });

  it("resets the timer on rapid consecutive calls", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced("first");
    vi.advanceTimersByTime(100);

    debounced("second");
    vi.advanceTimersByTime(100);

    debounced("third");
    vi.advanceTimersByTime(100);

    expect(fn).not.toHaveBeenCalled();

    vi.advanceTimersByTime(100);
    expect(fn).toHaveBeenCalledTimes(1);
    expect(fn).toHaveBeenCalledWith("third");
  });

  it("cancels pending execution when cancel is called", () => {
    const fn = vi.fn();
    const debounced = debounce(fn, 200);

    debounced("will be cancelled");
    vi.advanceTimersByTime(100);

    debounced.cancel();
    vi.advanceTimersByTime(200);

    expect(fn).not.toHaveBeenCalled();
  });
});
