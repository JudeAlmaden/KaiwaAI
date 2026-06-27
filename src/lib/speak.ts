// Speak Japanese text using the browser's built-in speech synthesis (free).
export function speakJa(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  try {
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.lang = "ja-JP";
    u.rate = 0.9;
    const jaVoice = window.speechSynthesis
      .getVoices()
      .find((v) => v.lang.startsWith("ja"));
    if (jaVoice) u.voice = jaVoice;
    window.speechSynthesis.speak(u);
  } catch {
    // ignore — audio is a nice-to-have
  }
}

export function canSpeak(): boolean {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}
