export type MoodId = "chill" | "hyped" | "sassy";

export type Face = {
  eyeRy: number; // eye height: bigger = wider-open eyes
  blinkSeconds: number; // time between blinks
  floatSeconds: number; // time for one float up-and-down
  mouth: string; // SVG path for the mouth
  mouthFilled: boolean; // true = open mouth, false = just a line
  lids: boolean; // true = half-closed eyelids
};

export type Mood = {
  id: MoodId;
  label: string;
  emoji: string;
  line: string;
  face: Face;
};

export const MOODS: Mood[] = [
  {
    id: "chill",
    label: "Chill",
    emoji: "😌",
    line: "No rush. Let's see what feels right.",
    face: {
      eyeRy: 11,
      blinkSeconds: 3,
      floatSeconds: 3,
      mouth: "M86 132 Q100 144 114 132",
      mouthFilled: false,
      lids: false,
    },
  },
  {
    id: "hyped",
    label: "Hyped",
    emoji: "🤩",
    line: "Let's GOOO! Press the button!",
    face: {
      eyeRy: 14,
      blinkSeconds: 2,
      floatSeconds: 1.6,
      mouth: "M80 126 Q100 158 120 126 Z",
      mouthFilled: true,
      lids: false,
    },
  },
  {
    id: "sassy",
    label: "Sassy",
    emoji: "😏",
    line: "Oh, you can't decide? Shocking.",
    face: {
      eyeRy: 11,
      blinkSeconds: 4.5,
      floatSeconds: 3.6,
      mouth: "M84 136 Q98 138 116 126",
      mouthFilled: false,
      lids: true,
    },
  },
];

export const DEFAULT_MOOD: MoodId = "chill";