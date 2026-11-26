import { isComplete, type Task } from "./task-model";
import {
  flatten,
  dependencies,
  dependents,
  isReady,
  nextTask,
  unfinished,
} from "./views";
export const statusNames = [
  "done",
  "in-progress",
  "review",
  "pending",
  "blocked",
  "deferred",
  "cancelled",
];
export function statusSummary(tasks: Task[]) {
  const counts: Record<string, number> = Object.fromEntries(
    statusNames.map((s) => [s, 0]),
  );
  for (const task of tasks)
    counts[task.status] = (counts[task.status] || 0) + 1;
  const completed = tasks.filter((t) => isComplete(t.status)).length;
  return {
    counts,
    total: tasks.length,
    completed,
    percent: tasks.length ? Math.round((completed / tasks.length) * 100) : 0,
  };
}
export function dashboard(tasks: Task[], allTasks = tasks) {
  const rows = flatten(allTasks),
    selected = flatten(tasks),
    roots = selected.filter((r) => !r.parent),
    children = selected.filter((r) => r.depth === 1);
  const blocked = roots.filter(
    (r) => unfinished(r) && dependencies(r, rows).some((d) => !d.satisfied),
  );
  const most = [...roots].sort(
    (a, b) =>
      dependents(b, rows).length - dependents(a, rows).length ||
      a.id.localeCompare(b.id, undefined, { numeric: true }),
  )[0];
  return {
    tasks: statusSummary(tasks),
    subtasks: statusSummary(children.map((r) => r.task)),
    deepSubtasks: selected.filter((r) => r.depth > 1).length,
    ready: roots.filter((r) => isReady(r, rows)),
    blocked,
    noDependencies: roots.filter(
      (r) => unfinished(r) && !r.task.dependencies.length,
    ).length,
    mostDependedOn:
      most && dependents(most, rows).length
        ? { row: most, count: dependents(most, rows).length }
        : null,
    average: tasks.length
      ? tasks.reduce((n, t) => n + t.dependencies.length, 0) / tasks.length
      : 0,
    priorities: tasks.reduce(
      (counts, t) => {
        counts[t.priority] = (counts[t.priority] || 0) + 1;
        return counts;
      },
      {} as Record<string, number>,
    ),
    next: nextTask(selected, rows),
    analyzed: tasks.filter((t) => t.complexity !== null).length,
  };
}
