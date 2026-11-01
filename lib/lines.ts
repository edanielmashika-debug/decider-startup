import type { TimeOfDay } from "@/lib/activities";
import type { MoodId } from "@/lib/moods";
import { getTimeOfDay } from "@/lib/decide";

// What the buddy says while it waits. Each mood has lines for every time of
// day. "{time}" is replaced with the phone's clock, for example "8:41 pm".
const IDLE_LINES: Record<MoodId, Record<TimeOfDay, string[]>> = {
  chill: {
    morning: [
      "Good morning. No rush, we've got a whole day.",
      "Easy start today. Want me to pick something gentle?",
      "It's {time}. Take a breath, then tap the button.",
    ],
    afternoon: [
      "Afternoon already? Let's find something light.",
      "A small reset might feel nice right now.",
      "It's {time}. Whenever you're ready, no pressure.",
    ],
    evening: [
      "Evening. Time to ease into the rest of the day.",
      "Long day? Let me pick something soft.",
      "It's {time}. What would feel good right now?",
    ],
    night: [
      "Winding down. Let's keep it quiet and simple.",
      "It's {time}. Something calm before sleep?",
      "Late already. One gentle thing, then rest.",
    ],
  },
  hyped: {
    morning: [
      "RISE AND SHINE! Big day, big energy!",
      "It's {time} and the day is WIDE open!",
      "Morning boost incoming. Hit the button!",
    ],
    afternoon: [
      "Afternoon energy check! Let's gooo!",
      "It's {time}. Time to make something happen!",
      "Half the day left. Make it count!",
    ],
    evening: [
      "Evening mode: ON! What are we doing?",
      "The night is young at {time}! Press it!",
      "Let's squeeze some fun out of tonight!",
    ],
    night: [
      "Night owl hours! One more win before bed?",
      "It's {time} and I'm still pumped. You too?",
      "Quick bonus round before sleep. Tap it!",
    ],
  },
  sassy: {
    morning: [
      "Oh, you're up. Impressive. Now do something.",
      "It's {time}. The day won't plan itself, you know.",
      "Morning. Procrastinating already? Press the button.",
    ],
    afternoon: [
      "Afternoon scroll session? Or shall we be productive?",
      "It's {time}. Whatever you're avoiding is still there.",
      "Still deciding? I'll do it for you. As usual.",
    ],
    evening: [
      "Evening. Let me guess: nothing planned.",
      "It's {time}. The couch is calling. I say no.",
      "You, me, one decision. Don't waste the evening.",
    ],
    night: [
      "It's {time}. Should you even be awake?",
      "Late-night wandering? Fine. One thing, then sleep.",
      "Bedtime procrastination, my favorite. Press it.",
    ],
  },
};

// Said while the buddy is "thinking" (a random one per press)
const THINKING_LINES: Record<MoodId, string[]> = {
  chill: [
    "Hmm… let me think 🤔",
    "Taking a calm look at your options…",
    "Let me feel out what suits you…",
  ],
  hyped: [
    "Scanning for the BEST idea! ⚡",
    "Ooh ooh, I've got options! Hold on!",
    "Calculating maximum awesome…",
  ],
  sassy: [
    "Ugh, fine. Thinking… 🙄",
    "Checking what you've been avoiding…",
    "Give me a second, I'm judging your options.",
  ],
};

// A short line shown above the picked activity (a random one per pick)
const LEAD_LINES: Record<MoodId, string[]> = {
  chill: ["Maybe try this:", "How about something gentle:", "No pressure, but:", "This might feel nice:"],
  hyped: ["Do this NOW:", "Let's gooo:", "Energy time:", "Your mission:"],
  sassy: ["Don't overthink it:", "Here you go, no excuses:", "Obviously:", "Fine. Since you asked:"],
};

function formatTime(now: Date): string {
  return now.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
}

// The waiting line for this mood, time of day and tick (the page counts the
// tick up every few seconds, so the line keeps changing)
export function idleLineFor(moodId: MoodId, now: Date, tick: number): string {
  const list = IDLE_LINES[moodId][getTimeOfDay(now)];
  return list[tick % list.length].replace("{time}", formatTime(now));
}

function randomFrom(list: string[]): string {
  return list[Math.floor(Math.random() * list.length)];
}

export function thinkingLineFor(moodId: MoodId): string {
  return randomFrom(THINKING_LINES[moodId]);
}

export function leadLineFor(moodId: MoodId): string {
  return randomFrom(LEAD_LINES[moodId]);
}