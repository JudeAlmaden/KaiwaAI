import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { RateLimiter } from "./rate-limiter";

describe("RateLimiter", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows requests under the limit", () => {
    const limiter = new RateLimiter(3, 1000); // 3 requests per 1 second
    
    expect(limiter.isRateLimited("user-1")).toBe(false);
    expect(limiter.isRateLimited("user-1")).toBe(false);
    expect(limiter.isRateLimited("user-1")).toBe(false);
  });

  it("blocks requests exceeding the limit", () => {
    const limiter = new RateLimiter(3, 1000); // 3 requests per 1 second
    
    expect(limiter.isRateLimited("user-1")).toBe(false);
    expect(limiter.isRateLimited("user-1")).toBe(false);
    expect(limiter.isRateLimited("user-1")).toBe(false);
    
    // 4th request in the same second should be rate limited
    expect(limiter.isRateLimited("user-1")).toBe(true);
  });

  it("resets rate limit after the window expires", () => {
    const limiter = new RateLimiter(2, 1000); // 2 requests per 1 second
    
    expect(limiter.isRateLimited("user-1")).toBe(false);
    expect(limiter.isRateLimited("user-1")).toBe(false);
    expect(limiter.isRateLimited("user-1")).toBe(true);
    
    // Fast-forward time by 1.1 seconds (window is 1000ms)
    vi.advanceTimersByTime(1100);
    
    // Should be allowed again
    expect(limiter.isRateLimited("user-1")).toBe(false);
  });

  it("handles sliding window progression correctly", () => {
    const limiter = new RateLimiter(2, 1000); // 2 requests per 1 second
    
    // Request at t = 0
    expect(limiter.isRateLimited("user-1")).toBe(false);
    
    // Fast-forward 600ms
    vi.advanceTimersByTime(600);
    // Request at t = 600ms
    expect(limiter.isRateLimited("user-1")).toBe(false);
    
    // Request at t = 600ms exceeds limit (limit is 2)
    expect(limiter.isRateLimited("user-1")).toBe(true);
    
    // Fast-forward 500ms (t is now 1100ms)
    // The first request (at t=0) has fallen out of the 1000ms window,
    // but the second request (at t=600) is still in the window.
    vi.advanceTimersByTime(500);
    
    // Can make 1 more request
    expect(limiter.isRateLimited("user-1")).toBe(false);
    // But not another one
    expect(limiter.isRateLimited("user-1")).toBe(true);
  });

  it("isolates limits between different keys", () => {
    const limiter = new RateLimiter(1, 1000);
    
    expect(limiter.isRateLimited("user-1")).toBe(false);
    expect(limiter.isRateLimited("user-1")).toBe(true);
    
    // Different user should not be rate limited
    expect(limiter.isRateLimited("user-2")).toBe(false);
  });
});
