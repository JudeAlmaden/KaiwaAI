export type KanjiEntry = {
  id: string;
  order: number;
  kanjiId: string;
  character: string;
  heisigNumber?: number | null;
  heisigKeyword?: string | null;
  customMeaning?: string | null;
  mnemonic?: string | null;
  primitives?: string[];
  meanings: string[];
  readingsOn?: string[];
  readingsKun?: string[];
  strokes: number;
  isAdded: boolean;
  status: string | null;
};

export type Folder = {
  id: string;
  name: string;
  description?: string | null;
  images?: string[];
  imageCount?: number;
  thumbnail?: string | null;
  kind: string;
  lessonNumber?: number | null;
  order: number;
  createdAt: string;
  total: number;
  added: number;
  known: number;
  completionPct: number;
  entries: KanjiEntry[];
};

export type KanjiCard = {
  id: string;
  character: string;
  meanings: string[];
  readingsOn: string[];
  readingsKun: string[];
  strokes: number;
  masteryPercent: number;
  inReviews: boolean;
  heisigNumber?: number | null;
  heisigLesson?: number | null;
  heisigKeyword?: string | null;
  primitives?: string[];
  hasMnemonic?: boolean;
  learningStatus?: "new" | "learning" | "known" | null;
  groupIds?: string[];
  groups?: { id: string; name: string; lessonNumber?: number | null }[];
};

export type ViewMode = "folders" | "all" | "coverage";

export type FilterMode = "All" | "Learning" | "Known";

export type FolderSort = "lesson" | "count" | "completion" | "recent";

export type KanjiSort = "heisig" | "strokes" | "mastery" | "recent";
