import type { KanjiContext } from "./types";

function storyRules(ctx: KanjiContext): string[] {
  return [
    `- The story must make the keyword "${ctx.keyword}" the obvious outcome.`,
    "- One scene, 2-3 sentences, visual and concrete. No etymology, no readings, no headings.",
    "",
    "Answer with the story only. Do not include a components list or labels.",
  ];
}

/**
 * Build the Heisig RTK prompt with a locked meaning for every component,
 * so later kanji can build on the keywords the learner already studied.
 */
export function buildMnemonicPrompt(ctx: KanjiContext): string {
  const frame = ctx.heisigNumber ? `, frame #${ctx.heisigNumber}` : "";
  const lines = [
    `Create a Heisig RTK (Remembering the Kanji) mnemonic story for the kanji "${ctx.character}" (keyword: ${ctx.keyword}${frame}).`,
  ];

  if (ctx.components.length > 0) {
    lines.push("", "Components, in the order the learner meets them:");
    for (const component of ctx.components) {
      const keyword = component.keyword
        ? `keyword "${component.keyword}"`
        : "no recorded keyword";
      const frameBit = component.heisigNumber
        ? `, frame #${component.heisigNumber}`
        : "";
      const story = component.userMnemonic
        ? ` Their existing story: "${component.userMnemonic}"`
        : "";
      lines.push(`- ${component.glyph} — ${keyword}${frameBit}.${story}`);
    }
    lines.push(
      "",
      "Rules:",
      "- Use the keyword given for each component; never invent a different meaning for a component that already has one.",
      "- Describe a component with no recorded keyword by its shape or role only, and do not name a meaning for it.",
      ...storyRules(ctx)
    );
  } else if (ctx.primitives.length > 0) {
    lines.push(
      "",
      `Components (no recorded keywords): ${ctx.primitives.join(" + ")}.`,
      "Describe each by shape or role only; do not name a meaning for them.",
      "",
      "Rules:",
      ...storyRules(ctx)
    );
  } else {
    lines.push(
      "",
      "No components are recorded for this kanji. Build the story from the shape of the character itself.",
      "",
      "Rules:",
      ...storyRules(ctx)
    );
  }

  return lines.join("\n");
}
