import { ACTIVITIES, type Activity, type Category, type TimeOfDay } from "@/lib/activities";

const RECENT_LIMIT = 3; // how many past picks are skipped

// Chance weights: a "high" activity is 3 times as likely as a "normal" one,
// a "low" one half as likely. Your own activities get a 2x bonus on top.
const PRIORITY_WEIGHT = { low: 0.5, normal: 1, high: 3 };
const OWN_BONUS = 2;

// How a mood bends the picking (see moods.ts):
// - bias: chance multiplier per kind of activity (missing = 1)
// - priorityPower: how much priority counts. 1 = normal, below 1 = softer,
//   above 1 = stricter (high gets much more likely, low much less)
export type Tuning = {
  bias: Partial<Record<Category, number>>;
  priorityPower: number;
};

export const NEUTRAL: Tuning = { bias: {}, priorityPower: 1 };

export function weightOf(a: Activity, tuning: Tuning = NEUTRAL): number {
  const priority = PRIORITY_WEIGHT[a.priority ?? "normal"] ** tuning.priorityPower;
  return priority * (a.custom ? OWN_BONUS : 1) * (tuning.bias[a.category] ?? 1) * (a.boost ?? 1);
}

export function getTimeOfDay(date: Date): TimeOfDay {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return "morning";
  if (hour >= 12 && hour < 17) return "afternoon";
  if (hour >= 17 && hour < 22) return "evening";
  return "night";
}

function pickWeighted(list: Activity[], random: () => number, tuning: Tuning): Activity {
  const total = list.reduce((sum, a) => sum + weightOf(a, tuning), 0);
  let r = random() * total;
  for (const a of list) {
    r -= weightOf(a, tuning);
    if (r < 0) return a;
  }
  return list[list.length - 1]; // only reached through rounding
}

type DecideInput = {
  now: Date;
  recentIds: string[]; // past picks, newest last
  pool?: Activity[]; // what to pick from (default: the starter list)
  tuning?: Tuning; // the buddy mood's way of picking (default: neutral)
  random?: () => number; // swap this out when testing
};

export function decide({
  now,
  recentIds,
  pool = ACTIVITIES,
  tuning = NEUTRAL,
  random = Math.random,
}: DecideInput): Activity {
  const source = pool.length > 0 ? pool : ACTIVITIES;
  const slot = getTimeOfDay(now);

  // 1. only activities that fit this time of day (if none do, use them all)
  const timed = source.filter((a) => a.times.includes(slot));
  const fits = timed.length > 0 ? timed : source;

  // 2. skip the last few picks
  const skip = recentIds.slice(-RECENT_LIMIT);
  const fresh = fits.filter((a) => !skip.includes(a.id));

  // 3. prefer a different kind of activity than last time
  const lastId = recentIds[recentIds.length - 1];
  const last = source.find((a) => a.id === lastId) ?? ACTIVITIES.find((a) => a.id === lastId);
  const varied = fresh.filter((a) => a.category !== last?.category);

  // 4. use the narrowest list that still has something in it
  const candidates = varied.length > 0 ? varied : fresh.length > 0 ? fresh : fits;

  // 5. weighted random choice (priority, own-activity bonus, mood tuning)
  return pickWeighted(candidates, random, tuning);
}