import type { MoodId } from "@/lib/moods";

// The buddy's voice (Step 9). It uses the phone's built-in speech (the browser's
// speechSynthesis): free, nothing is sent anywhere, and it works offline if the
// phone has a voice installed. Which voice you hear depends on the phone.

// How each mood sounds. rate: 1 is normal speed. pitch: 1 is normal pitch.
export const VOICE_STYLE: Record<MoodId, { rate: number; pitch: number }> = {
  chill: { rate: 0.9, pitch: 1.0 },
  hyped: { rate: 1.15, pitch: 1.25 },
  sassy: { rate: 0.95, pitch: 0.8 },
};

const FALLBACK_STYLE = { rate: 1, pitch: 1 };

// True when this browser can speak at all (false on the server and on old browsers)
export function voiceSupported(): boolean {
  try {
    return (
      typeof window !== "undefined" &&
      "speechSynthesis" in window &&
      typeof SpeechSynthesisUtterance !== "undefined"
    );
  } catch {
    return false;
  }
}

// Emojis and symbols make speech engines say things like "person walking". Remove
// them, and tidy the spaces. Letters, numbers and normal punctuation stay.
export function cleanForSpeech(text: string): string {
  return text
    .replace(/[\p{Extended_Pictographic}‍️⃣]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// What the buddy says for a pick: the lead line, then the activity. Ends with a full
// stop so the voice does not run the two together.
export function sentenceFor(lead: string, activityText: string): string {
  const a = cleanForSpeech(activityText);
  if (!a) return "";
  const l = cleanForSpeech(lead).replace(/[:.]+$/, "");
  return l ? `${l}. ${a}` : a;
}

// Picks a voice that matches the phone's language, or null to let the phone choose.
export function pickVoice(
  voices: { lang: string; localService?: boolean; default?: boolean }[],
  language: string,
): number {
  if (voices.length === 0) return -1;
  const base = language.toLowerCase().split("-")[0];
  const same = voices
    .map((v, i) => ({ v, i }))
    .filter(({ v }) => v.lang.toLowerCase().split(/[-_]/)[0] === base);
  if (same.length === 0) return -1;
  // prefer one installed on the phone (works offline), then the phone's default
  const best =
    same.find(({ v }) => v.localService && v.default) ??
    same.find(({ v }) => v.localService) ??
    same.find(({ v }) => v.default) ??
    same[0];
  return best.i;
}

// Call this inside the button press itself (a tap). Some phones only allow speech
// that was started by a tap, so this "unlocks" it for the speech that comes a moment
// later. It says nothing out loud.
export function unlockSpeech(): void {
  if (!voiceSupported()) return;
  try {
    const u = new SpeechSynthesisUtterance("");
    u.volume = 0;
    window.speechSynthesis.speak(u);
  } catch {
    // speech not allowed here: the app just stays quiet
  }
}

export function stopSpeaking(): void {
  if (!voiceSupported()) return;
  try {
    window.speechSynthesis.cancel();
  } catch {
    // ignore
  }
}

// Say something in the mood's voice. Cuts off anything still being said.
export function speak(text: string, moodId: MoodId): void {
  if (!voiceSupported()) return;
  const clean = text.trim();
  if (!clean) return;
  try {
    const synth = window.speechSynthesis;
    synth.cancel();
    const u = new SpeechSynthesisUtterance(clean);
    const style = VOICE_STYLE[moodId] ?? FALLBACK_STYLE;
    u.rate = style.rate;
    u.pitch = style.pitch;
    const lang = navigator.language || "en-US";
    u.lang = lang;
    const voices = synth.getVoices();
    const i = pickVoice(voices, lang);
    if (i >= 0) u.voice = voices[i];
    synth.speak(u);
  } catch {
    // speech failed (no voice installed, blocked): the app just stays quiet
  }
}