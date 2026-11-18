import type { Activity } from "@/lib/activities";
import { TIMES } from "@/lib/activities";
import type { Project } from "@/lib/projects";
import { planProject, progressOf, todaysChunks, type Pressure } from "@/lib/planner";

// How much more likely today's steps are to be picked, by how pressed the project is.
// Steps also get priority High once the deadline is close (see below).
// These multiply the normal weight and are NOT softened by the Chill mood.
export const STEP_BOOST: Record<Pressure, number> = {
  done: 0,
  calm: 1.5,
  tight: 1.5,
  crunch: 3,
  overdue: 4,
};

// Today's steps of every project that is "mixed into Decide", as activities.
// Private projects, finished steps and projects with nothing planned today give nothing.
export function stepActivities(projects: Project[], today: Date): Activity[] {
  const out: Activity[] = [];
  for (const p of projects) {
    if (!p.mixIn) continue;
    const plan = planProject(p, today);
    if (plan.finished) continue;
    for (const c of todaysChunks(p, today)) {
      out.push({
        id: `step:${p.id}:${c.id}`,
        emoji: p.emoji,
        text: `${p.title}: ${c.text}`,
        category: "learn",
        times: [...TIMES],
        priority: plan.pressure === "calm" ? "normal" : "high",
        boost: STEP_BOOST[plan.pressure],
        stepOf: { projectId: p.id, chunkId: c.id },
      });
    }
  }
  return out;
}

// Where a picked project step stands: its project, which step it is, and how much is left.
// Shown in small print under the suggestion. Null if the project or step no longer exists.
export type StepProgress = { title: string; emoji: string; index: number; total: number; percentLeft: number };

export function stepProgress(projects: Project[], ref: { projectId: string; chunkId: string }): StepProgress | null {
  const p = projects.find((x) => x.id === ref.projectId);
  if (!p) return null;
  const index = p.chunks.findIndex((c) => c.id === ref.chunkId);
  if (index < 0) return null;
  return {
    title: p.title,
    emoji: p.emoji,
    index: index + 1,
    total: p.chunks.length,
    percentLeft: 100 - Math.round(progressOf(p) * 100),
  };
}