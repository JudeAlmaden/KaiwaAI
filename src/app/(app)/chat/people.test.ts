import { describe, expect, it } from "vitest";
import { pendingCount, personLabel, type FriendEntry, type Invite } from "./usePeople";

const entry = (friendshipId: string): FriendEntry => ({
  friendshipId,
  user: { id: `u-${friendshipId}`, name: null, email: "a@b.c" },
});

const invite: Invite = {
  memberId: "m1",
  groupName: "Study group",
  invitedBy: "Hana",
  persona: null,
  memberCount: 3,
};

describe("people helpers", () => {
  it("counts friend requests and group invites as one pending number", () => {
    expect(pendingCount([], [])).toBe(0);
    expect(pendingCount([entry("1")], [])).toBe(1);
    expect(pendingCount([entry("1"), entry("2")], [invite])).toBe(3);
  });

  it("labels a person by name, falling back to email", () => {
    expect(personLabel({ name: "Hana", email: "hana@example.com" })).toBe("Hana");
    expect(personLabel({ name: "  ", email: "hana@example.com" })).toBe(
      "hana@example.com"
    );
    expect(personLabel({ name: null, email: "hana@example.com" })).toBe(
      "hana@example.com"
    );
  });
});
