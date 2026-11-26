import { isComplete, type Task } from "./task-model";
export type Row = { task: Task; id: string; parent?: Row; depth: number };
export function flatten(tasks: Task[], parent?: Row): Row[] {
  return tasks.flatMap((task) => {
    const row: Row = {
      task,
      id: parent ? `${parent.id}.${task.id}` : task.id,
      parent,
      depth: parent ? parent.depth + 1 : 0,
    };
    return [row, ...flatten(task.subtasks, row)];
  });
}
export function milestone(task: Task): string {
  const meta = task.raw.metadata;
  const value =
    task.raw.milestone ??
    (meta && typeof meta === "object"
      ? (meta as Record<string, unknown>).milestone
      : undefined);
  if (typeof value === "string" || typeof value === "number")
    return String(value);
  if (value && typeof value === "object") {
    const v = value as Record<string, unknown>;
    for (const key of ["name", "title", "id"])
      if (typeof v[key] === "string" || typeof v[key] === "number")
        return String(v[key]);
  }
  const line = task.details.match(/^Milestone:\s*(.+)$/im);
  return line?.[1]?.trim() || "No milestone";
}
export function dependencies(row: Row, rows: Row[]) {
  return row.task.dependencies.map((id) => {
    const scoped = rows.filter(
      (r) => r.task.source === row.task.source && r.task.tag === row.task.tag,
    );
    // Bare subtask references address siblings; dotted IDs address explicit paths.
    const qualified =
      !id.includes(".") && row.parent ? `${row.parent.id}.${id}` : id;
    const target = scoped.find((r) => r.id === qualified);
    return {
      id: qualified,
      target,
      satisfied: !!target && isComplete(target.task.status),
    };
  });
}
export const unfinished = (row: Row) => !isComplete(row.task.status);
export function isReady(row: Row, rows: Row[]) {
  return (
    ["pending", "in-progress"].includes(row.task.status) &&
    dependencies(row, rows).every((d) => d.satisfied) &&
    (!row.parent || dependencies(row.parent, rows).every((d) => d.satisfied))
  );
}
export function dependents(row: Row, rows: Row[]) {
  return rows.filter((r) =>
    dependencies(r, rows).some((d) => d.target?.task.key === row.task.key),
  );
}
export function nextTask(rows: Row[], context = rows): Row | undefined {
  const rank: Record<string, number> = {
    critical: 0,
    high: 1,
    medium: 2,
    low: 3,
  };
  const eligible = rows.filter((r) => isReady(r, context));
  // Task Master list gives ready subtasks of an active parent precedence.
  const children = eligible.filter(
    (r) => r.parent?.task.status === "in-progress",
  );
  const candidates = children.length
    ? children
    : eligible.filter((r) => r.depth === 0);
  return candidates.sort(
    (a, b) =>
      (rank[a.task.priority] ?? 2) - (rank[b.task.priority] ?? 2) ||
      a.task.dependencies.length - b.task.dependencies.length ||
      a.id.localeCompare(b.id, undefined, { numeric: true }) ||
      a.task.key.localeCompare(b.task.key),
  )[0];
}
export type Filters = {
  tag: string;
  priority: string;
  status: string;
  readiness: string;
  query: string;
  milestone?: string;
  source?: string;
};
export function filterTasks(
  tasks: Task[],
  filters: Filters,
  rows = flatten(tasks),
) {
  return tasks.filter((task) => {
    const row = rows.find((r) => r.task.key === task.key)!;
    const searchable = flatten([task])
      .map((r) => `${r.id} ${r.task.title} ${r.task.description}`)
      .join(" ");
    return (
      (!filters.milestone ||
        filters.milestone === "all" ||
        milestone(task) === filters.milestone) &&
      (!filters.source ||
        filters.source === "all" ||
        task.source === filters.source) &&
      (filters.tag === "all" || task.tag === filters.tag) &&
      (filters.priority === "all" || task.priority === filters.priority) &&
      (filters.status === "all" || task.status === filters.status) &&
      searchable.toLowerCase().includes(filters.query.toLowerCase()) &&
      (filters.readiness === "all" ||
        (filters.readiness === "ready" && isReady(row, rows)) ||
        (filters.readiness === "blocked" &&
          unfinished(row) &&
          (task.status === "blocked" ||
            dependencies(row, rows).some((d) => !d.satisfied))) ||
        (filters.readiness === "blocking" && dependents(row, rows).length > 0))
    );
  });
}
export function dependencyIssues(rows: Row[]): string[] {
  const issues = new Set<string>(),
    state = new Map<string, number>();
  const visit = (row: Row) => {
    const color = state.get(row.task.key) || 0;
    if (color === 1) {
      issues.add(`${row.task.tag} #${row.id}: dependency cycle`);
      return;
    }
    if (color === 2) return;
    state.set(row.task.key, 1);
    for (const dep of dependencies(row, rows)) {
      if (dep.target) visit(dep.target);
      else
        issues.add(`${row.task.tag} #${row.id}: missing dependency #${dep.id}`);
    }
    state.set(row.task.key, 2);
  };
  for (const row of rows) visit(row);
  return [...issues];
}
