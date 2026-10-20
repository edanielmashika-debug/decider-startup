import { MOODS, DEFAULT_MOOD, type MoodId } from "@/lib/moods";
import { ACTIVITIES } from "@/lib/activities";

// One key for everything the app remembers. "v1" lets us change the shape later.
const KEY = "decider:v1";

export type SavedState = {
  moodId: MoodId;
  recentIds: string[];
};

// Reads what was saved. Returns null when nothing usable is there.
// Every field is checked, so old or broken data can never crash the app.
export function loadState(): SavedState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);

    const moodId: MoodId = MOODS.some((m) => m.id === data?.moodId)
      ? data.moodId
      : DEFAULT_MOOD;

    const known = new Set(ACTIVITIES.map((a) => a.id));
    const recentIds: string[] = Array.isArray(data?.recentIds)
      ? data.recentIds
          .filter((id: unknown): id is string => typeof id === "string" && known.has(id))
          .slice(-10)
      : [];

    return { moodId, recentIds };
  } catch {
    return null; // blocked storage or corrupt data: just start fresh
  }
}

export function saveState(state: SavedState): void {
  try {
    window.localStorage.setItem(KEY, JSON.stringify(state));
  } catch {
    // storage full or blocked (private mode): the app still works, it just forgets
  }
}