import { describe, it, expect } from "vitest";
import { truncateReplyPreview, replyIndicatorLabel } from "./reply-preview";

describe("truncateReplyPreview", () => {
  it("leaves short text alone", () => {
    expect(truncateReplyPreview("hello")).toBe("hello");
  });

  it("truncates long text with ellipsis", () => {
    const long = "あ".repeat(120);
    const out = truncateReplyPreview(long, 100);
    expect([...out.replace(/…$/, "")].length).toBe(100);
    expect(out.endsWith("…")).toBe(true);
  });

  it("collapses whitespace", () => {
    expect(truncateReplyPreview("a   b\nc")).toBe("a b c");
  });
});

describe("replyIndicatorLabel", () => {
  it("you → yourself", () => {
    expect(
      replyIndicatorLabel({
        isMe: true,
        senderName: "Jude",
        replyTo: { senderName: "Jude", isMe: true },
      })
    ).toBe("You replied to yourself");
  });

  it("you → other", () => {
    expect(
      replyIndicatorLabel({
        isMe: true,
        senderName: "Jude",
        replyTo: { senderName: "Kai", isMe: false },
      })
    ).toBe("You replied to Kai");
  });

  it("other → you", () => {
    expect(
      replyIndicatorLabel({
        isMe: false,
        senderName: "Kai",
        replyTo: { senderName: "Jude", isMe: true },
      })
    ).toBe("Kai replied to you");
  });

  it("other → other", () => {
    expect(
      replyIndicatorLabel({
        isMe: false,
        senderName: "Kai",
        replyTo: { senderName: "Sam", isMe: false },
      })
    ).toBe("Kai replied to Sam");
  });
});
