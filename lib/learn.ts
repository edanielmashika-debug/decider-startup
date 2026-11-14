// The buddy learns from your taps (Step 8c). No AI, nothing leaves the phone.
// For each activity it remembers how often you did it and how often you skipped it.

export type Result = { done: number; skipped: number };
export type Stats = Record<string, Result>;

export const MAX_COUNT = 20; // when done + skipped goes above this, both are halved (recent taps count more)
export const FACTOR_MAX = 3; // most a liked activity can be boosted
export const FACTOR_MIN = 1 / FACTOR_MAX; // most a disliked one can be reduced (one third)

// Project steps (ids start with "step:") are tracked by the project, not here.
export function canTrack(id: string): boolean {
  return !id.startsWith("step:");
}

// How much more or less likely an activity becomes because of your taps.
// Uses a smoothed "did it" rate, so one tap moves it a little and many taps move it more:
// no taps = 1.0, one "did it" = 1.44, one skip = 0.69, ten "did its" = 2.5, ten skips = 0.4. Never above 3 or below one third.
export function learnedFactor(r: Result | undefined): number {
  if (!r) return 1;
  const rate = (r.done + 1) / (r.done + r.skipped + 2);
  return FACTOR_MAX ** (2 * rate - 1);
}

// A new Stats object with one more tap recorded (the old one is not changed).
export function record(stats: Stats, id: string, kind: "done" | "skipped"): Stats {
  if (!canTrack(id)) return stats;
  const prev = stats[id] ?? { done: 0, skipped: 0 };
  let next: Result = {
    done: prev.done + (kind === "done" ? 1 : 0),
    skipped: prev.skipped + (kind === "skipped" ? 1 : 0),
  };
  if (next.done + next.skipped > MAX_COUNT) {
    next = { done: Math.floor(next.done / 2), skipped: Math.floor(next.skipped / 2) };
  }
  return { ...stats, [id]: next };
}

export function forget(stats: Stats, id: string): Stats {
  const { [id]: _removed, ...rest } = stats;
  return rest;
}

// Safe reading of saved data: only known ids, whole numbers from 0 to MAX_COUNT.
export function sanitizeStats(x: unknown, known: Set<string>): Stats {
  const out: Stats = {};
  if (typeof x !== "object" || x === null || Array.isArray(x)) return out;
  for (const [id, v] of Object.entries(x as Record<string, unknown>)) {
    if (!known.has(id) || !canTrack(id) || typeof v !== "object" || v === null) continue;
    const r = v as Record<string, unknown>;
    const num = (n: unknown) =>
      typeof n === "number" && Number.isFinite(n) ? Math.min(MAX_COUNT, Math.max(0, Math.floor(n))) : 0;
    const done = num(r.done);
    const skipped = num(r.skipped);
    if (done + skipped > 0) out[id] = { done, skipped };
  }
  return out;
}