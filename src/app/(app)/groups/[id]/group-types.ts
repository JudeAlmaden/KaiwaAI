export type GMsg = {
  id: string;
  senderName: string;
  senderKind: string;
  content: string;
  english?: string | null;
  tokens?: string | null;
  correction?: string | null;
  userCorrection?: string | null; // AI correction for user's Japanese
  isMe: boolean;
  createdAt: string;
};

export type Member = {
  id?: string;
  kind: string;
  status?: string;
  userId?: string | null;
  /** Per-group display name; `name` already resolves to it when set. */
  nickname?: string | null;
  name?: string | null;
  avatar?: string | null;
  isMe?: boolean;
};

export type PersonaInfo = {
  id: string;
  name: string;
  avatar: string;
  personality: string | null;
  /** "kai" | "kai_mode" | "custom" — only Kai has switchable attitudes. */
  kind: string;
};

export type KaiModeInfo = {
  id: string;
  label: string;
  avatar: string;
};

export type GroupInfo = {
  id: string;
  name: string;
  kind: string;
  isOwner: boolean;
  hasKey: boolean;
  clientGenerated: boolean;
  persona: PersonaInfo | null;
  /** The Kai attitude this conversation owns; null = Kai's base voice. */
  activeMode?: KaiModeInfo | null;
  /** Attitudes the owner can switch between (Kai chats only). */
  kaiModes?: KaiModeInfo[];
  members: Member[];
  mood?: string;
};
