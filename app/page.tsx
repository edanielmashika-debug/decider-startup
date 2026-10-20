"use client";


import { useEffect, useRef, useState } from "react";
import Buddy from "@/components/Buddy";
import MoodPicker from "@/components/MoodPicker";
import { MOODS, DEFAULT_MOOD, type MoodId } from "@/lib/moods";
import { useIdleColor } from "@/hooks/useIdleColor";
import { decide } from "@/lib/decide";
import type { Activity } from "@/lib/activities";
import { faceForState, type BuddyPhase } from "@/lib/buddyStates";
import { loadState, saveState } from "@/lib/storage";


export default function Home() {
  useIdleColor();
  const [moodId, setMoodId] = useState<MoodId>(DEFAULT_MOOD);
  const mood = MOODS.find((m) => m.id === moodId) ?? MOODS[0];

  const [activity, setActivity] = useState<Activity | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);

  const [phase, setPhase] = useState<BuddyPhase>("idle");
  const [loaded, setLoaded] = useState(false);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);


  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);

  }, []);

  function handleDecide() {
    if (phase === "thinking") return;
    timers.current.forEach(clearTimeout);
    setPhase("thinking");

    const thinkTimer = setTimeout(() => {
      const pick = decide({ now: new Date(), recentIds });
      setActivity(pick);
      setRecentIds((ids) => [...ids, pick.id].slice(-10));
      setPhase("excited");

      const calmTimer = setTimeout(() => setPhase("idle"), 2500);
      timers.current = [thinkTimer];
    }, 900);

    timers.current = [thinkTimer];
  }

  const bubbleText =
    phase === "thinking"
      ? "Hmm.. Let me think 🤔"
      : activity
        ? `${activity.emoji} ${activity.text}`
        : mood.line;

  useEffect(() => {
    document.documentElement.dataset.mood = moodId;
  }, [moodId]);

  // On first load: bring back what was saved
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setMoodId(saved.moodId);
      setRecentIds(saved.recentIds);
    }
    setLoaded(true);
  }, []);

  // After that: save whenever mood or recent picks change
  useEffect(() => {
    if (!loaded) return;
    saveState({ moodId, recentIds });
  }, [loaded, moodId, recentIds]);

  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col items-center justify-between px-6 py-10">
      <header className="text-center">
        <h1 className="text-2xl font-bold">Decider</h1>
        <p className="text-sm opacity-70">What should I do right now?</p>
      </header>

      <section className="flex w-full flex-1 flex-col items-center justify-center gap-6">
        <Buddy face={faceForState(mood.face, phase)} />
        <p className="max-w-xs rounded-card bg-surface px-5 py-3 text-center shadow-sm">
          {bubbleText}
        </p>
      </section>

      <footer className="flex w-full flex-col gap-4">
        <MoodPicker value={moodId} onChange={setMoodId} />
        <button onClick={handleDecide} className="w-full rounded-card bg-accent py-4 text-lg font-semibold text-white disabled:opacity-60" disabled={phase === "thinking"} >
          {phase === "thinking" ? "Thinking..." : "Decide for me"}
        </button>
      </footer>
    </main>
  );
}