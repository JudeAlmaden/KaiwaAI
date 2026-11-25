/**
 * Sentence scenes for the fill-the-blank game.
 *
 * A scene supplies the part of the sentence that isn't the conjugated word:
 * the topic and an object/place for verbs, or a noun phrase ("this bag") for
 * adjectives. The tense adverb and the tail still come from the POS frame
 * tables, so one scene works with every form. `en` is the same part in
 * English, used for the gloss under the sentence.
 *
 * Only the conjugated predicate is blanked, which means the scene has to fit
 * every tense: keep complements timeless ("みずを", not "きのう みずを").
 * Words without a scene fall back to the generic subject + time frame.
 */

export type SceneFrame = {
  /** Verb scene: subject/topic, written before the time adverb. */
  topic?: string;
  /** English for the topic, e.g. "I". */
  topicEn?: string;
  /** Verb scene: object or place phrase, written after the time adverb. */
  complement?: string;
  /** English for the complement, e.g. "a letter". */
  en?: string;
  /** Adjective scene: noun shown as 「この ___ は」 (「その」 in past frames). */
  noun?: string;
  /** English for that noun, e.g. "bag". */
  nounEn?: string;
  /** Adjective scene: fixed topic for words that aren't about an object. */
  adjectiveTopic?: string;
  /** English for that fixed topic, e.g. "today". */
  adjectiveTopicEn?: string;
  /** Forms this scene can't support; they are left out of the choices. */
  skip?: string[];
  /** Form-specific rewrites, e.g. a te-form request with its own scene. */
  overrides?: Record<string, { before?: string; after?: string; en?: string }>;
};

const I = "わたしは";

/** Keyed by dictionary form, exactly as the card stores it. */
export const SCENE_FRAMES: Record<string, SceneFrame> = {
  // ── verbs with an everyday object ──
  書く: {
    topic: I,
    complement: "てがみを",
    en: "a letter",
    overrides: {
      te: { before: "ここに なまえを", after: "ください。", en: "your name here" },
    },
  },
  読む: { topic: I, complement: "ほんを", en: "a book" },
  食べる: { topic: I, complement: "ごはんを", en: "a meal" },
  飲む: { topic: I, complement: "みずを", en: "water" },
  見る: { topic: I, complement: "テレビを", en: "TV" },
  聞く: { topic: I, complement: "おんがくを", en: "music" },
  話す: { topic: I, complement: "にほんごを", en: "Japanese" },
  買う: { topic: I, complement: "くだものを", en: "fruit" },
  待つ: { topic: I, complement: "でんしゃを", en: "the train" },
  使う: { topic: I, complement: "えんぴつを", en: "a pencil" },
  作る: { topic: I, complement: "ごはんを", en: "a meal" },
  洗う: { topic: I, complement: "てを", en: "my hands" },
  開ける: { topic: I, complement: "まどを", en: "the window" },
  閉める: { topic: I, complement: "ドアを", en: "the door" },
  教える: { topic: I, complement: "えいごを", en: "English" },
  習う: { topic: I, complement: "にほんごを", en: "Japanese" },
  借りる: { topic: I, complement: "ほんを", en: "a book" },
  貸す: { topic: I, complement: "ほんを", en: "a book" },
  送る: { topic: I, complement: "メールを", en: "an email" },
  持つ: { topic: I, complement: "かばんを", en: "a bag" },
  撮る: { topic: I, complement: "しゃしんを", en: "a photo" },
  歌う: { topic: I, complement: "うたを", en: "a song" },
  消す: { topic: I, complement: "でんきを", en: "the light" },
  つける: { topic: I, complement: "でんきを", en: "the light" },
  覚える: { topic: I, complement: "たんごを", en: "vocabulary" },
  忘れる: { topic: I, complement: "かぎを", en: "the key" },
  調べる: { topic: I, complement: "たんごを", en: "a word" },
  始める: { topic: I, complement: "べんきょうを", en: "studying" },
  勉強する: { topic: I, complement: "にほんごを", en: "Japanese" },
  弾く: { topic: I, complement: "ピアノを", en: "the piano" },
  描く: { topic: I, complement: "えを", en: "a picture" },

  // ── verbs where the place or partner replaces the object ──
  会う: { topic: I, complement: "ともだちに", en: "a friend", skip: ["te"] },
  乗る: { topic: I, complement: "でんしゃに", en: "the train", skip: ["te"] },
  入る: { topic: I, complement: "へやに", en: "the room", skip: ["te"] },
  座る: { topic: I, complement: "いすに", en: "a chair", skip: ["te"] },
  行く: { topic: I, complement: "がっこうへ", en: "to school" },
  来る: { topic: I, complement: "がっこうに", en: "to school" },
  帰る: { topic: I, complement: "いえに", en: "home" },
  出る: { topic: I, complement: "いえを", en: "the house" },
  降りる: { topic: I, complement: "えきで", en: "at the station" },
  働く: { topic: I, complement: "かいしゃで", en: "at the office", skip: ["te"] },
  遊ぶ: { topic: I, complement: "こうえんで", en: "in the park" },
  歩く: { topic: I, complement: "こうえんを", en: "through the park", skip: ["te"] },
  走る: { topic: I, complement: "こうえんを", en: "in the park", skip: ["te"] },
  泳ぐ: { topic: I, complement: "プールで", en: "in the pool" },
  住む: { topic: I, complement: "とうきょうに", en: "in Tokyo", skip: ["te"] },
  休む: { topic: I, skip: ["te"] },

  // ── い-adjectives: "this ___ is …" ──
  高い: { noun: "かばん", nounEn: "bag" },
  安い: { noun: "かばん", nounEn: "bag" },
  おいしい: { noun: "りょうり", nounEn: "dish" },
  熱い: { noun: "おちゃ", nounEn: "tea" },
  冷たい: { noun: "みず", nounEn: "water" },
  新しい: { noun: "くるま", nounEn: "car" },
  古い: { noun: "いえ", nounEn: "house" },
  大きい: { noun: "へや", nounEn: "room" },
  小さい: { noun: "かばん", nounEn: "bag" },
  面白い: { noun: "ほん", nounEn: "book" },
  つまらない: { noun: "えいが", nounEn: "movie" },
  難しい: { noun: "もんだい", nounEn: "question" },
  易しい: { noun: "もんだい", nounEn: "question" },
  近い: { noun: "えき", nounEn: "station" },
  遠い: { noun: "えき", nounEn: "station" },
  早い: { noun: "でんしゃ", nounEn: "train" },
  遅い: { noun: "でんしゃ", nounEn: "train" },
  明るい: { noun: "へや", nounEn: "room" },
  暗い: { noun: "へや", nounEn: "room" },
  広い: { noun: "へや", nounEn: "room" },
  狭い: { noun: "へや", nounEn: "room" },
  強い: { noun: "ひと", nounEn: "person" },
  弱い: { noun: "かぜ", nounEn: "wind" },
  重い: { noun: "かばん", nounEn: "bag" },
  軽い: { noun: "かばん", nounEn: "bag" },
  優しい: { noun: "ひと", nounEn: "person" },
  忙しい: { adjectiveTopic: "きょうは", adjectiveTopicEn: "today" },

  // ── な-adjectives: the noun matters, the stem carries the tense ──
  元気: { noun: "ひと", nounEn: "person" },
  静か: { noun: "へや", nounEn: "room" },
  有名: { noun: "まち", nounEn: "town" },
  便利: { noun: "みせ", nounEn: "shop" },
  好き: { noun: "えいが", nounEn: "movie" },
  上手: { noun: "ひと", nounEn: "person" },
  下手: { noun: "ひと", nounEn: "person" },
  きれい: { noun: "へや", nounEn: "room" },
  大切: { noun: "ほん", nounEn: "book" },
  簡単: { noun: "もんだい", nounEn: "question" },
};

/** The scene for a word's dictionary form, or null when there isn't one. */
export function sceneFor(word: string): SceneFrame | null {
  return SCENE_FRAMES[word] ?? null;
}
