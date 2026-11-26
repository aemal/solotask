"use client";
import { Card } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Clock3, Timer, Hourglass, ArrowUpRight, Info } from "lucide-react";
import type { Task } from "@/lib/task-model";
import { duration, type TaskTiming } from "@/lib/timing";
import { StatusIcon } from "@/components/task-icons";
const ended = (t: Task) =>
  ["done", "completed", "cancelled"].includes(t.status);
function activeLabel(t?: TaskTiming) {
  return !t || !t.startedAt || (t.partial && t.inProgressMs === 0)
    ? "—"
    : `${t.partial ? "≥ " : ""}${duration(t.inProgressMs)}`;
}
function elapsedLabel(t?: TaskTiming) {
  return t?.elapsedMs === null || t?.elapsedMs === undefined
    ? "—"
    : `${t.partial && t.elapsedSource !== "recorded" ? "≥ " : ""}${duration(t.elapsedMs)}`;
}
export function TimeBadge({ task }: { task: Task }) {
  const timing = task.timing,
    estimate = timing?.estimate;
  return (
    <span
      className="compact-metric"
      title={
        ended(task)
          ? "Completed elapsed time"
          : estimate
            ? "Estimated remaining in-progress time"
            : "Estimate needs 3 fully tracked, completed tasks with complexity scores"
      }
    >
      <Clock3 size={12} />
      {ended(task)
        ? elapsedLabel(timing)
        : estimate
          ? estimate.overrun
            ? "Over estimate"
            : `~${duration(estimate.remainingMs)}`
          : "—"}
    </span>
  );
}
export function TaskTime({ task }: { task: Task }) {
  const timing = task.timing,
    estimate = timing?.estimate;
  return (
    <div className="task-time">
      <div className="time-metrics">
        <div>
          <Timer size={15} />
          <strong>{activeLabel(timing)}</strong>
          <span>In progress</span>
        </div>
        <div>
          <Clock3 size={15} />
          <strong>{elapsedLabel(timing)}</strong>
          <span>
            Elapsed{timing?.elapsedSource === "recorded" ? " · recorded" : ""}
          </span>
        </div>
        <div>
          <Hourglass size={15} />
          <strong>
            {ended(task)
              ? "—"
              : estimate
                ? estimate.overrun
                  ? "Over estimate"
                  : `~${duration(estimate.remainingMs)}`
                : "—"}
          </strong>
          <span>Remaining estimate</span>
        </div>
      </div>
      {!ended(task) && !estimate && (
        <p className="metric-caption">
          {task.complexity === null
            ? "No complexity score"
            : timing?.partial && timing.startedAt
              ? "Partial timing history"
              : "Needs 3 fully timed, scored completions"}
        </p>
      )}
      {estimate && (
        <p className="metric-caption">
          Historical range {duration(estimate.lowMs)}–
          {duration(estimate.highMs)} · {estimate.samples} samples
        </p>
      )}
      {timing?.partial && timing.startedAt && (
        <p className="metric-caption">
          Incomplete observations · ≥ indicates a lower bound
        </p>
      )}
    </div>
  );
}
export function TimeOverview({ tasks }: { tasks: Task[] }) {
  const unfinished = tasks.filter((t) => !ended(t)),
    known = unfinished.filter(
      (t) => t.timing?.estimate && !t.timing.estimate.overrun,
    ),
    samples = Math.max(
      0,
      ...tasks.map((t) => t.timing?.estimate?.samples || 0),
    );
  const total = known.reduce(
      (sum, t) => sum + t.timing!.estimate!.remainingMs,
      0,
    ),
    low = known.reduce((sum, t) => sum + t.timing!.estimate!.lowMs, 0),
    high = known.reduce((sum, t) => sum + t.timing!.estimate!.highMs, 0),
    completed = tasks.filter(
      (t) =>
        ["done", "completed"].includes(t.status) &&
        t.timing?.elapsedMs !== null &&
        t.timing?.elapsedMs !== undefined,
    );
  if (!known.length) return null;
  return (
    <Card className="overview-panel">
      <h2>
        <Hourglass size={17} />
        Time remaining
        <span className="count">
          {known.length}/{unfinished.length} estimated
        </span>
      </h2>
      <div className="coverage-number">
        {!unfinished.length
          ? "Complete"
          : known.length
            ? `~${duration(total)}`
            : "—"}
      </div>
      <div className="time-overview-meta">
        <span>
          {known.length
            ? `${duration(low)}–${duration(high)} historical range`
            : "Not enough data"}
        </span>
        <span>{completed.length} timed completions</span>
      </div>
      <details className="timing-note">
        <summary>
          <Info size={12} />
          How estimates work
        </summary>
        <p>
          Remaining effort sums top-level tasks only. It is not a delivery date:
          parallel work, queues and future waiting are not predicted. Partial
          coverage excludes tasks without a reliable estimate and tasks already
          over their estimate.
        </p>
        <p>
          Each project learns median in-progress time per complexity point from
          at least 3 fully observed, completed tasks. The range uses historical
          10th–90th percentiles, not a guaranteed confidence interval. Pauses,
          review and blocked states are excluded from in-progress time. Time
          spent waiting while still marked in-progress remains included.
        </p>
        <p>
          Recording needs refreshes. Observation gaps over a minute, missed
          starts and cancelled tasks are excluded from calibration. Task and
          subtask samples are kept separate.
        </p>
        {samples > 0 && (
          <p>{samples} completed samples available for these estimates.</p>
        )}
      </details>
    </Card>
  );
}
export default function TimingView({
  tasks,
  open,
}: {
  tasks: Task[];
  open: (key: string) => void;
}) {
  return (
    <div className="view-stack">
      <TimeOverview tasks={tasks} />
      <div className="view-panel table-scroll">
        <table className="task-table">
          <thead>
            <tr>
              <th>Task</th>
              <th>
                <Timer size={14} /> In progress
              </th>
              <th>
                <Clock3 size={14} /> Elapsed
              </th>
              <th>
                <Hourglass size={14} /> Remaining
              </th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => (
              <tr key={task.key}>
                <td>
                  <Button className="task-link" onClick={() => open(task.key)}>
                    <StatusIcon status={task.status} />
                    <span className="task-id">#{task.id}</span>
                    {task.title}
                    <ArrowUpRight size={13} />
                  </Button>
                </td>
                <td>{activeLabel(task.timing)}</td>
                <td>{elapsedLabel(task.timing)}</td>
                <td>
                  <TimeBadge task={task} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
