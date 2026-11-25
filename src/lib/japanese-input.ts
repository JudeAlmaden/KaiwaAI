/**
 * Small romaji → hiragana converter for the sentence task, so a learner without
 * a Japanese IME can type "neko" and get ねこ. Not a full IME: no kanji
 * conversion and no candidate list.
 */

const VOWELS = ["a", "i", "u", "e", "o"];

const SYLLABLES: Record<string, string> = {
  a: "あ",
  i: "い",
  u: "う",
  e: "え",
  o: "お",
};

function addRow(prefix: string, kana: string[]) {
  kana.forEach((k, index) => {
    if (k) SYLLABLES[prefix + VOWELS[index]] = k;
  });
}

addRow("k", ["か", "き", "く", "け", "こ"]);
addRow("g", ["が", "ぎ", "ぐ", "げ", "ご"]);
addRow("s", ["さ", "し", "す", "せ", "そ"]);
addRow("z", ["ざ", "じ", "ず", "ぜ", "ぞ"]);
addRow("t", ["た", "ち", "つ", "て", "と"]);
addRow("d", ["だ", "ぢ", "づ", "で", "ど"]);
addRow("n", ["な", "に", "ぬ", "ね", "の"]);
addRow("h", ["は", "ひ", "ふ", "へ", "ほ"]);
addRow("b", ["ば", "び", "ぶ", "べ", "ぼ"]);
addRow("p", ["ぱ", "ぴ", "ぷ", "ぺ", "ぽ"]);
addRow("m", ["ま", "み", "む", "め", "も"]);
addRow("y", ["や", "", "ゆ", "", "よ"]);
addRow("r", ["ら", "り", "る", "れ", "ろ"]);
addRow("w", ["わ", "", "", "", "を"]);

Object.assign(SYLLABLES, {
  shi: "し",
  chi: "ち",
  tsu: "つ",
  fu: "ふ",
  ji: "じ",
  si: "し",
  ti: "ち",
  tu: "つ",
  hu: "ふ",
});

const YOON: Record<string, string[]> = {
  ky: ["きゃ", "きゅ", "きょ"],
  gy: ["ぎゃ", "ぎゅ", "ぎょ"],
  sh: ["しゃ", "しゅ", "しょ"],
  ch: ["ちゃ", "ちゅ", "ちょ"],
  j: ["じゃ", "じゅ", "じょ"],
  ny: ["にゃ", "にゅ", "にょ"],
  hy: ["ひゃ", "ひゅ", "ひょ"],
  by: ["びゃ", "びゅ", "びょ"],
  py: ["ぴゃ", "ぴゅ", "ぴょ"],
  my: ["みゃ", "みゅ", "みょ"],
  ry: ["りゃ", "りゅ", "りょ"],
};

for (const [prefix, kana] of Object.entries(YOON)) {
  ["a", "u", "o"].forEach((vowel, index) => {
    SYLLABLES[prefix + vowel] = kana[index];
  });
}

export type ToHiraganaOptions = {
  /**
   * When true (e.g. on blur or final submission), a solitary trailing "n"
   * at the end of the input is converted to "ん".
   * When false (default during live typing keystrokes), a trailing "n"
   * is kept as "n" so the user can type the subsequent vowel (e.g. "ni" → "に").
   */
  final?: boolean;
};

export function toHiragana(input: string, options?: ToHiraganaOptions): string {
  const final = options?.final ?? false;
  const source = input.toLowerCase();
  let output = "";
  let index = 0;

  while (index < source.length) {
    const char = source[index];

    if (!/[a-z]/.test(char)) {
      output += input[index];
      index++;
      continue;
    }

    // "matcha": t + cha reads as っちゃ.
    if (char === "t" && source.startsWith("tch", index)) {
      output += "っ";
      index++;
      continue;
    }

    if (char === "n") {
      const next = source[index + 1];
      if (next === "'") {
        output += "ん";
        index += 2;
        continue;
      }
      if (next === "n") {
        const afterNext = source[index + 2];
        if (afterNext !== undefined && /[aiueoy]/.test(afterNext)) {
          // "nna", "nni", etc. -> first 'n' is 'ん', second 'n' pairs with vowel
          output += "ん";
          index += 1;
          continue;
        }
        // "nn" with no vowel following -> converts both 'n's to 'ん'
        output += "ん";
        index += 2;
        continue;
      }
      if ((final && next === undefined) || (next !== undefined && !/[aiueoy]/.test(next))) {
        output += "ん";
        index++;
        continue;
      }
    }

    // Doubled consonant → small っ (gakkou, kitte).
    if (index + 1 < source.length && char === source[index + 1] && !"aioun".includes(char)) {
      output += "っ";
      index++;
      continue;
    }

    let matched = false;
    for (let length = 3; length >= 1; length--) {
      const kana = SYLLABLES[source.slice(index, index + length)];
      if (kana) {
        output += kana;
        index += length;
        matched = true;
        break;
      }
    }
    if (!matched) {
      output += input[index];
      index++;
    }
  }

  return output;
}
