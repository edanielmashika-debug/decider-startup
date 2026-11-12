import type { Chunk, Project } from "@/lib/projects";

// The planner spreads a project's unfinished steps over the days until the
// deadline. It is recalculated from scratch every time, so it is flexible
// without any "re-plan" button: finish a step early and the rest move up,
// skip a day and the rest spread over the days that are left.
//
// When there is not enough time left for your daily minutes (8d.B), the plan
// does not drop steps. It squeezes ALL unfinished steps into the days that are
// left, using the deadline day too, and says how many minutes a day that takes.

export type PlanDay = { date: string; chunks: Chunk[]; minutes: number };

// How worried the project should make you:
// done: nothing left | calm: plenty of time | tight: little slack or due very soon
// crunch: does not fit your daily minutes any more | overdue: deadline passed
export type Pressure = "done" | "calm" | "tight" | "crunch" | "overdue";

export type Plan = {
  days: PlanDay[]; // days that have steps, in order. days[0] is today if today has steps
  remainingMin: number; // minutes of unfinished steps
  daysLeft: number; // calendar days from today to the deadline, today included (0 = deadline passed)
  pressure: Pressure;
  neededPerDay: number; // minutes a day needed to finish (the busiest planned day)
  overdue: boolean; // the deadline has passed and there are unfinished steps
  crunch: boolean; // squeezed plan: busier than your daily minutes (also true when overdue)
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

// Squeezed plan: all steps, in order, spread over `days` days by minutes.
// A step goes on the day its first minute falls on, so order is kept.
function squeeze(remaining: Chunk[], todayKey: string, days: number): PlanDay[] {
  const total = remaining.reduce((s, c) => s + c.estimateMin, 0);
  const target = total / days;
  const byIndex = new Map<number, PlanDay>();
  let used = 0;
  for (const c of remaining) {
    const idx = Math.min(days - 1, Math.floor(used / target + 1e-9));
    let day = byIndex.get(idx);
    if (!day) {
      day = { date: addDays(todayKey, idx), chunks: [], minutes: 0 };
      byIndex.set(idx, day);
    }
    day.chunks.push(c);
    day.minutes += c.estimateMin;
    used += c.estimateMin;
  }
  return [...byIndex.entries()].sort((a, b) => a[0] - b[0]).map(([, d]) => d);
}

export function planProject(project: Project, today: Date): Plan {
  const todayKey = dateKey(today);
  const remaining = project.chunks.filter((c) => !c.done);
  const remainingMin = remaining.reduce((sum, c) => sum + c.estimateMin, 0);

  const daysLeft = Math.max(0, daysBetween(todayKey, project.deadline) + 1);
  const finished = remaining.length === 0;

  const empty = { days: [] as PlanDay[], remainingMin, daysLeft, neededPerDay: 0 };
  if (finished) {
    return { ...empty, pressure: "done", overdue: false, crunch: false, finished: true };
  }

  // Past the deadline: everything unfinished goes on today as a catch-up day.
  if (daysLeft === 0) {
    return {
      days: [{ date: todayKey, chunks: remaining, minutes: remainingMin }],
      remainingMin,
      daysLeft,
      neededPerDay: remainingMin,
      pressure: "overdue",
      overdue: true,
      crunch: true,
      finished: false,
    };
  }

  // Normal plan. With 3 or more days, the deadline day itself is kept free as a buffer.
  const workDays = daysLeft >= 3 ? daysLeft - 1 : daysLeft;
  const days: PlanDay[] = [];
  let dayIndex = 0;
  let current: PlanDay | null = null;
  let fits = true;

  for (const chunk of remaining) {
    // does it fit on the current day? A step longer than the daily time gets a day of its own.
    const fitsHere = current !== null && current.minutes + chunk.estimateMin <= project.dailyMin;
    if (!fitsHere) {
      if (current !== null) dayIndex += 1;
      if (dayIndex >= workDays) {
        fits = false;
        break;
      }
      current = { date: addDays(todayKey, dayIndex), chunks: [], minutes: 0 };
      days.push(current);
    }
    current!.chunks.push(chunk);
    current!.minutes += chunk.estimateMin;
  }

  if (!fits) {
    // Not enough time at your daily minutes: squeeze everything into the days left,
    // deadline day included.
    const squeezed = squeeze(remaining, todayKey, daysLeft);
    return {
      days: squeezed,
      remainingMin,
      daysLeft,
      neededPerDay: Math.max(...squeezed.map((d) => d.minutes)),
      pressure: "crunch",
      overdue: false,
      crunch: true,
      finished: false,
    };
  }

  const capacity = workDays * project.dailyMin;
  const tight = remainingMin >= 0.8 * capacity || daysLeft <= 2;
  return {
    days,
    remainingMin,
    daysLeft,
    neededPerDay: Math.max(...days.map((d) => d.minutes)),
    pressure: tight ? "tight" : "calm",
    overdue: false,
    crunch: false,
    finished: false,
  };
}

// The steps planned for today (empty if none)
export function todaysChunks(project: Project, today: Date): Chunk[] {
  const plan = planProject(project, today);
  const first = plan.days[0];
  return first && first.date === dateKey(today) ? first.chunks : [];
}

// The very next step to do (first unfinished one), or null
export function nextChunk(project: Project): Chunk | null {
  return project.chunks.find((c) => !c.done) ?? null;
}

// Share of the project's minutes that are done, 0 to 1
export function progressOf(project: Project): number {
  const total = project.chunks.reduce((s, c) => s + c.estimateMin, 0);
  if (total === 0) return 0;
  const done = project.chunks.filter((c) => c.done).reduce((s, c) => s + c.estimateMin, 0);
  return done / total;
}

// ---- Deadline alert for Home ----

export type Alert = {
  project: Project;
  plan: Plan;
  level: "urgent" | "warn"; // urgent: behind or overdue. warn: tight and due within 3 days
  text: string;
};

function dueWords(plan: Plan): string {
  if (plan.daysLeft <= 1) return "due today";
  if (plan.daysLeft === 2) return "due tomorrow";
  return `due in ${plan.daysLeft - 1} days`;
}

function stepsWords(n: number): string {
  return `${n} step${n === 1 ? "" : "s"} left`;
}

function minutesShort(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

// The most pressing deadline, or null if nothing needs a warning.
// A project only counts if it has unfinished steps.
export function topAlert(projects: Project[], today: Date): Alert | null {
  let best: Alert | null = null;
  for (const project of projects) {
    const plan = planProject(project, today);
    if (plan.finished) continue;
    const left = project.chunks.filter((c) => !c.done).length;
    let level: Alert["level"] | null = null;
    let text = "";
    if (plan.pressure === "overdue") {
      level = "urgent";
      text = `⚠️ "${project.title}" is past its deadline · ${stepsWords(left)}`;
    } else if (plan.pressure === "crunch") {
      level = "urgent";
      text = `🔥 "${project.title}" is behind · needs about ${minutesShort(plan.neededPerDay)} a day · ${dueWords(plan)}`;
    } else if (plan.pressure === "tight" && plan.daysLeft <= 3) {
      level = "warn";
      text = `⏰ "${project.title}" is ${dueWords(plan)} · ${stepsWords(left)}`;
    }
    if (!level) continue;
    const candidate: Alert = { project, plan, level, text };
    if (
      !best ||
      (level === "urgent" && best.level === "warn") ||
      (level === best.level && project.deadline < best.project.deadline)
    ) {
      best = candidate;
    }
  }
  return best;
}