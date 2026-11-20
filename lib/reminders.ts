// Auto-decide reminders (Step 10b, part 1). While the app is open, the buddy decides
// for you every chosen interval. No server: it is a timer inside the app, so it only
// works while the app is open or in the background. Closed-app push is a later step.

export type ReminderSettings = {
  on: boolean; // auto-decide at all?
  everyMin: number; // one of INTERVALS
  fromHour: number; // first hour of the day it may speak, 0 to 23
  toHour: number; // it stops at the start of this hour, 0 to 24
  notify: boolean; // also show a phone notification when the app is in the background
};

export const INTERVALS = [15, 30, 60, 120, 180] as const;

export const DEFAULT_REMINDERS: ReminderSettings = {
  on: false,
  everyMin: 60,
  fromHour: 8,
  toHour: 22,
  notify: false,
};

export function intervalLabel(min: number): string {
  if (min < 60) return `${min} min`;
  const h = min / 60;
  return h === 1 ? "1 hour" : `${h} hours`;
}

function wholeHour(x: unknown, min: number, max: number, fallback: number): number {
  return typeof x === "number" && Number.isInteger(x) && x >= min && x <= max ? x : fallback;
}

// Reads saved or typed settings safely. Anything unusable falls back to the default.
export function sanitizeReminders(x: unknown): ReminderSettings {
  const d = DEFAULT_REMINDERS;
  if (typeof x !== "object" || x === null) return { ...d };
  const o = x as Record<string, unknown>;
  const everyMin = (INTERVALS as readonly number[]).includes(o.everyMin as number)
    ? (o.everyMin as number)
    : d.everyMin;
  return {
    on: o.on === true,
    everyMin,
    fromHour: wholeHour(o.fromHour, 0, 23, d.fromHour),
    toHour: wholeHour(o.toHour, 0, 24, d.toHour),
    notify: o.notify === true,
  };
}

// Is this moment inside the hours the buddy may speak? Works across midnight too
// (for example 20 to 6). Same start and end means all day.
export function inActiveHours(now: Date, fromHour: number, toHour: number): boolean {
  const h = now.getHours();
  if (fromHour === toHour || (fromHour === 0 && toHour === 24)) return true;
  if (fromHour < toHour) return h >= fromHour && h < toHour;
  return h >= fromHour || h < toHour;
}

// When the next auto-decide is due, given when the last one happened
export function nextDueAt(lastMs: number, everyMin: number): number {
  return lastMs + everyMin * 60_000;
}

// What a notification says for a pick
export function notificationText(lead: string, activityText: string): { title: string; body: string } {
  const title = lead.replace(/[:.]+$/, "").trim() || "Maybe try this";
  return { title, body: activityText };
}

// Shows a phone notification (only call it when the person allowed notifications and
// the app is in the background). Never throws: if it cannot show, nothing happens.
export async function showPickNotification(title: string, body: string): Promise<void> {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const options = { body, icon: "/icons/icon-192.png", badge: "/icons/icon-192.png", tag: "decider-pick" };
    if ("serviceWorker" in navigator) {
      const reg = await navigator.serviceWorker.getRegistration();
      if (reg) {
        await reg.showNotification(title, options);
        return;
      }
    }
    new Notification(title, options);
  } catch {
    // not allowed or not supported here: stay quiet
  }
}