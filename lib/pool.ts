import{
    ACTIVITIES,
    CATEGORIES,
    TIMES,
    MAX_TEXT_LENGTH,
    type Activity,
    type Category,
    type Priority,

} from "@/lib/activities";

//The list decide for me picks your custom activities and the starter ones
//ideas if you keep them switched on. Never empty

export function buildPool(custom: Activity[], useStarter: boolean): Activity[] {
    const pool = useStarter ? [...custom, ...ACTIVITIES] : [...custom];
    return pool.length > 0 ? pool: ACTIVITIES;
}


// A fresh id for a new activity of your own

export function newId(): string {
    return `custom-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}


// turns anything (form values, saved data) into a safe activity, or null if it
// is unusable. The form and the saved-data loader both go through this

export function  sanitizeActivity(x: unknown): Activity | null {
    if (typeof x !== "object" || x === null) return null;
    const a = x as Record<string, unknown>;

    const text = typeof a.text === "string" ? a.text.trim().slice(0, MAX_TEXT_LENGTH) : "";
    if(typeof a.id !== "string" || a.id === "" || text === "") return null;

    const times = Array.isArray(a.times) ? TIMES.filter((t)=> (a.times as unknown[]).includes(t)) : [];
    if(times.length === 0) return null;

    const category: Category = CATEGORIES.includes(a.category as Category)
      ? (a.category as Category)
      : "chill";
    const priority: Priority = a.priority === "low" || a.priority === "high" ? a.priority : "normal";
    const emoji = 
      typeof a.emoji === "string" && a.emoji.trim() !== ""
        ? [...a.emoji.trim()].slice(0, 8).join("")
        :  "✨";

    return {id: a.id, emoji, text, category, times, priority, custom: true };
}