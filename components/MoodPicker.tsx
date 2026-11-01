"use client";

import { useEffect, useState } from "react";
import { MOODS, type MoodId } from "@/lib/moods";

type MoodPickerProps = {
  value: MoodId;
  onChange: (id: MoodId) => void;
};

export default function MoodPicker({ value, onChange }: MoodPickerProps) {
  const [open, setOpen] = useState(false);
  const current = MOODS.find((m) => m.id === value) ?? MOODS[0];

  // Escape closes the sheet (useful on a PC)
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <>
      {/* The closed picker: one row showing the current mood */}
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        aria-expanded={open}
        className="flex min-h-14 w-full items-center gap-3 rounded-card bg-surface px-4 text-left"
      >
        <span className="text-2xl" aria-hidden="true">
          {current.emoji}
        </span>
        <span className="flex-1">
          <span className="block font-semibold leading-tight">{current.label}</span>
          <span className="block text-sm leading-tight opacity-70">{current.purpose}</span>
        </span>
        <span aria-hidden="true" className="opacity-60">
          ⌄
        </span>
      </button>

      {/* The open picker: a sheet that slides up from the bottom */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <button
            type="button"
            aria-label="Close"
            onClick={() => setOpen(false)}
            className="absolute inset-0 cursor-default bg-black/50"
          />
          <div
            role="dialog"
            aria-label="Choose a mood"
            className="sheet-in relative w-full max-w-md rounded-t-3xl bg-background p-5 pb-8"
          >
            <h2 className="text-lg font-bold">Pick your buddy&apos;s mood</h2>
            <p className="mb-4 text-sm opacity-70">
              The mood changes what the buddy suggests, not only how it looks.
            </p>

            <div role="radiogroup" aria-label="Buddy mood" className="flex flex-col gap-3">
              {MOODS.map((mood) => {
                const selected = mood.id === value;
                return (
                  <button
                    key={mood.id}
                    type="button"
                    role="radio"
                    aria-checked={selected}
                    onClick={() => {
                      onChange(mood.id);
                      setOpen(false);
                    }}
                    className={`flex items-center gap-4 rounded-card p-4 text-left ${
                      selected ? "bg-accent text-white" : "bg-surface"
                    }`}
                  >
                    <span className="text-3xl" aria-hidden="true">
                      {mood.emoji}
                    </span>
                    <span className="flex-1">
                      <span className="block font-semibold">{mood.label}</span>
                      <span className="block text-sm opacity-80">{mood.detail}</span>
                    </span>
                    {selected && <span aria-hidden="true">✓</span>}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
}