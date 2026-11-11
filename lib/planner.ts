import type { Chunk, Project } from "@/lib/projects";

// The planner spreads a project's unfinished steps over the days until the
// deadline. It is recalculated from scratch every time, so it is flexible
// without any "re-plan" button: finish a step early and the rest move up,
// skip a day and the rest spread over the days that are left.

export type PlanDay = { date: string; chunks: Chunk[]; minutes: number };

export type Plan = {
  days: PlanDay[]; // days that have steps, in order. days[0] is today if today has steps
  overflow: Chunk[]; // steps that do not fit before the deadline
  remainingMin: number; // minutes of unfinished steps
  daysLeft: number; // calendar days from today to the deadline, today included (0 = deadline passed)
  overdue: boolean; // the deadline has passed and there are unfinished steps
  fits: boolean; // everything fits (nothing in overflow)
  finished: boolean; // no unfinished steps
};

// Local date as "YYYY-MM-DD" (not UTC, so late evening never lands on the wrong day)
export function dateKey(d: Date): string {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function fromKey(key: string): Date {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(key: string, n: number): string {
  const d = fromKey(key);
  d.setDate(d.getDate() + n);
  return dateKey(d);
}

// Whole days from a to b (b - a). Both are "YYYY-MM-DD".
export function daysBetween(a: string, b: string): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

export function planProject(project: Project, today: Date): Plan {
  const todayKey = dateKey(today);
  const remaining = project.chunks.filter((c) => !c.done);
  const remainingMin = remaining.reduce((sum, c) => sum + c.estimateMin, 0);

  const daysLeft = Math.max(0, daysBetween(todayKey, project.deadline) + 1);
  const finished = remaining.length === 0;

  // Work days: today up to the deadline. With 3 or more days, the deadline day
  // itself is kept free as a buffer. Past the deadline, only today is used and
  // the rest is overflow.
  let workDays: number;
  if (daysLeft === 0) workDays = 1;
  else if (daysLeft >= 3) workDays = daysLeft - 1;
  else workDays = daysLeft;

  const days: PlanDay[] = [];
  const overflow: Chunk[] = [];
  let dayIndex = 0;
  let current: PlanDay | null = null;

  for (const chunk of remaining) {
    // does it fit on the current day? A step longer than the daily time gets a day of its own.
    const fitsHere = current !== null && current.minutes + chunk.estimateMin <= project.dailyMin;
    if (!fitsHere) {
      if (current !== null) dayIndex += 1;
      if (dayIndex >= workDays) {
        overflow.push(chunk);
        current = null;
        // once we run out of days, everything after goes to overflow too
        dayIndex = workDays;
        continue;
      }
      current = { date: addDays(todayKey, dayIndex), chunks: [], minutes: 0 };
      days.push(current);
    }
    current!.chunks.push(chunk);
    current!.minutes += chunk.estimateMin;
  }

  return {
    days,
    overflow,
    remainingMin,
    daysLeft,
    overdue: daysLeft === 0 && !finished,
    fits: overflow.length === 0,
    finished,
  };
}

// The steps planned for today (empty if none)
export function todaysChunks(project: Project, today: Date): Chunk[] {
  const plan = planProject(project, today);
  const first = plan.days[0];
  return first && first.date === dateKey(today) ? first.chunks : [];
}

// Share of the project's minutes that are done, 0 to 1
export function progressOf(project: Project): number {
  const total = project.chunks.reduce((s, c) => s + c.estimateMin, 0);
  if (total === 0) return 0;
  const done = project.chunks.filter((c) => c.done).reduce((s, c) => s + c.estimateMin, 0);
  return done / total;
}