/**
 * The conversation menu has to hold three very different surfaces: a 1:1
 * persona chat, a friend DM, and a group. This model keeps those decisions in
 * one testable place so a friend DM cannot accidentally inherit group or Kai
 * actions (and vice versa).
 */
export type ConversationMemoryEntry =
  | { scope: "group"; title: string; description: string }
  | { scope: "chat"; title: string; description: string }
  | { scope: "persona"; title: string; description: string };

export type ConversationMenuModel = {
  isGroup: boolean;
  isDm: boolean;
  showGroupSettings: boolean;
  showKaiAttitude: boolean;
  showMuteKai: boolean;
  showQuest: boolean;
  canClear: boolean;
  /** Delete removes for everyone (owner); hide only removes it from your list. */
  deleteMode: "delete" | "hide";
  memory: ConversationMemoryEntry;
};

export function conversationMenuModel({
  kind,
  isOwner,
  hasPersona,
  personaKind,
}: {
  kind: string;
  isOwner: boolean;
  hasPersona: boolean;
  personaKind?: string | null;
}): ConversationMenuModel {
  const isGroup = kind === "group";
  const isDm = kind === "dm";
  const isPersona = kind === "persona";
  const isKai = isPersona && personaKind === "kai";

  return {
    isGroup,
    isDm,
    showGroupSettings: isGroup,
    showKaiAttitude: isKai,
    showMuteKai: isKai,
    // A group quest is Kai's; a 1:1 quest works for any persona.
    showQuest: isPersona ? hasPersona : isGroup && hasPersona && personaKind === "kai",
    canClear: !isGroup || isOwner,
    deleteMode: isOwner ? "delete" : "hide",
    memory: isGroup
      ? {
          scope: "group",
          title: "Group memory",
          description: "What Kai remembers from this group — only you can see it.",
        }
      : isDm
        ? {
            scope: "chat",
            title: "Chat memory",
            description: "Notes from this conversation — only you can see them.",
          }
        : {
            scope: "persona",
            title: "Open full diary",
            description:
              "All memories across personas — different from the quick profile above.",
          },
  };
}
