export type KanjiDetail = {
  id: string;
  character: string;
  strokes: number;
  grade: number | null;
  frequency: number | null;
  jlptLevel: number | null;
  heisigNumber?: number | null;
  heisigLesson?: number | null;
  heisigKeyword?: string | null;
  customMeaning?: string | null;
  meanings: string[];
  readingsOn: string[];
  readingsKun: string[];
  radicals: string[];
  wkLevel: number | null;
  mnemonic?: string | null;
  inReviews?: boolean;
  srsStage?: number;
};

export type Folder = {
  id: string;
  name: string;
  lessonNumber: number | null;
  kind: string;
  total: number;
};
