import { describe, expect, it } from "vitest";
import { conversationMenuModel } from "./conversation-menu";

describe("conversation menu model", () => {
  it("gives a friend DM only chat memory, clear and hide/delete", () => {
    const model = conversationMenuModel({
      kind: "dm",
      isOwner: false,
      hasPersona: false,
    });

    expect(model.isDm).toBe(true);
    expect(model.showGroupSettings).toBe(false);
    expect(model.showKaiAttitude).toBe(false);
    expect(model.showMuteKai).toBe(false);
    expect(model.showQuest).toBe(false);
    expect(model.canClear).toBe(true);
    expect(model.deleteMode).toBe("hide");
    expect(model.memory.scope).toBe("chat");
    expect(model.memory.title).toBe("Chat memory");
  });

  it("lets a DM owner delete the conversation for both people", () => {
    const model = conversationMenuModel({
      kind: "dm",
      isOwner: true,
      hasPersona: false,
    });
    expect(model.deleteMode).toBe("delete");
  });

  it("gives a group settings, group memory, and owner-only clearing", () => {
    const owner = conversationMenuModel({
      kind: "group",
      isOwner: true,
      hasPersona: true,
      personaKind: "kai",
    });
    expect(owner.showGroupSettings).toBe(true);
    expect(owner.showKaiAttitude).toBe(false);
    expect(owner.showMuteKai).toBe(false);
    expect(owner.showQuest).toBe(true);
    expect(owner.canClear).toBe(true);
    expect(owner.deleteMode).toBe("delete");
    expect(owner.memory.scope).toBe("group");

    const member = conversationMenuModel({
      kind: "group",
      isOwner: false,
      hasPersona: true,
      personaKind: "kai",
    });
    expect(member.canClear).toBe(false);
    expect(member.deleteMode).toBe("hide");
  });

  it("only offers Kai attitude and mute on a 1:1 Kai chat", () => {
    const kai = conversationMenuModel({
      kind: "persona",
      isOwner: true,
      hasPersona: true,
      personaKind: "kai",
    });
    expect(kai.showKaiAttitude).toBe(true);
    expect(kai.showMuteKai).toBe(true);
    expect(kai.showQuest).toBe(true);
    expect(kai.memory.scope).toBe("persona");

    const custom = conversationMenuModel({
      kind: "persona",
      isOwner: true,
      hasPersona: true,
      personaKind: "custom",
    });
    expect(custom.showKaiAttitude).toBe(false);
    expect(custom.showMuteKai).toBe(false);
    expect(custom.showQuest).toBe(true);
  });
});
