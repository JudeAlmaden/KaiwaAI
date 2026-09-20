import type { Card } from "@/app/(app)/review/ReviewCard";

export const FALLBACK_OFFLINE_CARDS: Card[] = [
  { id: "off-1", type: "vocabulary", status: "learning", word: "こんにちは", reading: "konnichiwa", romaji: "konnichiwa", meaning: "Hello / Good afternoon" },
  { id: "off-2", type: "vocabulary", status: "learning", word: "ありがとう", reading: "arigatou", romaji: "arigatou", meaning: "Thank you" },
  { id: "off-3", type: "vocabulary", status: "learning", word: "水", reading: "みず", romaji: "mizu", meaning: "Water" },
  { id: "off-4", type: "vocabulary", status: "learning", word: "食べる", reading: "たべる", romaji: "taberu", meaning: "To eat" },
  { id: "off-5", type: "vocabulary", status: "learning", word: "飲む", reading: "のむ", romaji: "nomu", meaning: "To drink" },
  { id: "off-6", type: "vocabulary", status: "learning", word: "日本", reading: "にほん", romaji: "nihon", meaning: "Japan" },
  { id: "off-7", type: "vocabulary", status: "learning", word: "友達", reading: "ともだち", romaji: "tomodachi", meaning: "Friend" },
  { id: "off-8", type: "vocabulary", status: "learning", word: "勉強", reading: "べんきょう", romaji: "benkyou", meaning: "Study" },
  { id: "off-9", type: "vocabulary", status: "learning", word: "学生", reading: "がくせい", romaji: "gakusei", meaning: "Student" },
  { id: "off-10", type: "vocabulary", status: "learning", word: "先生", reading: "せんせい", romaji: "sensei", meaning: "Teacher" },
  { id: "off-11", type: "vocabulary", status: "learning", word: "本", reading: "ほん", romaji: "hon", meaning: "Book" },
  { id: "off-12", type: "vocabulary", status: "learning", word: "学校", reading: "がっこう", romaji: "gakkou", meaning: "School" },
  { id: "off-13", type: "vocabulary", status: "learning", word: "猫", reading: "ねこ", romaji: "neko", meaning: "Cat" },
  { id: "off-14", type: "vocabulary", status: "learning", word: "犬", reading: "いぬ", romaji: "inu", meaning: "Dog" },
  { id: "off-15", type: "vocabulary", status: "learning", word: "大きい", reading: "おおきい", romaji: "ookii", meaning: "Big / Large" },
];

export const FALLBACK_OFFLINE_KANJI_CARDS: Card[] = [
  { id: "off-k1", type: "kanji", status: "learning", character: "一", meanings: ["One"], readingsOn: ["イチ", "イツ"], readingsKun: ["ひと-", "ひとつ"], radicals: ["一"], heisigNumber: 1, heisigLesson: 1, heisigKeyword: "one" },
  { id: "off-k2", type: "kanji", status: "learning", character: "二", meanings: ["Two"], readingsOn: ["ニ"], readingsKun: ["ふた", "ふたつ"], radicals: ["二"], heisigNumber: 2, heisigLesson: 1, heisigKeyword: "two" },
  { id: "off-k3", type: "kanji", status: "learning", character: "三", meanings: ["Three"], readingsOn: ["サン"], readingsKun: ["み", "みつ"], radicals: ["一"], heisigNumber: 3, heisigLesson: 1, heisigKeyword: "three" },
  { id: "off-k4", type: "kanji", status: "learning", character: "四", meanings: ["Four"], readingsOn: ["シ"], readingsKun: ["よ", "よつ"], radicals: ["囗"], heisigNumber: 4, heisigLesson: 1, heisigKeyword: "four" },
  { id: "off-k5", type: "kanji", status: "learning", character: "五", meanings: ["Five"], readingsOn: ["ゴ"], readingsKun: ["いつ", "いつつ"], radicals: ["二"], heisigNumber: 5, heisigLesson: 1, heisigKeyword: "five" },
  { id: "off-k6", type: "kanji", status: "learning", character: "日", meanings: ["Sun", "Day"], readingsOn: ["ニチ", "ジツ"], readingsKun: ["ひ", "-び", "-か"], radicals: ["日"], heisigNumber: 12, heisigLesson: 1, heisigKeyword: "day" },
  { id: "off-k7", type: "kanji", status: "learning", character: "月", meanings: ["Moon", "Month"], readingsOn: ["ゲツ", "ガツ"], readingsKun: ["つき"], radicals: ["月"], heisigNumber: 13, heisigLesson: 1, heisigKeyword: "month" },
  { id: "off-k8", type: "kanji", status: "learning", character: "田", meanings: ["Rice Field"], readingsOn: ["デン"], readingsKun: ["た"], radicals: ["田"], heisigNumber: 14, heisigLesson: 1, heisigKeyword: "rice field" },
  { id: "off-k9", type: "kanji", status: "learning", character: "目", meanings: ["Eye"], readingsOn: ["モク", "ボク"], readingsKun: ["め"], radicals: ["目"], heisigNumber: 15, heisigLesson: 1, heisigKeyword: "eye" },
  { id: "off-k10", type: "kanji", status: "learning", character: "口", meanings: ["Mouth"], readingsOn: ["コウ", "ク"], readingsKun: ["くち"], radicals: ["口"], heisigNumber: 11, heisigLesson: 1, heisigKeyword: "mouth" },
];
