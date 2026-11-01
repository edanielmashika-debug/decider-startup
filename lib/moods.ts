import type { Tuning } from "@/lib/decide";

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
  line: string; // shown for a moment before the rotating lines load (lines.ts)
  purpose: string; // one short line under the mood name on the Home screen
  detail: string; // what the mood does, shown in the mood picker
  face: Face;
  tuning: Tuning; // how this mood bends the picking
};

export const MOODS: Mood[] = [
  {
    id: "chill",
    label: "Chill",
    emoji: "😌",
    line: "No rush. Let's see what feels right.",
    purpose: "Gentle, low-effort picks",
    detail:
      "For tired or overwhelmed moments. Calm, easy things, and priorities count less so nothing nags you.",
    tuning: {
      bias: { chill: 3, reset: 1, learn: 1, create: 1, social: 0.6, move: 0.5 },
      priorityPower: 0.5,
    },
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
    purpose: "Active, get-moving picks",
    detail:
      "For when you want momentum. Movement, creating and people, and fewer sleepy things.",
    tuning: {
      bias: { move: 3, social: 2, create: 2, learn: 1, reset: 1, chill: 0.3 },
      priorityPower: 1,
    },
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
    purpose: "Tough love, no excuses",
    detail:
      "For when you're avoiding things. Pushes chores and learning, and your High priority activities count extra.",
    tuning: {
      bias: { reset: 2.5, learn: 2, move: 1.5, create: 1, social: 1, chill: 0.4 },
      priorityPower: 1.5,
    },
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