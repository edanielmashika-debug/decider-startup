"use client";

import { useState } from "react";
import {
  DAILY_CHOICES,
  MAX_DESCRIPTION,
  MAX_CHUNKS,
  MAX_PROJECTS,
  MAX_TITLE_LENGTH,
  TEMPLATES,
  isValidDateKey,
  newChunkId,
  newProjectId,
  parseSteps,
  sanitizeProject,
  type Project,
} from "@/lib/projects";
import { addDays, dateKey, nextChunk, planProject, progressOf } from "@/lib/planner";

type Props = {
  projects: Project[];
  onSave: (p: Project) => void; // adds a new one or replaces one with the same id
  onDelete: (id: string) => void;
  onClose: () => void;
};

const inputClass =
  "w-full rounded-card border border-foreground/15 bg-surface px-4 py-3 text-base";

// "Today", "Tomorrow", or "Wed 4 Nov"
function dayLabel(key: string, todayKey: string): string {
  if (key === todayKey) return "Today";
  if (key === addDays(todayKey, 1)) return "Tomorrow";
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
}

function minutesText(min: number): string {
  if (min < 60) return `${min} min`;
  const h = Math.floor(min / 60);
  const r = min % 60;
  return r === 0 ? `${h} h` : `${h} h ${r} min`;
}

export default function Projects({ projects, onSave, onDelete, onClose }: Props) {
  // which screen: the list, the new-project form, or one project (by id)
  const [screen, setScreen] = useState<"list" | "new" | string>("list");
  const open = projects.find((p) => p.id === screen) ?? null;

  if (screen === "new") {
    return (
      <NewProject
        onCancel={() => setScreen("list")}
        onCreate={(p) => {
          onSave(p);
          setScreen(p.id);
        }}
      />
    );
  }

  if (open) {
    return (
      <ProjectDetail
        project={open}
        onChange={onSave}
        onDelete={() => {
          onDelete(open.id);
          setScreen("list");
        }}
        onBack={() => setScreen("list")}
      />
    );
  }

  const today = new Date();
  const todayKey = dateKey(today);

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Projects</h1>
        <button onClick={onClose} className="min-h-12 rounded-card bg-surface px-5 font-medium">
          Done
        </button>
      </header>

      <p className="text-sm opacity-70">
        Got something big? Split it into small steps and set a deadline. The buddy spreads the
        steps over the days for you.
      </p>

      {projects.length === 0 && (
        <p className="rounded-card bg-surface p-4 text-sm">
          No projects yet. A school project, a report, an exam: start one below.
        </p>
      )}

      <ul className="flex flex-col gap-3">
        {projects.map((p) => {
          const plan = planProject(p, today);
          const pct = Math.round(progressOf(p) * 100);
          let status: string;
          if (p.chunks.length === 0) status = "No steps yet";
          else if (plan.finished) status = "All done 🎉";
          else if (plan.overdue) status = "⚠️ Past the deadline";
          else if (plan.crunch) status = "🔥 Behind";
          else if (plan.pressure === "tight") status = "⏰ Tight";
          else status = `${plan.daysLeft} day${plan.daysLeft === 1 ? "" : "s"} left`;
          return (
            <li key={p.id}>
              <button
                onClick={() => setScreen(p.id)}
                className="flex min-h-14 w-full flex-col gap-2 rounded-card bg-surface p-4 text-left"
              >
                <span className="flex items-center justify-between gap-3">
                  <span className="font-semibold">
                    {p.emoji} {p.title}
                  </span>
                  <span className="shrink-0 text-xs opacity-70">{status}</span>
                </span>
                <span className="h-2 w-full overflow-hidden rounded-full bg-background">
                  <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
                </span>
                <span className="text-xs opacity-70">
                  {pct}% done · due {dayLabel(p.deadline, todayKey)}
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      <button
        onClick={() => setScreen("new")}
        disabled={projects.length >= MAX_PROJECTS}
        className="min-h-14 rounded-card bg-accent text-lg font-semibold text-white disabled:opacity-60"
      >
        + New project
      </button>
      {projects.length >= MAX_PROJECTS && (
        <p className="text-sm opacity-70">You can keep up to {MAX_PROJECTS} projects.</p>
      )}
    </main>
  );
}

function NewProject({
  onCancel,
  onCreate,
}: {
  onCancel: () => void;
  onCreate: (p: Project) => void;
}) {
  const todayKey = dateKey(new Date());
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [deadline, setDeadline] = useState(addDays(todayKey, 7));
  const [dailyMin, setDailyMin] = useState(60);
  const [templateId, setTemplateId] = useState<string>("blank");
  const [error, setError] = useState("");

  function submit() {
    if (!isValidDateKey(deadline) || deadline < todayKey) {
      setError("Pick a deadline that is today or later.");
      return;
    }
    const template = TEMPLATES.find((t) => t.id === templateId);
    const clean = sanitizeProject({
      id: newProjectId(),
      emoji: template?.emoji ?? "📋",
      title,
      description,
      deadline,
      dailyMin,
      mixIn: true, // new projects join "Decide for me" (you can switch it off in Settings)
      chunks: (template?.steps ?? []).map((s) => ({
        id: newChunkId(),
        text: s.text,
        estimateMin: s.estimateMin,
        done: false,
      })),
    });
    if (!clean) {
      setError("Give the project a name.");
      return;
    }
    onCreate(clean);
  }

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-5 px-5 py-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">New project</h1>
        <button onClick={onCancel} className="min-h-12 rounded-card bg-surface px-5 font-medium">
          Cancel
        </button>
      </header>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        maxLength={MAX_TITLE_LENGTH}
        placeholder="Title Of Project"
        aria-label="Title of project"
        className={inputClass}
      />

      <textarea
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        maxLength={MAX_DESCRIPTION}
        rows={4}
        placeholder="Describe the project (optional)"
        aria-label="Project description"
        className={`${inputClass} resize-none`}
      />

      <label className="flex flex-col gap-2">
        <span className="text-sm opacity-70">Deadline</span>
        <input
          type="date"
          value={deadline}
          min={todayKey}
          onChange={(e) => setDeadline(e.target.value)}
          className={inputClass}
        />
      </label>

      <label className="flex flex-col gap-2">
        <span className="text-sm opacity-70">Time you can give it each day</span>
        <select
          value={dailyMin}
          onChange={(e) => setDailyMin(Number(e.target.value))}
          className={inputClass}
        >
          {DAILY_CHOICES.map((m) => (
            <option key={m} value={m}>
              {minutesText(m)}
            </option>
          ))}
        </select>
      </label>

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-1 font-semibold">Break it into steps</legend>
        <p className="text-sm opacity-70">
          A step is one small piece of the big task, like "Read chapter 3". The buddy spreads your
          steps over the days until the deadline. Pick a ready-made set of steps to begin with, or
          start empty and write your own. You can change, add or delete steps afterwards.
        </p>
        <div className="mt-1 flex flex-col gap-2">
          {[
            { id: "blank", emoji: "✍️", label: "Start empty", note: "I'll write my own steps", count: 0, min: 0 },
            ...TEMPLATES.map((t) => ({
              id: t.id,
              emoji: t.emoji,
              label: t.label,
              note: "",
              count: t.steps.length,
              min: t.steps.reduce((sum, x) => sum + x.estimateMin, 0),
            })),
          ].map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={templateId === t.id}
              onClick={() => setTemplateId(t.id)}
              className={`flex min-h-14 flex-col justify-center rounded-card px-4 py-2 text-left ${
                templateId === t.id ? "bg-accent text-white" : "bg-surface"
              }`}
            >
              <span className="font-medium">
                {t.emoji} {t.label}
              </span>
              <span className="text-xs opacity-80">
                {t.count > 0 ? `${t.count} ready-made steps · about ${minutesText(t.min)} in all` : t.note}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {error && <p className="text-sm font-medium">⚠️ {error}</p>}

      <button
        onClick={submit}
        className="min-h-14 rounded-card bg-accent text-lg font-semibold text-white"
      >
        Create project
      </button>
    </main>
  );
}

function ProjectDetail({
  project,
  onChange,
  onDelete,
  onBack,
}: {
  project: Project;
  onChange: (p: Project) => void;
  onDelete: () => void;
  onBack: () => void;
}) {
  const today = new Date();
  const todayKey = dateKey(today);
  const plan = planProject(project, today);
  const pct = Math.round(progressOf(project) * 100);
  const doneChunks = project.chunks.filter((c) => c.done);
  const next = nextChunk(project);

  const [stepsText, setStepsText] = useState("");
  const [error, setError] = useState("");
  const [confirmDelete, setConfirmDelete] = useState(false);

  function toggleDone(id: string) {
    onChange({
      ...project,
      chunks: project.chunks.map((c) => (c.id === id ? { ...c, done: !c.done } : c)),
    });
  }

  function removeChunk(id: string) {
    onChange({ ...project, chunks: project.chunks.filter((c) => c.id !== id) });
  }

  function addSteps() {
    const parsed = parseSteps(stepsText);
    if (parsed.length === 0) {
      setError("Type at least one step.");
      return;
    }
    const room = MAX_CHUNKS - project.chunks.length;
    if (room <= 0) {
      setError(`A project can hold up to ${MAX_CHUNKS} steps.`);
      return;
    }
    const added = parsed.slice(0, room).map((s) => ({
      id: newChunkId(),
      text: s.text,
      estimateMin: s.estimateMin,
      done: false,
    }));
    const clean = sanitizeProject({ ...project, chunks: [...project.chunks, ...added] });
    if (!clean) return;
    onChange(clean);
    setStepsText("");
    setError(
      parsed.length > room ? `Only the first ${room} steps fit (limit ${MAX_CHUNKS}).` : "",
    );
  }

  function changeDeadline(value: string) {
    if (!isValidDateKey(value)) return; // ignore a half-typed date
    onChange({ ...project, deadline: value });
  }

  const row = (id: string, text: string, min: number, done: boolean) => (
    <li key={id} className="flex items-center gap-2 rounded-card bg-surface p-2">
      <button
        onClick={() => toggleDone(id)}
        aria-label={done ? `Mark not done: ${text}` : `Mark done: ${text}`}
        aria-pressed={done}
        className={`min-h-12 min-w-12 rounded-card ${done ? "bg-accent text-white" : "bg-background"}`}
      >
        {done ? "✓" : ""}
      </button>
      <span className={`flex-1 px-1 ${done ? "line-through opacity-60" : ""}`}>
        {text}
        <span className="block text-xs opacity-70">{minutesText(min)}</span>
      </span>
      <button
        onClick={() => removeChunk(id)}
        aria-label={`Delete step: ${text}`}
        className="min-h-12 min-w-12 rounded-card bg-background"
      >
        🗑️
      </button>
    </li>
  );

  return (
    <main className="mx-auto flex min-h-dvh max-w-md flex-col gap-6 px-5 py-8">
      <header className="flex items-center justify-between gap-3">
        <h1 className="text-xl font-bold leading-tight">
          {project.emoji} {project.title}
        </h1>
        <button onClick={onBack} className="min-h-12 shrink-0 rounded-card bg-surface px-5 font-medium">
          Back
        </button>
      </header>

      {project.description && (
        <p className="whitespace-pre-wrap rounded-card bg-surface p-4 text-sm">
          {project.description}
        </p>
      )}

      <section className="flex flex-col gap-2 rounded-card bg-surface p-4">
        <span className="h-2 w-full overflow-hidden rounded-full bg-background">
          <span className="block h-full bg-accent" style={{ width: `${pct}%` }} />
        </span>
        <p className="text-sm">
          {pct}% done · {minutesText(plan.remainingMin)} left · due{" "}
          {dayLabel(project.deadline, todayKey)}
        </p>
        {plan.finished && project.chunks.length > 0 && (
          <p className="font-medium">All steps done. Well done! 🎉</p>
        )}
        {plan.overdue && (
          <p className="text-sm font-medium">
            ⚠️ The deadline has passed. Every unfinished step is on today. Move the deadline below
            if you got more time.
          </p>
        )}
        {plan.crunch && !plan.overdue && (
          <p className="text-sm font-medium">
            🔥 You are behind. Finishing by the deadline needs about{" "}
            {minutesText(plan.neededPerDay)} a day (you set {minutesText(project.dailyMin)}). The
            plan below squeezes the steps into the days left. If that is too much, move the
            deadline or delete a step.
          </p>
        )}
        {plan.pressure === "tight" && (
          <p className="text-sm font-medium">⏰ Tight: little time to spare. Keep going.</p>
        )}
      </section>

      {next && (
        <section className="flex items-center gap-3 rounded-card bg-accent p-4 text-white">
          <span className="flex-1">
            <span className="block text-xs font-medium uppercase tracking-wide opacity-80">
              Next up
            </span>
            {next.text}
            <span className="block text-xs opacity-80">{minutesText(next.estimateMin)}</span>
          </span>
          <button
            onClick={() => toggleDone(next.id)}
            aria-label={`Mark done: ${next.text}`}
            className="min-h-12 shrink-0 rounded-card bg-white/20 px-4 font-semibold"
          >
            ✓ Done
          </button>
        </section>
      )}

      {project.chunks.length === 0 && (
        <p className="rounded-card bg-surface p-4 text-sm">
          No steps yet. Add some below, one per line.
        </p>
      )}

      {plan.days.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="font-semibold">Plan</h2>
          {plan.days.map((day) => (
            <div key={day.date} className="flex flex-col gap-2">
              <h3 className="text-sm font-medium opacity-80">
                {dayLabel(day.date, todayKey)} · {minutesText(day.minutes)}
                {day.minutes > project.dailyMin &&
                  !day.chunks.every((c) => c.estimateMin > project.dailyMin) &&
                  " · over your daily time"}
              </h3>
              <ul className="flex flex-col gap-2">
                {day.chunks.map((c) => row(c.id, c.text, c.estimateMin, false))}
              </ul>
            </div>
          ))}
        </section>
      )}

      {doneChunks.length > 0 && (
        <section className="flex flex-col gap-2">
          <h2 className="font-semibold">Done ({doneChunks.length})</h2>
          <ul className="flex flex-col gap-2">
            {doneChunks.map((c) => row(c.id, c.text, c.estimateMin, true))}
          </ul>
        </section>
      )}

      <section className="flex flex-col gap-3 rounded-card bg-surface p-4">
        <h2 className="font-semibold">Add steps</h2>
        <textarea
          value={stepsText}
          onChange={(e) => setStepsText(e.target.value)}
          rows={4}
          placeholder={"One step per line.\nAdd minutes at the end:\nRead chapter 3 - 45"}
          aria-label="Steps, one per line"
          className={inputClass}
        />
        <p className="text-sm opacity-70">No time at the end means 30 minutes.</p>
        {error && <p className="text-sm font-medium">⚠️ {error}</p>}
        <button
          onClick={addSteps}
          className="min-h-12 rounded-card bg-accent font-semibold text-white"
        >
          Add steps
        </button>
      </section>

      <section className="flex flex-col gap-3 rounded-card bg-surface p-4">
        <h2 className="font-semibold">Settings</h2>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-70">Description</span>
          <textarea
            value={project.description}
            onChange={(e) => onChange({ ...project, description: e.target.value.slice(0, MAX_DESCRIPTION) })}
            rows={3}
            className={`${inputClass} resize-none`}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-70">Deadline</span>
          <input
            type="date"
            value={project.deadline}
            onChange={(e) => changeDeadline(e.target.value)}
            className={inputClass}
          />
        </label>
        <label className="flex flex-col gap-2">
          <span className="text-sm opacity-70">Time you can give it each day</span>
          <select
            value={project.dailyMin}
            onChange={(e) => onChange({ ...project, dailyMin: Number(e.target.value) })}
            className={inputClass}
          >
            {[...new Set([...DAILY_CHOICES, project.dailyMin])]
              .sort((a, b) => a - b)
              .map((m) => (
                <option key={m} value={m}>
                  {minutesText(m)}
                </option>
              ))}
          </select>
        </label>
        <label className="flex min-h-12 items-center gap-3 rounded-card bg-background px-4">
          <input
            type="checkbox"
            checked={project.mixIn}
            onChange={(e) => onChange({ ...project, mixIn: e.target.checked })}
            className="size-5"
          />
          <span>Suggest today's steps in "Decide for me"</span>
        </label>
        <p className="text-sm opacity-70">
          On: today's steps get picked more often, and a lot more as the deadline gets close or you
          fall behind. Off: the steps stay private in here.
        </p>
        <p className="text-sm opacity-70">
          The plan updates by itself: finish a step early and the rest move up, skip a day and the
          rest spread over the days left. With 3 or more days, the deadline day stays free as a
          buffer.
        </p>
      </section>

      {confirmDelete ? (
        <div className="flex gap-3">
          <button
            onClick={onDelete}
            className="min-h-12 flex-1 rounded-card bg-accent font-semibold text-white"
          >
            Yes, delete this project
          </button>
          <button
            onClick={() => setConfirmDelete(false)}
            className="min-h-12 rounded-card bg-surface px-5"
          >
            Keep
          </button>
        </div>
      ) : (
        <button
          onClick={() => setConfirmDelete(true)}
          className="min-h-12 rounded-card bg-surface font-medium"
        >
          🗑️ Delete project
        </button>
      )}
    </main>
  );
}