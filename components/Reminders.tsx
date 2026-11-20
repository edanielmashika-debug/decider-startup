"use client";

import { useEffect, useState } from "react";
import {
  INTERVALS,
  intervalLabel,
  type ReminderSettings,
} from "@/lib/reminders";

type Props = {
  settings: ReminderSettings;
  onChange: (s: ReminderSettings) => void;
  onClose: () => void;
};

type Permission = "granted" | "denied" | "default" | "unsupported";

function readPermission(): Permission {
  try {
    if (typeof window === "undefined" || !("Notification" in window)) return "unsupported";
    return Notification.permission;
  } catch {
    return "unsupported";
  }
}

function hourLabel(h: number): string {
  if (h === 0 || h === 24) return "12 am";
  if (h === 12) return "12 pm";
  return h < 12 ? `${h} am` : `${h - 12} pm`;
}

export default function Reminders({ settings, onChange, onClose }: Props) {
  const [permission, setPermission] = useState<Permission>("unsupported");
  const [note, setNote] = useState("");

  useEffect(() => {
    setPermission(readPermission());
  }, []);

  // Must run inside the tap, so the phone shows its permission box
  async function toggleNotify(want: boolean) {
    setNote("");
    if (!want) {
      onChange({ ...settings, notify: false });
      return;
    }
    if (permission === "unsupported") {
      setNote("This phone or browser cannot show notifications here. On iPhone, add the app to the Home Screen first.");
      return;
    }
    if (permission === "denied") {
      setNote("Notifications are blocked for this app. Allow them in the browser's site settings, then try again.");
      return;
    }
    let result: Permission = permission;
    if (permission === "default") {
      try {
        result = (await Notification.requestPermission()) as Permission;
      } catch {
        result = "denied";
      }
      setPermission(result);
    }
    if (result === "granted") {
      onChange({ ...settings, notify: true });
    } else {
      setNote("No permission, so no notifications. The timer still works while the app is open.");
    }
  }

  const hours = Array.from({ length: 24 }, (_, i) => i);
  const endHours = Array.from({ length: 24 }, (_, i) => i + 1);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Reminders</h1>
        <button onClick={onClose} className="min-h-12 rounded-card bg-surface px-5 font-medium">
          Done
        </button>
      </header>

      <section className="flex flex-col gap-3">
        <label className="flex min-h-12 items-center gap-3 rounded-card bg-surface px-4">
          <input
            type="checkbox"
            checked={settings.on}
            onChange={(e) => onChange({ ...settings, on: e.target.checked })}
            className="size-5"
          />
          <span>Let the buddy decide for me every so often</span>
        </label>
        <p className="text-sm opacity-70">
          While the app is open, the buddy picks something for you on its own, so it works as a
          reminder. It never counts as a skip.
        </p>
      </section>

      {settings.on && (
        <>
          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">How often</h2>
            <div className="flex flex-wrap gap-2">
              {INTERVALS.map((m) => (
                <button
                  key={m}
                  onClick={() => onChange({ ...settings, everyMin: m })}
                  className={`min-h-12 rounded-card px-4 font-medium ${
                    settings.everyMin === m ? "bg-accent text-white" : "bg-surface"
                  }`}
                >
                  {intervalLabel(m)}
                </button>
              ))}
            </div>
          </section>

          <section className="flex flex-col gap-3">
            <h2 className="font-semibold">Only between</h2>
            <div className="flex items-center gap-3">
              <select
                value={settings.fromHour}
                onChange={(e) => onChange({ ...settings, fromHour: Number(e.target.value) })}
                className="min-h-12 flex-1 rounded-card bg-surface px-3 text-base"
              >
                {hours.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
              <span>and</span>
              <select
                value={settings.toHour}
                onChange={(e) => onChange({ ...settings, toHour: Number(e.target.value) })}
                className="min-h-12 flex-1 rounded-card bg-surface px-3 text-base"
              >
                {endHours.map((h) => (
                  <option key={h} value={h}>
                    {hourLabel(h)}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-sm opacity-70">Outside these hours the buddy stays quiet.</p>
          </section>

          <section className="flex flex-col gap-3">
            <label className="flex min-h-12 items-center gap-3 rounded-card bg-surface px-4">
              <input
                type="checkbox"
                checked={settings.notify}
                onChange={(e) => toggleNotify(e.target.checked)}
                className="size-5"
              />
              <span>Also show a notification when the app is in the background</span>
            </label>
            {note && <p className="text-sm text-red-600">{note}</p>}
          </section>
        </>
      )}

      <section className="rounded-card bg-surface p-4 text-sm leading-relaxed opacity-90">
        <p className="mb-2 font-semibold">Honest limits</p>
        <ul className="list-disc space-y-1 pl-5">
          <li>It only works while the app is open or just in the background. Phones put background apps to sleep after a while, so a reminder can come late.</li>
          <li>If the app was closed, it cannot wake the phone. Opening the app brings the next pick.</li>
          <li>Reminders while the app is fully closed need a server. That is a later step.</li>
          <li>Notifications need your permission. On iPhone the app must be on the Home Screen.</li>
        </ul>
      </section>
    </main>
  );
}