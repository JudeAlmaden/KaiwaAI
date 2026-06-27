import { describe, it, expect, beforeAll } from "vitest";

beforeAll(() => {
  process.env.ENCRYPTION_KEY = Buffer.alloc(32, 9).toString("base64");
});

describe("decodeKeys (server-side key storage)", () => {
  it("decodes a new-format encrypted JSON array of keys", async () => {
    const { encryptSecret } = await import("./crypto");
    const { decodeKeys } = await import("./gemini-server");
    const enc = encryptSecret(JSON.stringify(["KEY_A", "KEY_B", "KEY_C"]));
    expect(decodeKeys(enc)).toEqual(["KEY_A", "KEY_B", "KEY_C"]);
  });

  it("decodes a legacy single-key string (backward compatible)", async () => {
    const { encryptSecret } = await import("./crypto");
    const { decodeKeys } = await import("./gemini-server");
    const enc = encryptSecret("LEGACY_SINGLE_KEY");
    expect(decodeKeys(enc)).toEqual(["LEGACY_SINGLE_KEY"]);
  });

  it("filters out empty entries", async () => {
    const { encryptSecret } = await import("./crypto");
    const { decodeKeys } = await import("./gemini-server");
    const enc = encryptSecret(JSON.stringify(["KEY_A", "", "KEY_B"]));
    expect(decodeKeys(enc)).toEqual(["KEY_A", "KEY_B"]);
  });
});
