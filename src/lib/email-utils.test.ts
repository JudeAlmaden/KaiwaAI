import { describe, it, expect } from "vitest";
import { looksLikeEmail } from "./email-utils";

describe("looksLikeEmail", () => {
  it("returns true for valid email formats", () => {
    expect(looksLikeEmail("user@example.com")).toBe(true);
    expect(looksLikeEmail("  test.name+tag@sub.domain.co  ")).toBe(true);
    expect(looksLikeEmail("hana@kaiwa.test")).toBe(true);
  });

  it("returns false for invalid formats", () => {
    expect(looksLikeEmail("")).toBe(false);
    expect(looksLikeEmail("plainaddress")).toBe(false);
    expect(looksLikeEmail("user@")).toBe(false);
    expect(looksLikeEmail("@example.com")).toBe(false);
    expect(looksLikeEmail("user@domain")).toBe(false);
    expect(looksLikeEmail("user @ domain.com")).toBe(false);
  });
});
