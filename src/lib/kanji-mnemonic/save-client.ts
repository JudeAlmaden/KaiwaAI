/**
 * Save a mnemonic note through the single authoritative route.
 * Returns false instead of throwing so each surface keeps its own UX.
 */
export async function saveKanjiMnemonicClient(
  character: string,
  mnemonic: string
): Promise<boolean> {
  try {
    const res = await fetch(`/api/kanji/${encodeURIComponent(character)}/mnemonic`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mnemonic }),
    });
    return res.ok;
  } catch {
    return false;
  }
}
