// Anonymous per-session aliases. Deliberately not derived from the user's name,
// email or id — a stranger only ever sees "quiet tanuki".
const ADJECTIVES = [
  "quiet",
  "sunny",
  "sleepy",
  "curious",
  "gentle",
  "brave",
  "wandering",
  "cheerful",
  "shy",
  "clever",
  "drifting",
  "warm",
  "misty",
  "lucky",
  "cosmic",
  "little",
];

const NOUNS = [
  "tanuki",
  "kitsune",
  "sparrow",
  "otter",
  "panda",
  "crane",
  "koi",
  "rabbit",
  "tiger",
  "whale",
  "owl",
  "cat",
  "moon",
  "comet",
  "cloud",
  "maple",
];

function pick<T>(list: T[]): T {
  return list[Math.floor(Math.random() * list.length)];
}

/** A friendly, non-identifying display name for one side of a room. */
export function makeAlias(): string {
  return `${pick(ADJECTIVES)} ${pick(NOUNS)}`;
}
