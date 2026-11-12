"use client";

import { useEffect, useRef, useState } from "react";
import Buddy from "@/components/Buddy";
import MenuButton from "@/components/MenuButton";
import MoodPicker from "@/components/MoodPicker";
import MyActivities from "@/components/MyActivities";
import Projects from "@/components/Projects";
import { useIdleColor } from "@/hooks/useIdleColor";
import { MOODS, DEFAULT_MOOD, type MoodId } from "@/lib/moods";
import { decide } from "@/lib/decide";
import type { Activity } from "@/lib/activities";
import type { Project } from "@/lib/projects";
import { buildPool } from "@/lib/pool";
import { stepActivities } from "@/lib/projectPool";
import { topAlert } from "@/lib/planner";
import { loadState, saveState } from "@/lib/storage";
import { faceForState, type BuddyPhase } from "@/lib/buddyStates";
import { idleLineFor, thinkingLineFor, leadLineFor } from "@/lib/lines";

export default function Home() {
  useIdleColor();
  const [moodId, setMoodId] = useState<MoodId>(DEFAULT_MOOD);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<BuddyPhase>("idle");
  const [loaded, setLoaded] = useState(false);
  const [custom, setCustom] = useState<Activity[]>([]);
  const [useStarter, setUseStarter] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [view, setView] = useState<"home" | "mine" | "projects">("home");
  const [now, setNow] = useState<Date | null>(null); // set after the page loads
  const [tick, setTick] = useState(0); // counts up so the waiting line changes
  const [thinkingText, setThinkingText] = useState("");
  const [leadText, setLeadText] = useState("");
  const [doneNote, setDoneNote] = useState(""); // shown after you finish a project step
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const mood = MOODS.find((m) => m.id === moodId) ?? MOODS[0];

  useEffect(() => {
    document.documentElement.dataset.mood = moodId;
  }, [moodId]);

  // On first load: bring back what was saved, and start the waiting lines
  useEffect(() => {
    const saved = loadState();
    if (saved) {
      setMoodId(saved.moodId);
      setRecentIds(saved.recentIds);
      setCustom(saved.customActivities);
      setUseStarter(saved.useStarter);
      setProjects(saved.projects);
    }
    setNow(new Date());
    setTick(Math.floor(Math.random() * 1000)); // start on a different line each visit
    setLoaded(true);
  }, []);

  // After that: save whenever something saved changes
  useEffect(() => {
    if (!loaded) return;
    saveState({ moodId, recentIds, customActivities: custom, useStarter, projects });
  }, [loaded, moodId, recentIds, custom, useStarter, projects]);

  // While the buddy is just waiting, change its line every 8 seconds
  useEffect(() => {
    if (!loaded || activity || phase !== "idle" || view !== "home") return;
    const id = setInterval(() => {
      setNow(new Date());
      setTick((t) => t + 1);
    }, 8000);
    return () => clearInterval(id);
  }, [loaded, activity, phase, view]);

  useEffect(() => {
    return () => timers.current.forEach(clearTimeout);
  }, []);

  function handleDecide() {
    if (phase === "thinking") return;
    timers.current.forEach(clearTimeout);
    setDoneNote("");
    setThinkingText(thinkingLineFor(moodId));
    setPhase("thinking");

    const thinkTimer = setTimeout(() => {
      const pick = decide({
        now: new Date(),
        recentIds,
        pool: buildPool(custom, useStarter, stepActivities(projects, new Date())),
        tuning: mood.tuning,
      });
      setActivity(pick);
      setLeadText(leadLineFor(moodId));
      setRecentIds((ids) => [...ids, pick.id].slice(-10));
      setPhase("excited");

      const calmTimer = setTimeout(() => setPhase("idle"), 2500);
      timers.current.push(calmTimer);
    }, 900);
    timers.current = [thinkTimer];
  }

  function saveActivity(a: Activity) {
    setCustom((list) =>
      list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? a : x)) : [...list, a],
    );
  }

  function deleteActivity(id: string) {
    setCustom((list) => list.filter((x) => x.id !== id));
    setRecentIds((ids) => ids.filter((x) => x !== id));
  }

  // "I did it" on a picked project step: tick it off and say well done
  function finishStep(a: Activity) {
    const ref = a.stepOf;
    if (!ref) return;
    setProjects((list) =>
      list.map((p) =>
        p.id === ref.projectId
          ? { ...p, chunks: p.chunks.map((c) => (c.id === ref.chunkId ? { ...c, done: true } : c)) }
          : p,
      ),
    );
    setActivity(null);
    setDoneNote("Nice! ✅ One step closer.");
    const t = setTimeout(() => setDoneNote(""), 6000);
    timers.current.push(t);
  }

  function saveProject(p: Project) {
    setProjects((list) =>
      list.some((x) => x.id === p.id) ? list.map((x) => (x.id === p.id ? p : x)) : [...list, p],
    );
  }

  function deleteProject(id: string) {
    setProjects((list) => list.filter((x) => x.id !== id));
  }

  if (view === "projects") {
    return (
      <Projects
        projects={projects}
        onSave={saveProject}
        onDelete={deleteProject}
        onClose={() => setView("home")}
      />
    );
  }

  if (view === "mine") {
    return (
      <MyActivities
        activities={custom}
        useStarter={useStarter}
        onSave={saveActivity}
        onDelete={deleteActivity}
        onToggleStarter={setUseStarter}
        onClose={() => setView("home")}
      />
    );
  }

  // What the speech bubble says right now
  let bubbleLead = "";
  let bubbleMain: string;
  if (phase === "thinking") {
    bubbleMain = thinkingText;
  } else if (doneNote) {
    bubbleMain = doneNote;
  } else if (activity) {
    bubbleLead = leadText;
    bubbleMain = `${activity.emoji} ${activity.text}`;
  } else {
    bubbleMain = now ? idleLineFor(moodId, now, tick) : mood.line;
  }

  // The most pressing project deadline (behind, overdue, or tight and close)
  const alert = loaded ? topAlert(projects, new Date()) : null;

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col px-5 pb-6 pt-5">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold leading-tight">Decider</h1>
          <p className="text-xs opacity-70">What should I do right now?</p>
        </div>
        <MenuButton
          items={[
            { icon: "✏️", label: "My activities", onSelect: () => setView("mine") },
            { icon: "📋", label: "Projects", onSelect: () => setView("projects") },
            { icon: "⏰", label: "Reminders", hint: "soon", disabled: true },
          ]}
        />
      </header>

      {alert && (
        <button
          onClick={() => setView("projects")}
          className={`mt-4 min-h-12 rounded-card px-4 py-2 text-left text-sm font-medium ${
            alert.level === "urgent" ? "bg-accent text-white" : "bg-surface"
          }`}
        >
          {alert.text}
        </button>
      )}

      <section className="flex flex-1 flex-col items-center justify-center gap-6 py-6">
        <Buddy face={faceForState(mood.face, phase)} state={phase} />
        <div
          key={bubbleMain}
          className="bubble-in max-w-xs rounded-card bg-surface px-5 py-4 text-center shadow-sm"
        >
          {bubbleLead && (
            <p className="mb-1 text-xs font-medium uppercase tracking-wide opacity-60">
              {bubbleLead}
            </p>
          )}
          <p className="text-lg leading-snug">{bubbleMain}</p>
        </div>
        {activity?.stepOf && phase !== "thinking" && !doneNote && (
          <button
            onClick={() => finishStep(activity)}
            className="min-h-12 rounded-card bg-surface px-6 font-semibold shadow-sm"
          >
            ✅ I did it
          </button>
        )}
      </section>

      <footer className="flex flex-col gap-3">
        <MoodPicker value={moodId} onChange={setMoodId} />
        <button
          onClick={handleDecide}
          disabled={phase === "thinking"}
          className="min-h-14 w-full rounded-card bg-accent text-lg font-semibold text-white disabled:opacity-60"
        >
          {phase === "thinking" ? "Thinking…" : "Decide for me"}
        </button>
      </footer>
    </main>
  );
}