import { recordProgress, type ProgressSample } from "./progress-history";
import { updateTiming, type TimingStore } from "./timing";
import { mkdir, readFile, writeFile, rename } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import type { Task } from "./task-model";
import { flatten } from "./views";
import {
  newestActivity,
  type ActivityEvent,
  type ActivityFeed,
} from "./activity-model";
type Snapshot = {
  key: string;
  id: string;
  title: string;
  tag: string;
  source: string;
  depth: number;
  raw: Record<string, unknown>;
};
type State = {
  progressHistory?: ProgressSample[];
  timing?: TimingStore;
  version: 1;
  startedAt: string;
  snapshot: Snapshot[];
  events: ActivityEvent[];
};
const queue = new Map<string, Promise<unknown>>();
const stable = (v: unknown): string => {
  if (Array.isArray(v)) return `[${v.map(stable).join(",")}]`;
  if (v && typeof v === "object")
    return `{${Object.entries(v)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${JSON.stringify(k)}:${stable(v)}`)
      .join(",")}}`;
  return JSON.stringify(v) ?? "null";
};
const timestampKeys = new Set([
  "createdAt",
  "updatedAt",
  "modifiedAt",
  "lastModifiedAt",
  "lastUpdatedAt",
  "created_at",
  "updated_at",
  "modified_at",
]);
function meaningful(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(meaningful);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .filter(([key]) => !timestampKeys.has(key))
        .map(([key, value]) => [key, meaningful(value)]),
    );
  return value;
}
function reportedTime(
  task: Snapshot,
  old: Snapshot | undefined,
  added: boolean,
  observedAt: string,
): string | undefined {
  const keys = added
    ? ["createdAt", "created_at", "updatedAt", "updated_at"]
    : [
        "updatedAt",
        "updated_at",
        "modifiedAt",
        "modified_at",
        "lastModifiedAt",
        "lastUpdatedAt",
      ];
  for (const scope of ["raw", "metadata"] as const) {
    const current =
      scope === "raw"
        ? task.raw
        : ((task.raw.metadata || {}) as Record<string, unknown>);
    const previous =
      scope === "raw"
        ? old?.raw
        : (old?.raw.metadata as Record<string, unknown> | undefined);
    for (const key of keys) {
      const value = current[key];
      if (
        typeof value !== "string" ||
        (!added && value === previous?.[key]) ||
        !/(Z|[+-]\d{2}:\d{2})$/.test(value)
      )
        continue;
      const millis = Date.parse(value);
      if (Number.isFinite(millis) && millis <= Date.parse(observedAt))
        return new Date(millis).toISOString();
    }
  }
  return undefined;
}
function actor(raw: Record<string, unknown>, added: boolean): string | null {
  const meta =
    raw.metadata && typeof raw.metadata === "object"
      ? (raw.metadata as Record<string, unknown>)
      : {};
  const keys = added
    ? ["createdBy", "creator", "generatedBy"]
    : ["updatedBy", "modifiedBy", "lastModifiedBy"];
  for (const data of [raw, meta])
    for (const key of keys) {
      const value = data[key];
      if (typeof value === "string" && value.trim()) return value.slice(0, 200);
      if (value && typeof value === "object") {
        const obj = value as Record<string, unknown>;
        for (const field of ["name", "agent", "id"])
          if (typeof obj[field] === "string")
            return String(obj[field]).slice(0, 200);
      }
    }
  return null;
}
export function diffActivity(
  previous: Snapshot[],
  current: Snapshot[],
  at: string,
): ActivityEvent[] {
  const before = new Map(previous.map((t) => [t.key, t])),
    after = new Map(current.map((t) => [t.key, t])),
    events: ActivityEvent[] = [];
  const event = (
    task: Snapshot,
    type: ActivityEvent["type"],
    fields: string[],
    old?: string,
    next?: string,
  ): ActivityEvent => ({
    id: randomUUID(),
    at,
    reportedAt:
      type === "removed"
        ? undefined
        : reportedTime(task, before.get(task.key), type === "added", at),
    type,
    taskKey: task.key,
    taskId: task.id,
    title: task.title,
    tag: task.tag,
    source: task.source,
    depth: task.depth,
    fields,
    before: old,
    after: next,
    actor: type === "removed" ? null : actor(task.raw, type === "added"),
  });
  for (const task of current) {
    const old = before.get(task.key);
    if (!old) {
      events.push(event(task, "added", []));
      continue;
    }
    const fields = [
      ...new Set([...Object.keys(old.raw), ...Object.keys(task.raw)]),
    ].filter(
      (k) =>
        k !== "subtasks" &&
        !timestampKeys.has(k) &&
        stable(meaningful(old.raw[k])) !== stable(meaningful(task.raw[k])),
    );
    if (!fields.length) continue;
    if (fields.includes("status"))
      events.push(
        event(
          task,
          "status",
          fields,
          String(old.raw.status || "pending"),
          String(task.raw.status || "pending"),
        ),
      );
    else events.push(event(task, "updated", fields));
  }
  for (const task of previous)
    if (!after.has(task.key)) events.push(event(task, "removed", []));
  return events;
}
export function snapshot(tasks: Task[]): Snapshot[] {
  return flatten(tasks).map((r) => ({
    key: r.task.key,
    id: r.id,
    title: r.task.title,
    tag: r.task.tag,
    source: r.task.source,
    depth: r.depth,
    raw: r.task.raw,
  }));
}
export async function recordActivity(
  root: string,
  tasks: Task[],
  healthy = true,
): Promise<ActivityFeed> {
  const previous = queue.get(root) || Promise.resolve();
  const work = previous
    .catch(() => {})
    .then(async () => {
      const at = new Date().toISOString(),
        directory =
          process.env.TASK_MASTER_UI_STATE_DIR ||
          path.join(process.cwd(), ".task-master-ui", "activity"),
        file = path.join(
          directory,
          `${createHash("sha256").update(root).digest("hex")}.json`,
        );
      let state: State | undefined;
      try {
        const saved = JSON.parse(await readFile(file, "utf8"));
        if (
          saved.version === 1 &&
          Array.isArray(saved.snapshot) &&
          Array.isArray(saved.events)
        )
          state = saved;
      } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== "ENOENT")
          return {
            startedAt: at,
            events: [],
            warning: "Activity history could not be read; it was preserved.",
          };
      }
      if (!healthy)
        return {
          startedAt: state?.startedAt || at,
          events: state?.events || [],
          timing: state?.timing || {},
          warning:
            "Activity recording paused until all task files parse successfully.",
        };
      const current = snapshot(tasks),
        next: State = state
          ? {
              ...state,
              snapshot: current,
              timing: updateTiming(state.timing || {}, tasks, at),
              events: newestActivity([
                ...diffActivity(state.snapshot, current, at),
                ...state.events,
              ]).slice(0, 1000),
            }
          : {
              version: 1,
              startedAt: at,
              snapshot: current,
              events: [],
              timing: updateTiming({}, tasks, at),
            };
      next.progressHistory = recordProgress(state?.progressHistory || [], tasks, Date.parse(at));
      if (
        !state ||
        stable(state.progressHistory) !== stable(next.progressHistory) ||
        next.events.length !== state.events.length ||
        stable(state.snapshot) !== stable(current) ||
        stable(state.timing) !== stable(next.timing)
      ) {
        const temporary = `${file}.${randomUUID()}.tmp`;
        try {
          await mkdir(directory, { recursive: true });
          await writeFile(temporary, JSON.stringify(next), { mode: 0o600 });
          await rename(temporary, file);
        } catch {
          return {
            startedAt: next.startedAt,
            events: next.events,
            timing: next.timing,
            progressHistory: next.progressHistory,
            warning: "Activity history could not be saved.",
          };
        }
      }
      return {
        startedAt: next.startedAt,
        events: next.events,
        timing: next.timing,
        progressHistory: next.progressHistory,
      };
    });
  queue.set(root, work);
  try {
    return await work;
  } finally {
    if (queue.get(root) === work) queue.delete(root);
  }
}
