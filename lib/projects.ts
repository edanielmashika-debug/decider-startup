// Projects: a big task split into small steps ("chunks") with a deadline.
// Everything here is plain data and safety checks. The scheduling is in planner.ts.

export type Chunk = {
  id: string;
  text: string;
  estimateMin: number; // how long it should take, in minutes
  done: boolean;
};

export type Project = {
  id: string;
  emoji: string;
  title: string;
  deadline: string; // "YYYY-MM-DD", your local date
  dailyMin: number; // how many minutes a day you can give it
  mixIn: boolean; // Step 8d.B: should today's steps also appear in "Decide for me"?
  chunks: Chunk[];
};

export const MAX_PROJECTS = 20;
export const MAX_CHUNKS = 60; // per project
export const MAX_TITLE_LENGTH = 60;
export const MAX_CHUNK_TEXT = 80;
export const MIN_ESTIMATE = 5;
export const MAX_ESTIMATE = 240;
export const DEFAULT_ESTIMATE = 30;
export const DAILY_CHOICES = [15, 30, 45, 60, 90, 120, 180];

export type Template = {
  id: string;
  emoji: string;
  label: string;
  steps: { text: string; estimateMin: number }[];
};

export const TEMPLATES: Template[] = [
  {
    id: "exam",
    emoji: "📚",
    label: "Study for an exam",
    steps: [
      { text: "List every topic the exam covers", estimateMin: 20 },
      { text: "Review notes: first third of the topics", estimateMin: 30 },
      { text: "Review notes: second third of the topics", estimateMin: 30 },
      { text: "Review notes: last third of the topics", estimateMin: 30 },
      { text: "Do practice questions", estimateMin: 45 },
      { text: "Fix the topics you got wrong", estimateMin: 30 },
      { text: "Make a one-page summary sheet", estimateMin: 30 },
      { text: "Final quick review", estimateMin: 20 },
    ],
  },
  {
    id: "report",
    emoji: "📝",
    label: "Write a report",
    steps: [
      { text: "Pick the topic and the main question", estimateMin: 15 },
      { text: "Gather your sources", estimateMin: 45 },
      { text: "Write an outline", estimateMin: 30 },
      { text: "Draft the introduction", estimateMin: 30 },
      { text: "Draft the main part", estimateMin: 60 },
      { text: "Draft the conclusion", estimateMin: 30 },
      { text: "Edit and fix the wording", estimateMin: 30 },
      { text: "Final check and hand in", estimateMin: 20 },
    ],
  },
  {
    id: "build",
    emoji: "🛠️",
    label: "Build something",
    steps: [
      { text: "Write what 'finished' looks like", estimateMin: 20 },
      { text: "Sketch the plan", estimateMin: 30 },
      { text: "Set up what you need", estimateMin: 30 },
      { text: "Build the core part", estimateMin: 60 },
      { text: "Build the second part", estimateMin: 60 },
      { text: "Test it", estimateMin: 30 },
      { text: "Fix what broke", estimateMin: 30 },
      { text: "Finish and show someone", estimateMin: 20 },
    ],
  },
];

export function newProjectId(): string {
  return `proj-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
}

export function newChunkId(): string {
  return `chunk-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 7)}`;
}

// "YYYY-MM-DD" that is also a real calendar date (not 2026-02-31)
export function isValidDateKey(s: unknown): s is string {
  if (typeof s !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [y, m, d] = s.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
}

function clampEstimate(n: unknown): number {
  const v = typeof n === "number" && Number.isFinite(n) ? Math.round(n) : DEFAULT_ESTIMATE;
  return Math.min(MAX_ESTIMATE, Math.max(MIN_ESTIMATE, v));
}

export function sanitizeChunk(x: unknown): Chunk | null {
  if (typeof x !== "object" || x === null) return null;
  const c = x as Record<string, unknown>;
  const text = typeof c.text === "string" ? c.text.trim().slice(0, MAX_CHUNK_TEXT) : "";
  if (typeof c.id !== "string" || c.id === "" || text === "") return null;
  return { id: c.id, text, estimateMin: clampEstimate(c.estimateMin), done: c.done === true };
}

// Turns anything (form values, saved data) into a safe Project, or null if unusable.
export function sanitizeProject(x: unknown): Project | null {
  if (typeof x !== "object" || x === null) return null;
  const p = x as Record<string, unknown>;

  const title = typeof p.title === "string" ? p.title.trim().slice(0, MAX_TITLE_LENGTH) : "";
  if (typeof p.id !== "string" || p.id === "" || title === "") return null;
  if (!isValidDateKey(p.deadline)) return null;

  const emoji =
    typeof p.emoji === "string" && p.emoji.trim() !== ""
      ? [...p.emoji.trim()].slice(0, 8).join("")
      : "📋";
  const dailyMin =
    typeof p.dailyMin === "number" && Number.isFinite(p.dailyMin)
      ? Math.min(480, Math.max(10, Math.round(p.dailyMin)))
      : 60;

  const chunks: Chunk[] = [];
  const seen = new Set<string>();
  if (Array.isArray(p.chunks)) {
    for (const item of p.chunks) {
      const c = sanitizeChunk(item);
      if (!c || seen.has(c.id)) continue;
      seen.add(c.id);
      chunks.push(c);
      if (chunks.length >= MAX_CHUNKS) break;
    }
  }

  return { id: p.id, emoji, title, deadline: p.deadline, dailyMin, mixIn: p.mixIn === true, chunks };
}

// Turns pasted text into steps: one step per line.
// A time can be added at the end after a spaced dash or bar: "Read chapter 3 - 45"
// or "Read chapter 3 | 45 min". No time means 30 minutes. Bullets and numbers
// at the start of a line ("- ", "1. ", "• ") are removed. Blank lines are skipped.
export function parseSteps(input: string): { text: string; estimateMin: number }[] {
  const out: { text: string; estimateMin: number }[] = [];
  for (const raw of input.split(/\r?\n/)) {
    let line = raw.trim().replace(/^(?:[-*•]\s+|\d{1,2}[.)]\s+)/, "").trim();
    if (line === "") continue;
    let estimateMin = DEFAULT_ESTIMATE;
    const m = line.match(/^(.*?)\s+[-–|]\s+(\d{1,3})(?:\s*(?:min|mins|m))?$/i);
    if (m && m[1].trim() !== "") {
      line = m[1].trim();
      estimateMin = clampEstimate(Number(m[2]));
    }
    out.push({ text: line.slice(0, MAX_CHUNK_TEXT), estimateMin });
  }
  return out;
}