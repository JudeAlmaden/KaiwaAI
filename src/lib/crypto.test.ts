import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  // 32 bytes, base64 — required by the AES-256-GCM helper.
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 7).toString("base64");
});

describe("crypto (AES-256-GCM)", () => {
  it("round-trips a secret", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    const secret = "AIzaSy-not-a-real-key-1234567890";
    const enc = encryptSecret(secret);
    expect(enc).not.toContain(secret); // ciphertext, not plaintext
    expect(enc.split(".")).toHaveLength(3); // iv.tag.data
    expect(decryptSecret(enc)).toBe(secret);
  });

  it("produces a different ciphertext each time (random IV)", async () => {
    const { encryptSecret } = await import("./crypto");
    expect(encryptSecret("same")).not.toBe(encryptSecret("same"));
  });

  it("rejects a tampered payload", async () => {
    const { encryptSecret, decryptSecret } = await import("./crypto");
    const enc = encryptSecret("hello");
    const [iv, tag, data] = enc.split(".");
    // flip a byte in the ciphertext
    const bad = Buffer.from(data, "base64");
    bad[0] ^= 0xff;
    const tampered = [iv, tag, bad.toString("base64")].join(".");
    expect(() => decryptSecret(tampered)).toThrow();
  });

  it("throws on a malformed payload", async () => {
    const { decryptSecret } = await import("./crypto");
    expect(() => decryptSecret("not-valid")).toThrow();
  });
});
