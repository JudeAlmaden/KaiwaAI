export type ComponentContext = {
  glyph: string;
  keyword: string | null;
  meanings: string[];
  heisigNumber: number | null;
  inDictionary: boolean;
  userMnemonic?: string | null;
};

export type KanjiContext = {
  character: string;
  keyword: string;
  meanings: string[];
  heisigNumber: number | null;
  primitives: string[];
  components: ComponentContext[];
};

export type ComponentRow = {
  character: string;
  heisigKeyword: string | null;
  heisigNumber: number | null;
  meanings: string;
};

export type UserComponentOverride = {
  kanji: { character: string };
  customMeaning: string | null;
  mnemonic: string | null;
};
