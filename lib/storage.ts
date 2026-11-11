import { MOODS, DEFAULT_MOOD, type MoodId } from "@/lib/moods";
import { ACTIVITIES, MAX_CUSTOM, type Activity } from "@/lib/activities";
import { sanitizeActivity } from "@/lib/pool";
import { MAX_PROJECTS, sanitizeProject, type Project } from "@/lib/projects";

// One key for everything the app remembers. "v1" lets us change the shape later.
const KEY = "decider:v1";

export type SavedState = {
  moodId: MoodId;
  recentIds: string[];
  customActivities: Activity[]; // the user's own activities (Step 8b)
  useStarter: boolean; // also pick from the starter list?
  projects: Project[]; // big tasks split into steps (Step 8d)
};

// Reads what was saved. Returns null when nothing usable is there.
// Every field is checked, so old or broken data can never crash the app.
// Data saved before Step 8b has no custom fields: they get safe defaults.
export function loadState(): SavedState | null {
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return null;
    const data = JSON.parse(raw);

    const moodId: MoodId = MOODS.some((m) => m.id === data?.moodId)
      ? data.moodId
      : DEFAULT_MOOD;

    // your own activities first, because recent picks may point at them
    const starterIds = new Set(ACTIVITIES.map((a) => a.id));
    const seen = new Set<string>();
    const customActivities: Activity[] = [];
    if (Array.isArray(data?.customActivities)) {
      for (const item of data.customActivities) {
        const a = sanitizeActivity(item);
        if (!a || starterIds.has(a.id) || seen.has(a.id)) continue;
        seen.add(a.id);
        customActivities.push(a);
        if (customActivities.length >= MAX_CUSTOM) break;
      }
    }

    const known = new Set([...starterIds, ...seen]);
    const recentIds: string[] = Array.isArray(data?.recentIds)
      ? data.recentIds
          .filter((id: unknown): id is string => typeof id === "string" && known.has(id))
          .slice(-10)
      : [];

    const useStarter = typeof data?.useStarter === "boolean" ? data.useStarter : true;

    // projects (Step 8d): each one is checked, duplicates and unusable ones are dropped
    const projects: Project[] = [];
    const seenProjects = new Set<string>();
    if (Array.isArray(data?.projects)) {
      for (const item of data.projects) {
        const p = sanitizeProject(item);
        if (!p || seenProjects.has(p.id)) continue;
        seenProjects.add(p.id);
        projects.push(p);
        if (projects.length >= MAX_PROJECTS) break;
      }
    }

    return { moodId, recentIds, customActivities, useStarter, projects };
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