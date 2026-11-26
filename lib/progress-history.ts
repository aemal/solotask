import { isComplete, type Task } from "./task-model";
import { flatten } from "./views";
export type ProgressSample = { at: number; groups: Record<string, { total: number; completed: number }> };
export const PROGRESS_WINDOW = 10 * 60 * 1000;
export const PROGRESS_WINDOWS = [
  { label: "Last 10 min", ms: PROGRESS_WINDOW },
  { label: "Last 30 min", ms: 30 * 60 * 1000 },
  { label: "Last 1 hour", ms: 60 * 60 * 1000 },
  { label: "Last 3 hours", ms: 3 * 60 * 60 * 1000 },
] as const;
export const PROGRESS_RETENTION = 3 * 60 * 60 * 1000 + 120000;
export const MAX_PROGRESS_SAMPLES = 365;
export function sampleProgress(tasks: Task[], at: number): ProgressSample {
  const groups: ProgressSample["groups"] = {};
  for (const row of flatten(tasks)) {
    if (row.depth > 1) continue;
    for (const tag of ["*", `tag:${row.task.tag}`]) {
      const key = `${tag}/${row.depth}`;
      const group = groups[key] ||= { total: 0, completed: 0 };
      group.total++;
      if (isComplete(row.task.status)) group.completed++;
    }
  }
  return { at, groups };
}
export function recordProgress(history: ProgressSample[], tasks: Task[], now: number): ProgressSample[] {
  const recent = history.filter(s => s.at >= now - PROGRESS_RETENTION && s.at <= now);
  if (!recent.length || now - recent[recent.length - 1].at >= 30000)
    recent.push(sampleProgress(tasks, now));
  return recent.slice(-MAX_PROGRESS_SAMPLES);
}
export function progressDelta(history: ProgressSample[] = [], tag = "all", depth = 0, now = Date.now(), windowMs: number = PROGRESS_WINDOW) {
  const target = now - windowMs;
  const baseline = [...history].reverse().find(s => s.at <= target);
  // Reject stale baselines after the server/browser has stopped observing a project.
  if (!baseline || target - baseline.at > 90000) return null;
  const latest = history[history.length - 1];
  if (!latest || now - latest.at > 90000 || history.some((s, i) => i > 0 && s.at > baseline.at && s.at - history[i - 1].at > 90000)) return null;
  const key = `${tag === "all" ? "*" : `tag:${tag}`}/${depth}`;
  const before = baseline.groups[key] || { total: 0, completed: 0 };
  const after = latest.groups[key] || { total: 0, completed: 0 };
  if (!before.total || !after.total) return null;
  return { points: (after.completed / after.total - before.completed / before.total) * 100, completed: after.completed - before.completed, totalChanged: after.total !== before.total };
}
