import { describe, expect, it } from "vitest";
import {
  BASIC_PARTICLES,
  COMMON_PARTICLES,
  buildConjugationRound,
  buildTranslationRound,
  containsTarget,
  evolveTasksFor,
  hasPredicate,
  isTranslationCorrect,
  missingTargets,
  normalizeAnswer,
  pickSentenceTargets,
  remixSituationFor,
  sameSentence,
  sentencePatternFor,
  supportsTranslationSentence,
  targetGroup,
  usedParticles,
} from "./sentence-task";

const cards = [
  { id: "1", word: "飲む", reading: "のむ", meaning: "to drink", partOfSpeech: "verb", verbType: "godan" },
  { id: "2", word: "猫", reading: "ねこ", meaning: "cat", partOfSpeech: "noun" },
  { id: "3", word: "静か", reading: "しずか", meaning: "quiet", partOfSpeech: "adjective", adjectiveType: "na_adjective" },
  { id: "4", word: "水", reading: "みず", meaning: "water", partOfSpeech: "noun" },
];

const target = (
  word: string,
  partOfSpeech: string,
  reading = "",
  extra: { meaning?: string; verbType?: string; adjectiveType?: string } = {}
) => ({
  id: word,
  word,
  reading,
  meaning: extra.meaning ?? "",
  partOfSpeech,
  ...extra,
});

const verb = (word: string, reading: string, verbType: string) =>
  target(word, "verb", reading, { verbType });

describe("pickSentenceTargets", () => {
  it("takes the first usable word", () => {
    expect(pickSentenceTargets(cards).map((item) => item.word)).toEqual(["飲む"]);
  });

  it("keeps stored forms and word class", () => {
    const [picked] = pickSentenceTargets([
      {
        ...cards[0],
        forms: [{ form: "飲みます", reading: "のみます", formType: "masu" }],
      },
    ]);
    expect(picked.verbType).toBe("godan");
    expect(picked.forms).toEqual([{ form: "飲みます", reading: "のみます", formType: "masu" }]);
  });

  it("skips unknown and duplicate surface forms", () => {
    const targets = pickSentenceTargets(
      [
        { id: "a", word: "Unknown", meaning: "x" },
        { id: "b", word: "猫", meaning: "cat" },
        { id: "c", word: "猫", meaning: "cat again" },
        { id: "d", word: "水", meaning: "water" },
      ],
      2
    );
    expect(targets.map((item) => item.word)).toEqual(["猫", "水"]);
  });

  it("returns an empty list when no cards are due", () => {
    expect(pickSentenceTargets([])).toEqual([]);
  });
});

describe("containsTarget / missingTargets", () => {
  const kanji = target("五", "noun", "ご");
  const week = target("今週", "noun", "こんしゅう");
  const tired = verb("疲れる", "つかれる", "ichidan");

  it("accepts the kanji or its kana reading", () => {
    expect(containsTarget("ご は 数字 です", kanji)).toBe(true);
    expect(containsTarget("今週は忙しいです", week)).toBe(true);
    expect(containsTarget("こんしゅうは忙しいです", week)).toBe(true);
  });

  it("accepts any SRS form of the target", () => {
    expect(containsTarget("わたしは疲れた", tired)).toBe(true);
    expect(containsTarget("わたしはつかれました", tired)).toBe(true);
    expect(containsTarget("わたしは疲れない", tired)).toBe(true);
    expect(containsTarget("わたしは疲た", tired)).toBe(false);
  });

  it("does not find a short reading inside another word", () => {
    expect(containsTarget("りんごを食べます", kanji)).toBe(false);
    expect(missingTargets("水を飲む", [target("猫", "noun", "ねこ")])).toHaveLength(1);
  });
});

describe("hasPredicate", () => {
  it("rejects fragments", () => {
    expect(hasPredicate("今週は")).toBe(false);
    expect(hasPredicate("こんしゅうました")).toBe(false);
    expect(hasPredicate("今週")).toBe(false);
  });

  it("accepts finished sentences", () => {
    expect(hasPredicate("今週は忙しいです")).toBe(true);
    expect(hasPredicate("今週は忙しい")).toBe(true);
    expect(hasPredicate("このりんごはおいしい")).toBe(true);
    expect(hasPredicate("水が飲みたい")).toBe(true);
    expect(hasPredicate("水を飲みます")).toBe(true);
    expect(hasPredicate("水を飲みますか")).toBe(true);
    expect(hasPredicate("わたしは疲れた")).toBe(true);
    expect(hasPredicate("猫だ")).toBe(true);
  });
});

describe("sentencePatternFor", () => {
  it("does not assume a transitive verb", () => {
    expect(sentencePatternFor(verb("行く", "いく", "godan"))).toMatchObject({
      particle: null,
      skeleton: "＿＿ ＿＿ 行く",
    });
  });

  it("uses は and です for nouns and adjectives", () => {
    expect(sentencePatternFor(target("猫", "noun")).particle).toBe("は");
    expect(sentencePatternFor(target("静か", "adjective")).skeleton).toBe("＿＿ は 静か です");
  });
});

describe("evolveTasksFor", () => {
  const task = (word: string, reading: string, pos: string, extra: { verbType?: string; adjectiveType?: string }, id: string) =>
    evolveTasksFor(target(word, pos, reading, extra)).find((item) => item.id === id)!;

  it("accepts plain and polite past for a verb", () => {
    const past = task("疲れる", "つかれる", "verb", { verbType: "ichidan" }, "past");
    expect(past.test("わたしは疲れた")).toBe(true);
    expect(past.test("わたしは疲れました")).toBe(true);
    expect(past.test("わたしは疲れる")).toBe(false);
  });

  it("does not offer ました for a noun", () => {
    const past = task("今週", "こんしゅう", "noun", {}, "past");
    expect(past.test("今週は忙しかったです")).toBe(false);
    expect(past.test("こんしゅうました")).toBe(false);
    expect(past.test("今週は暇でした")).toBe(true);
  });

  it("offers the right negative forms per class", () => {
    expect(task("今週", "こんしゅう", "noun", {}, "negative").test("今週は暇じゃないです")).toBe(true);
    expect(task("忙しい", "いそがしい", "adjective", { adjectiveType: "i_adjective" }, "negative").test("忙しくないです")).toBe(true);
    expect(task("飲む", "のむ", "verb", { verbType: "godan" }, "negative").test("水を飲みません")).toBe(true);
  });

  it("uses ました for polite verbs and でした for nouns", () => {
    expect(task("飲む", "のむ", "verb", { verbType: "godan" }, "past").test("水を飲みました")).toBe(true);
    expect(task("今週", "こんしゅう", "noun", {}, "question").test("今週は暇ですか")).toBe(true);
    expect(task("今週", "こんしゅう", "noun", {}, "question").test("今週は暇でしたか")).toBe(true);
  });
});

describe("sameSentence / usedParticles / remix", () => {
  it("normalizes punctuation and spaces when comparing", () => {
    expect(sameSentence("猫は水を飲む。", "猫は水を飲む")).toBe(true);
    expect(sameSentence("猫は水を飲む", "猫が水を飲む")).toBe(false);
  });

  it("accepts particles beyond the basic five", () => {
    expect(usedParticles("学校へ行きます")).toEqual(["へ"]);
    expect(usedParticles("私の本です")).toEqual(["の"]);
    expect(usedParticles("これは私の本です")).toEqual(["は", "の"]);
    expect(usedParticles("静かでした")).toEqual([]);
    expect(COMMON_PARTICLES).toContain("から");
    expect(COMMON_PARTICLES).toContain("の");
    expect(BASIC_PARTICLES).toEqual(["は", "が", "を", "に", "で"]);
  });

  it("gives POS-specific remix situations", () => {
    expect(remixSituationFor(verb("飲む", "のむ", "godan"))).toContain("yesterday");
    expect(remixSituationFor(target("静か", "adjective"))).toContain("Describe");
  });
});

describe("translate this sentence", () => {
  it("groups words by what sentence frame they can take", () => {
    expect(targetGroup(target("猫", "noun"))).toBe("noun");
    expect(targetGroup(verb("飲む", "のむ", "godan"))).toBe("verb");
    expect(targetGroup(target("高い", "adjective", "たかい", { adjectiveType: "i_adjective" }))).toBe("i-adj");
    expect(targetGroup(target("静か", "adjective", "しずか", { adjectiveType: "na_adjective" }))).toBe("na-adj");
    expect(targetGroup(target("？", "particle"))).toBe("other");
  });

  it("builds a noun sentence with kana and kanji accepted", () => {
    const round = buildTranslationRound(target("猫", "noun", "ねこ", { meaning: "cat" }), 0);
    expect(round.prompt).toBe("That's the cat.");
    expect(round.answer).toBe("それはねこです。");
    expect(round.accepted).toContain("それは猫です。");
    expect(isTranslationCorrect("それは猫です", round)).toBe(true);
    expect(isTranslationCorrect("それはねこでした。", round)).toBe(false);
    expect(buildTranslationRound(target("猫", "noun", "ねこ", { meaning: "cat" }), 1).prompt).toBe(
      "That isn't the cat."
    );
  });

  it("builds verb, い-adjective and な-adjective frames", () => {
    const drink = verb("飲む", "のむ", "godan");
    drink.meaning = "to drink";
    const verbRound = buildTranslationRound(drink, 0);
    expect(verbRound.prompt).toBe("I drink every day.");
    expect(verbRound.answer).toBe("まいにちのみます。");
    expect(isTranslationCorrect("まいにち飲みます", verbRound)).toBe(true);

    const iAdj = target("高い", "adjective", "たかい", { adjectiveType: "i_adjective" });
    iAdj.meaning = "expensive";
    expect(buildTranslationRound(iAdj, 0).prompt).toBe("This is expensive.");
    expect(buildTranslationRound(iAdj, 2).answer).toBe("それはたかかった。");

    const naAdj = target("静か", "adjective", "しずか", { adjectiveType: "na_adjective" });
    naAdj.meaning = "quiet";
    expect(buildTranslationRound(naAdj, 2).answer).toBe("それはしずかだった。");
  });

  it("flags bare-word prompts so they stay out of the sentence game", () => {
    const phrase = target("元気ですか", "expression", "げんきですか", { meaning: "how are you?" });
    const round = buildTranslationRound(phrase, 0);
    expect(round.frame).toBe(false);
    expect(supportsTranslationSentence(phrase)).toBe(false);
    expect(supportsTranslationSentence(target("猫", "noun", "ねこ", { meaning: "cat" }))).toBe(true);
    expect(supportsTranslationSentence(verb("飲む", "のむ", "godan"))).toBe(true);
  });

  it("ignores kana width, punctuation, spaces and katakana", () => {
    expect(normalizeAnswer(" それは ネコです。 ")).toBe("それはねこです");
    const round = buildTranslationRound(target("猫", "noun", "ねこ", { meaning: "cat" }), 0);
    expect(isTranslationCorrect("それはネコです！", round)).toBe(true);
    expect(isTranslationCorrect("   ", round)).toBe(false);
  });
});

describe("fill in the conjugation", () => {
  it("asks for a form inside a Japanese frame with four choices", () => {
    const round = buildConjugationRound(verb("飲む", "のむ", "godan"), 0);
    expect(round).not.toBeNull();
    expect(round!.translation).toBe("I drink water every day.");
    expect(buildConjugationRound(verb("飲む", "のむ", "godan"), 1)?.translation).toBe(
      "I do not drink water at all."
    );
    expect(round!.choices).toHaveLength(4);
    expect(new Set(round!.choices.map((choice) => normalizeAnswer(choice.text))).size).toBe(4);
    expect(round!.choices.map((choice) => normalizeAnswer(choice.text))).toContain(
      normalizeAnswer(round!.answer)
    );
    expect(round!.label.length).toBeGreaterThan(0);
    expect(round!.rule.length).toBeGreaterThan(0);
    expect(round!.hints.length).toBeGreaterThan(0);

    const past = buildConjugationRound(verb("飲む", "のむ", "godan"), 2);
    expect(past?.answer).toBe("飲みました");
    expect(past?.before).toBe("私は 昨日 水を");
    expect(past?.after).toBe("。");
    expect(past?.translation).toBe("I drank water yesterday.");

    const pastNegative = buildConjugationRound(verb("飲む", "のむ", "godan"), 3);
    expect(pastNegative?.translation).toBe("I did not drink water yesterday.");
  });

  it("uses the adjective frames and reading", () => {
    const round = buildConjugationRound(
      target("高い", "adjective", "たかい", {
        adjectiveType: "i_adjective",
        meaning: "expensive",
      }),
      1
    );
    expect(round?.answer).toBe("高くない");
    expect(round?.answerReading).toBe("たかくない");
    expect(round?.before).toBe("この かばんは");
    expect(round?.after).toBe("です。");
    expect(round?.translation).toBe("This bag is not expensive.");
  });

  it("builds a full sentence and blanks only the verb", () => {
    const round = buildConjugationRound(verb("書く", "かく", "godan"), 0)!;
    expect(round.before).toBe("私は 毎日 手紙を");
    expect(round.answer).toBe("書きます");
    expect(round.fullAnswer).toBe("私は 毎日 手紙を 書きます。");
    expect(round.promptEn).toBe("I ___ a letter every day.");

    const te = buildConjugationRound(verb("書く", "かく", "godan"), 4)!;
    expect(te.label).toBe("Te-form");
    expect(te.before).toBe("ここに 名前を");
    expect(te.fullAnswer).toBe("ここに 名前を 書いてください。");
    expect(te.promptEn).toBe("Please ___ your name here.");
    expect(te.translation).toBe("Please write your name here.");
  });

  it("moves the adjective sentence into the past", () => {
    const past = buildConjugationRound(
      target("高い", "adjective", "たかい", {
        adjectiveType: "i_adjective",
        meaning: "expensive",
      }),
      2
    )!;
    expect(past.before).toBe("その かばんは");
    expect(past.fullAnswer).toBe("その かばんは 高かったです。");
    expect(past.promptEn).toBe("That bag was ___.");
    expect(past.translation).toBe("That bag was expensive.");
  });

  it("falls back to the generic time frame for words without a scene", () => {
    const round = buildConjugationRound(verb("疲れる", "つかれる", "ichidan"), 2)!;
    expect(round.before).toBe("昨日");
    expect(round.fullAnswer).toBe("昨日 疲れました。");
    expect(round.promptEn).toBe("I ___ yesterday.");
  });

  it("drops forms a scene can't use", () => {
    const labels = [0, 1, 2, 3, 4, 5, 6, 7].map(
      (seed) => buildConjugationRound(verb("会う", "あう", "godan"), seed)?.label
    );
    expect(labels).not.toContain("Te-form");
  });

  it("translates idiomatic adjective scenes naturally", () => {
    const like = target("好き", "adjective", "すき", {
      adjectiveType: "na_adjective",
      meaning: "liked",
    });
    expect(buildConjugationRound(like, 0)?.translation).toBe("I like this movie.");

    const busy = target("忙しい", "adjective", "いそがしい", {
      adjectiveType: "i_adjective",
      meaning: "busy",
    });
    expect(buildConjugationRound(busy, 0)?.translation).toBe("I am busy today.");
  });

  it("returns null for nouns so they can be skipped", () => {
    expect(buildConjugationRound(target("猫", "noun", "ねこ"), 0)).toBeNull();
  });
});
