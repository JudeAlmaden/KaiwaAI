export class RateLimiter {
  private store = new Map<string, number[]>();

  constructor(
    private limit: number,
    private windowMs: number
  ) {
    if (typeof setInterval !== "undefined") {
      // Periodic cleanup to prevent memory bloat
      const interval = setInterval(() => this.cleanup(), this.windowMs * 2);
      // Unref the timer so it doesn't block Node.js from exiting in tests
      if (interval && typeof interval.unref === "function") {
        interval.unref();
      }
    }
  }

  public isRateLimited(key: string): boolean {
    const now = Date.now();
    const timestamps = this.store.get(key) || [];
    const windowStart = now - this.windowMs;
    
    // Keep only timestamps within the active sliding window
    const active = timestamps.filter((t) => t > windowStart);

    if (active.length >= this.limit) {
      this.store.set(key, active);
      return true;
    }

    active.push(now);
    this.store.set(key, active);
    return false;
  }

  private cleanup() {
    const now = Date.now();
    const windowStart = now - this.windowMs;
    for (const [key, timestamps] of this.store.entries()) {
      const active = timestamps.filter((t) => t > windowStart);
      if (active.length === 0) {
        this.store.delete(key);
      } else {
        this.store.set(key, active);
      }
    }
  }

  // Helper for testing to manually clean up or reset
  public reset(key?: string) {
    if (key) {
      this.store.delete(key);
    } else {
      this.store.clear();
    }
  }
}

const globalForLimiter = globalThis as unknown as {
  messageLimiter: RateLimiter | undefined;
  flashcardLimiter: RateLimiter | undefined;
  lookupLimiter: RateLimiter | undefined;
};

export const messageLimiter =
  globalForLimiter.messageLimiter ?? new RateLimiter(5, 10000); // 5 messages per 10 seconds

export const flashcardLimiter =
  globalForLimiter.flashcardLimiter ?? new RateLimiter(10, 60000); // 10 flashcards per minute

export const lookupLimiter =
  globalForLimiter.lookupLimiter ?? new RateLimiter(30, 60000); // 30 dictionary lookups per minute

if (process.env.NODE_ENV !== "production") {
  globalForLimiter.messageLimiter = messageLimiter;
  globalForLimiter.flashcardLimiter = flashcardLimiter;
  globalForLimiter.lookupLimiter = lookupLimiter;
}
