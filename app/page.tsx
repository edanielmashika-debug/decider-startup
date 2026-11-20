"use client";

import { useEffect, useRef, useState } from "react";
import Buddy from "@/components/Buddy";
import MenuButton from "@/components/MenuButton";
import MoodPicker from "@/components/MoodPicker";
import MyActivities from "@/components/MyActivities";
import Projects from "@/components/Projects";
import Reminders from "@/components/Reminders";
import { useIdleColor } from "@/hooks/useIdleColor";
import { usePwa } from "@/hooks/usePwa";
import { MOODS, DEFAULT_MOOD, type MoodId } from "@/lib/moods";
import { decide } from "@/lib/decide";
import type { Activity } from "@/lib/activities";
import type { Project } from "@/lib/projects";
import { buildPool } from "@/lib/pool";
import { stepActivities, stepProgress } from "@/lib/projectPool";
import { topAlert } from "@/lib/planner";
import { canTrack, forget, record, type Stats } from "@/lib/learn";
import { loadState, saveState } from "@/lib/storage";
import { faceForState, type BuddyPhase } from "@/lib/buddyStates";
import { idleLineFor, thinkingLineFor, leadLineFor } from "@/lib/lines";
import { DEFAULT_REMINDERS, inActiveHours, nextDueAt, notificationText, showPickNotification, type ReminderSettings } from "@/lib/reminders";
import { sentenceFor, speak, stopSpeaking, unlockSpeech, voiceSupported } from "@/lib/voice";

export default function Home() {
  useIdleColor();
  const { canInstall, install } = usePwa(); // installable app (Step 10)
  const [moodId, setMoodId] = useState<MoodId>(DEFAULT_MOOD);
  const [activity, setActivity] = useState<Activity | null>(null);
  const [recentIds, setRecentIds] = useState<string[]>([]);
  const [phase, setPhase] = useState<BuddyPhase>("idle");
  const [loaded, setLoaded] = useState(false);
  const [custom, setCustom] = useState<Activity[]>([]);
  const [useStarter, setUseStarter] = useState(true);
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<Stats>({}); // what you did and skipped (Step 8c)
  const [voiceOn, setVoiceOn] = useState(false); // does the buddy speak its picks? (Step 9)
  const [voiceOk, setVoiceOk] = useState(false); // can this phone speak at all?
  const [reminders, setReminders] = useState<ReminderSettings>({ ...DEFAULT_REMINDERS }); // Step 10b
  const lastAuto = useRef(0); // when the buddy last decided on its own
  const autoRef = useRef<() => boolean>(() => false);
  const [view, setView] = useState<"home" | "mine" | "projects" | "reminders">("home");
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
      setStats(saved.stats);
      setVoiceOn(saved.voiceOn);
      setReminders(saved.reminders);
    }
    setVoiceOk(voiceSupported());
    setNow(new Date());
    setTick(Math.floor(Math.random() * 1000)); // start on a different line each visit
    setLoaded(true);
  }, []);

  // After that: save whenever something saved changes
  useEffect(() => {
    if (!loaded) return;
    saveState({ moodId, recentIds, customActivities: custom, useStarter, projects, stats, voiceOn, reminders });
  }, [loaded, moodId, recentIds, custom, useStarter, projects, stats, voiceOn, reminders]);

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
    return () => {
      timers.current.forEach(clearTimeout);
      stopSpeaking(); // leaving the page: be quiet
    };
  }, []);

  // The button calls this. (decideNow takes the stats as an argument so that
  // "Skip" can use the skip it just recorded, before React has updated `stats`.)
  // Pressing "Decide for me" again while a suggestion is still showing (you did not tap
  // "I did it") counts as a skip of that suggestion. (A-014)
  function handleDecide() {
    if (phase === "thinking") return;
    if (activity && canTrack(activity.id)) {
      const next = record(stats, activity.id, "skipped");
      setStats(next);
      decideNow(next);
      return;
    }
    decideNow(stats);
  }

  function decideNow(learned: Stats) {
    if (phase === "thinking") return;
    stopSpeaking(); // a new pick cuts off the old one
    if (voiceOn) unlockSpeech(); // runs inside the tap, so the phone allows the speech that follows
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
        stats: learned,
      });
      const lead = leadLineFor(moodId);
      setActivity(pick);
      setLeadText(lead);
      if (voiceOn) speak(sentenceFor(lead, `${pick.emoji} ${pick.text}`), moodId);
      setRecentIds((ids) => [...ids, pick.id].slice(-10));
      setPhase("excited");

      const calmTimer = setTimeout(() => setPhase("idle"), 2500);
      timers.current.push(calmTimer);
    }, 900);
    timers.current = [thinkTimer];
  }

  // Auto-decide (Step 10b): the buddy picks for you on its own. It does not count as a skip.
  // Returns true when it decided, false when it could not right now (it tries again soon).
  function autoDecide(): boolean {
    if (phase === "thinking") return false;
    const hidden = document.visibilityState !== "visible";
    if (!hidden && view !== "home") return false; // not while you are in another screen
    timers.current.forEach(clearTimeout);
    setDoneNote("");
    const pick = decide({
      now: new Date(),
      recentIds,
      pool: buildPool(custom, useStarter, stepActivities(projects, new Date())),
      tuning: mood.tuning,
      stats,
    });
    const lead = leadLineFor(moodId);
    setActivity(pick);
    setLeadText(lead);
    setRecentIds((ids) => [...ids, pick.id].slice(-10));
    setPhase("excited");
    timers.current = [setTimeout(() => setPhase("idle"), 2500)];
    if (hidden) {
      if (reminders.notify) {
        const n = notificationText(lead, `${pick.emoji} ${pick.text}`);
        void showPickNotification(n.title, n.body);
      }
    } else if (voiceOn) {
      speak(sentenceFor(lead, `${pick.emoji} ${pick.text}`), moodId);
    }
    return true;
  }

  // keep the timer's copy of autoDecide up to date with the latest state
  useEffect(() => {
    autoRef.current = autoDecide;
  });

  useEffect(() => {
    if (!loaded || !reminders.on) return;
    lastAuto.current = Date.now();
    function check() {
      const t = Date.now();
      if (t < nextDueAt(lastAuto.current, reminders.everyMin)) return;
      if (!inActiveHours(new Date(t), reminders.fromHour, reminders.toHour)) {
        lastAuto.current = t; // quiet hours: skip this one
        return;
      }
      if (autoRef.current()) lastAuto.current = t;
    }
    const id = setInterval(check, 15_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, [loaded, reminders.on, reminders.everyMin, reminders.fromHour, reminders.toHour]);

  function saveActivity(a: Activity) {
    setCustom((list) =>
      list.some((x) => x.id === a.id) ? list.map((x) => (x.id === a.id ? a : x)) : [...list, a],
    );
  }

  function deleteActivity(id: string) {
    setCustom((list) => list.filter((x) => x.id !== id));
    setRecentIds((ids) => ids.filter((x) => x !== id));
    setStats((s) => forget(s, id));
  }

  // "I did it" on a picked project step: tick it off and say well done
  function finishStep(a: Activity) {
    stopSpeaking();
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

  // "I did it" on a normal activity: remember it, so similar picks come up more
  function finishActivity(a: Activity) {
    if (a.stepOf) return finishStep(a);
    stopSpeaking();
    if (canTrack(a.id)) setStats((s) => record(s, a.id, "done"));
    setActivity(null);
    setDoneNote("Nice! ✅ Noted. I'll suggest this one more often.");
    const t = setTimeout(() => setDoneNote(""), 6000);
    timers.current.push(t);
  }

  // "Skip": remember it, then pick something else straight away
  function skipActivity(a: Activity) {
    const next = canTrack(a.id) ? record(stats, a.id, "skipped") : stats;
    setStats(next);
    decideNow(next);
  }

  // Menu item: turn the buddy voice on or off. Turning it on says a short hello, so you
  // can hear it works (this runs inside the tap, so the phone allows it).
  function toggleVoice() {
    if (voiceOn) {
      stopSpeaking();
      setVoiceOn(false);
    } else {
      setVoiceOn(true);
      speak("Hi! I can talk now.", moodId);
    }
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

  if (view === "reminders") {
    return <Reminders settings={reminders} onChange={setReminders} onClose={() => setView("home")} />;
  }

  if (view === "mine") {
    return (
      <MyActivities
        activities={custom}
        useStarter={useStarter}
        onSave={saveActivity}
        onDelete={deleteActivity}
        onToggleStarter={setUseStarter}
        stats={stats}
        onForgetLearning={() => setStats({})}
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

  // Small print under a suggested project step: which step, how much is left (A-015)
  const progress = activity?.stepOf ? stepProgress(projects, activity.stepOf) : null;

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
            voiceOk
              ? { icon: voiceOn ? "🔊" : "🔇", label: "Buddy voice", hint: voiceOn ? "on" : "off", onSelect: toggleVoice }
              : { icon: "🔇", label: "Buddy voice", hint: "not on this phone", disabled: true },
            ...(canInstall ? [{ icon: "📲", label: "Install app", hint: "add to home", onSelect: install }] : []),
            { icon: "⏰", label: "Reminders", hint: reminders.on ? "on" : "off", onSelect: () => setView("reminders") },
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
          {progress && phase !== "thinking" && !doneNote && (
            <p className="mt-2 text-xs opacity-60">
              {progress.emoji} Step {progress.index} of {progress.total} · {progress.percentLeft}% left
            </p>
          )}
        </div>
        {activity && phase !== "thinking" && !doneNote && (
          <div className="flex gap-3">
            <button
              onClick={() => finishActivity(activity)}
              className="min-h-12 rounded-card bg-surface px-6 font-semibold shadow-sm"
            >
              ✅ I did it
            </button>
            <button
              onClick={() => skipActivity(activity)}
              className="min-h-12 rounded-card bg-surface px-6 font-medium shadow-sm"
            >
              ⏭ Skip
            </button>
          </div>
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