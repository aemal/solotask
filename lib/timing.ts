import type { Task } from "./task-model";
import { flatten } from "./views";
export type TimingRecord = {
  key: string;
  depth: number;
  status: string;
  startedAt?: string;
  completedAt?: string;
  inProgressMs: number;
  lastObservedAt: string;
  partial: boolean;
  complexity: number | null;
  elapsedSource?: "recorded" | "observed";
  removed?: boolean;
};
export type TimingStore = Record<string, TimingRecord>;
export type TimeEstimate = {
  remainingMs: number;
  lowMs: number;
  highMs: number;
  overrun: boolean;
  samples: number;
};
export type TaskTiming = {
  inProgressMs: number;
  elapsedMs: number | null;
  partial: boolean;
  startedAt?: string;
  completedAt?: string;
  elapsedSource?: "recorded" | "observed";
  estimate: TimeEstimate | null;
};
const done = (status: string) => ["done", "completed"].includes(status);
function timestamp(
  raw: Record<string, unknown>,
  names: string[],
  now: number,
): string | undefined {
  const meta =
    raw.metadata && typeof raw.metadata === "object"
      ? (raw.metadata as Record<string, unknown>)
      : {};
  for (const obj of [raw, meta])
    for (const name of names) {
      const value = obj[name];
      if (typeof value !== "string" || !/(Z|[+-]\d{2}:\d{2})$/.test(value))
        continue;
      const time = Date.parse(value);
      if (Number.isFinite(time) && time <= now)
        return new Date(time).toISOString();
    }
}
export function updateTiming(
  previous: TimingStore,
  tasks: Task[],
  at: string,
): TimingStore {
  const now = Date.parse(at),
    result: TimingStore = {};
  for (const [key, record] of Object.entries(previous))
    result[key] = { ...record, removed: true };
  for (const row of flatten(tasks)) {
    const task = row.task,
      old = previous[task.key],
      score =
        task.complexity !== null &&
        Number.isFinite(task.complexity) &&
        task.complexity > 0
          ? task.complexity
          : null;
    const sourceStart = timestamp(
        task.raw,
        ["startedAt", "started_at", "inProgressAt"],
        now,
      ),
      sourceEnd = timestamp(
        task.raw,
        ["completedAt", "completed_at", "finishedAt"],
        now,
      );
    if (!old) {
      const historical =
        done(task.status) &&
        sourceStart &&
        sourceEnd &&
        Date.parse(sourceEnd) >= Date.parse(sourceStart);
      result[task.key] = {
        key: task.key,
        depth: row.depth,
        status: task.status,
        inProgressMs: 0,
        lastObservedAt: at,
        partial: task.status === "in-progress" || done(task.status),
        complexity: score,
        startedAt: historical
          ? sourceStart
          : task.status === "in-progress"
            ? sourceStart || at
            : undefined,
        completedAt: historical ? sourceEnd : undefined,
        elapsedSource: historical
          ? "recorded"
          : task.status === "in-progress"
            ? sourceStart
              ? "recorded"
              : "observed"
            : undefined,
      };
      continue;
    }
    let record: TimingRecord = {
      ...old,
      status: task.status,
      lastObservedAt: at,
      removed: false,
    };
    const gap = Math.max(0, now - Date.parse(old.lastObservedAt)),
      covered = gap <= 60000 && !old.removed;
    if (
      (done(old.status) || old.status === "cancelled") &&
      !done(task.status) &&
      task.status !== "cancelled"
    )
      record = {
        key: task.key,
        depth: row.depth,
        status: task.status,
        inProgressMs: 0,
        lastObservedAt: at,
        partial: false,
        complexity: score,
      };
    else if (old.status === "in-progress" && old.startedAt) {
      if (covered) record.inProgressMs += gap;
      else record.partial = true;
    }
    if (old.startedAt && !covered && !done(old.status)) record.partial = true;
    if (task.status === "in-progress" && !record.startedAt) {
      const validStart =
        sourceStart && Date.parse(sourceStart) >= Date.parse(old.lastObservedAt)
          ? sourceStart
          : undefined;
      record.startedAt = validStart || at;
      record.elapsedSource = validStart ? "recorded" : "observed";
      record.partial = record.partial || !covered;
      record.complexity = score;
    }
    if (record.complexity === null && score !== null) record.complexity = score;
    if (done(task.status) && !done(old.status)) {
      record.completedAt = at;
      if (!record.startedAt) record.partial = true;
      // Explicit start/end fields describe historical elapsed time, not active work.
      if (
        sourceStart &&
        sourceEnd &&
        Date.parse(sourceEnd) >= Date.parse(sourceStart) &&
        (!record.startedAt ||
          Date.parse(sourceEnd) >= Date.parse(record.startedAt))
      ) {
        record.startedAt = sourceStart;
        record.completedAt = sourceEnd;
        record.elapsedSource = "recorded";
      }
    }
    if (
      done(task.status) &&
      !record.startedAt &&
      sourceStart &&
      sourceEnd &&
      Date.parse(sourceEnd) >= Date.parse(sourceStart)
    ) {
      record.startedAt = sourceStart;
      record.completedAt = sourceEnd;
      record.elapsedSource = "recorded";
      record.partial = true;
    }
    if (task.status === "cancelled") {
      record.partial = true;
      if (record.startedAt && !record.completedAt) record.completedAt = at;
    }
    result[task.key] = record;
  }
  return result;
}
const quantile = (values: number[], q: number) => {
  const position = (values.length - 1) * q,
    lower = Math.floor(position),
    upper = Math.ceil(position);
  return values[lower] + (values[upper] - values[lower]) * (position - lower);
};
export function timingFor(
  task: Task,
  store: TimingStore,
  depth: number,
  now = Date.now(),
): TaskTiming {
  const record = store[task.key];
  const samples = Object.values(store).filter(
    (r) =>
      (depth === 0 ? r.depth === 0 : r.depth > 0) &&
      done(r.status) &&
      !r.partial &&
      r.complexity !== null &&
      r.complexity > 0 &&
      r.inProgressMs > 0,
  );
  const rates = samples
    .map((r) => r.inProgressMs / r.complexity!)
    .sort((a, b) => a - b);
  let estimate: TimeEstimate | null = null;
  if (
    !["done", "completed", "cancelled"].includes(task.status) &&
    task.complexity !== null &&
    task.complexity > 0 &&
    rates.length >= 3 &&
    (!record?.partial || !record.startedAt)
  ) {
    const spent = record?.inProgressMs || 0,
      expected = quantile(rates, 0.5) * task.complexity;
    estimate = {
      remainingMs: Math.max(0, expected - spent),
      lowMs: Math.max(0, quantile(rates, 0.1) * task.complexity - spent),
      highMs: Math.max(0, quantile(rates, 0.9) * task.complexity - spent),
      overrun: spent >= expected,
      samples: rates.length,
    };
  }
  const elapsedMs = record?.startedAt
    ? Math.max(
        0,
        Date.parse(record.completedAt || new Date(now).toISOString()) -
          Date.parse(record.startedAt),
      )
    : null;
  return {
    inProgressMs: record?.inProgressMs || 0,
    elapsedMs,
    partial: record?.partial ?? true,
    startedAt: record?.startedAt,
    completedAt: record?.completedAt,
    elapsedSource: record?.elapsedSource,
    estimate,
  };
}
export function duration(ms: number | null | undefined): string {
  if (ms === null || ms === undefined) return "—";
  if (ms < 60000) return "<1 min";
  const minutes = Math.round(ms / 60000);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60),
    rest = minutes % 60;
  if (hours < 24) return `${hours} hr${rest ? ` ${rest} min` : ""}`;
  const days = Math.floor(hours / 24);
  return `${days}d${hours % 24 ? ` ${hours % 24} hr` : ""}`;
}
