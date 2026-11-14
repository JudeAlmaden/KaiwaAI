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
  kind: string;
  name?: string | null;
  avatar?: string | null;
  isMe?: boolean;
};

export type PersonaInfo = {
  id: string;
  name: string;
  avatar: string;
  personality: string | null;
};

export type GroupInfo = {
  id: string;
  name: string;
  kind: string;
  isOwner: boolean;
  hasKey: boolean;
  clientGenerated: boolean;
  persona: PersonaInfo | null;
  members: Member[];
  mood?: string;
};
