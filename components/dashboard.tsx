"use client";
import { Card } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { AgentStatus } from "@/components/agent-status";
import { ProgressChange } from "@/components/progress-change";
import type { ProgressSample } from "@/lib/progress-history";
import { TimeOverview } from "@/components/timing";
import { ActivityPulse } from "@/components/activity";
import type { ActivityFeed } from "@/lib/activity-model";
import type { Task } from "@/lib/task-model";
import { dashboard, statusSummary } from "@/lib/dashboard";
import { milestone, flatten, dependencies } from "@/lib/views";
import { StatusIcon, PriorityIcon } from "@/components/task-icons";
import {
  ListChecks,
  Layers,
  GitBranch,
  Play,
  Gauge,
  Milestone,
  Flag,
  FileJson,
  ArrowUpRight,
  Link2,
  CircleCheck,
  Clock3,
} from "lucide-react";
const colors: Record<string, string> = {
  done: "#16a085",
  completed: "#16a085",
  "in-progress": "#5680e9",
  review: "#d6a238",
  pending: "#d5dbe4",
  blocked: "#de7a67",
  deferred: "#ab99c1",
  cancelled: "#8b95a5",
};
function Summary({
  label,
  summary,
  sub = false,
  history, tag, filtered, interrupted,
}: {
  label: string;
  summary: ReturnType<typeof statusSummary>;
  sub?: boolean;
  history?: ProgressSample[]; tag?: string; filtered?: boolean; interrupted?: boolean;
}) {
  const Icon = sub ? ListChecks : Layers;
  return (
    <Card className="overview-panel summary-card">
      <div className="overview-heading">
        <h2>
          <Icon size={17} />
          {label}
        </h2>
        <span className="subtle-count">
          {summary.completed}/{summary.total}
        </span>
      </div>
      <div className="summary-metrics">
        <div className="progress-number">
          {summary.percent}
          <span>%</span>
        </div>
        <ProgressChange history={history} tag={tag} depth={sub ? 1 : 0} filtered={filtered} interrupted={interrupted} />
      </div>
      <div
        className="status-meter"
        role="img"
        aria-label={`${label}: ${summary.percent}% complete`}
      >
        {Object.entries(summary.counts).map(
          ([status, count]) =>
            count > 0 && (
              <i
                key={status}
                title={`${status}: ${count}`}
                style={{
                  width: `${summary.total ? (count / summary.total) * 100 : 0}%`,
                  background: colors[status] || "#8ba5ae",
                }}
              />
            ),
        )}
      </div>
      <div className="status-grid">
        {Object.entries(summary.counts).map(([status, count]) => (
          <div key={status} title={`${status}: ${count}`}>
            <StatusIcon status={status} />
            <span>{status}</span>
            <strong>{count}</strong>
          </div>
        ))}
      </div>
    </Card>
  );
}
export default function Dashboard({
  tasks,
  allTasks,
  files,
  open,
  activity,
  activityTag,
  activityQuery,
  viewActivity,
}: {
  tasks: Task[];
  allTasks: Task[];
  files: string[];
  open: (key: string) => void;
  activity?: ActivityFeed;
  activityTag: string;
  activityQuery: string;
  viewActivity: () => void;
}) {
  const info = dashboard(tasks, allTasks),
    rows = flatten(allTasks),
    milestones = [...new Set(tasks.map(milestone))];
  const scope = allTasks.filter(t => activityTag === "all" || t.tag === activityTag);
  const filtered = scope.length !== tasks.length || scope.some(t => !tasks.some(selected => selected.key === t.key));
  const changeProps = { history: activity?.progressHistory, tag: activityTag, filtered, interrupted: !!activity?.warning };
  return (
    <div className="view-stack">
      <AgentStatus activity={activity?.agentActivity} />
      <ActivityPulse feed={activity} tag={activityTag} query={activityQuery} onDetails={viewActivity} open={open} currentKeys={new Set(rows.map(r => r.task.key))} />
      <TimeOverview tasks={tasks} />
      <div className="dashboard-grid">
        <Summary label="Tasks" summary={info.tasks} {...changeProps} />
        <Summary label="Subtasks" summary={info.subtasks} sub {...changeProps} />
      </div>
      <div className="dashboard-grid">
        <Card className="overview-panel">
          <h2>
            <GitBranch size={17} />
            Dependencies
          </h2>
          <div className="dependency-numbers">
            <div>
              <Play size={18} />
              <strong>{info.ready.length}</strong>
              <span>Ready</span>
            </div>
            <div>
              <Link2 size={18} />
              <strong>{info.blocked.length}</strong>
              <span>Blocked</span>
            </div>
            <div>
              <GitBranch size={18} />
              <strong>{info.average.toFixed(1)}</strong>
              <span>Avg. dependencies</span>
            </div>
          </div>
          <div className="metric-line">
            <span>Most depended on</span>
            {info.mostDependedOn ? (
              <Button
                className="text-button"
                onClick={() => open(info.mostDependedOn!.row.task.key)}
              >
                #{info.mostDependedOn.row.id}
                <span className="count">{info.mostDependedOn.count}</span>
                <ArrowUpRight size={13} />
              </Button>
            ) : (
              <span>—</span>
            )}
          </div>
          <div className="metric-line">
            <span>No dependencies</span>
            <strong>{info.noDependencies}</strong>
          </div>
        </Card>
        <Card className="overview-panel next-panel">
          <h2>
            <Play size={17} />
            Up next
          </h2>
          {info.next ? (
            <>
              <Button
                className="next-task"
                onClick={() => open(info.next!.task.key)}
              >
                <span className="task-id">#{info.next.id}</span>
                <h3>{info.next.task.title}</h3>
                <ArrowUpRight size={18} />
              </Button>
              <div className="drawer-meta">
                <span className={`priority ${info.next.task.priority}`}>
                  <PriorityIcon priority={info.next.task.priority} />
                  {info.next.task.priority}
                </span>
                <span className="tag">{info.next.task.tag}</span>
                <span className="compact-metric" title="Complexity">
                  <Gauge size={14} />
                  {info.next.task.complexity ?? "—"}
                </span>
              </div>
            </>
          ) : (
            <div className="panel-empty">
              <CircleCheck size={24} />
              <span>No ready tasks</span>
            </div>
          )}
        </Card>
      </div>
      <div className="dashboard-grid">
        <Card className="overview-panel">
          <h2>
            <Flag size={17} />
            Priorities
          </h2>
          {[
            ...new Set([
              "critical",
              "high",
              "medium",
              "low",
              ...Object.keys(info.priorities),
            ]),
          ].map((priority) => (
            <div className="priority-row" key={priority}>
              <PriorityIcon priority={priority} />
              <span>{priority}</span>
              <div className="meter">
                <i
                  style={{
                    width: `${tasks.length ? ((info.priorities[priority] || 0) / tasks.length) * 100 : 0}%`,
                  }}
                />
              </div>
              <strong>{info.priorities[priority] || 0}</strong>
            </div>
          ))}
        </Card>
        <Card className="overview-panel">
          <h2>
            <Gauge size={17} />
            Complexity
          </h2>
          <div className="coverage-number">
            {info.analyzed}
            <span> / {tasks.length}</span>
          </div>
          <div className="meter">
            <i
              style={{
                width: `${tasks.length ? (info.analyzed / tasks.length) * 100 : 0}%`,
              }}
            />
          </div>
          <span className="metric-caption">Analyzed tasks</span>
        </Card>
      </div>
      <Card className="overview-panel">
        <h2>
          <Milestone size={17} />
          Milestones<span className="count">{milestones.length}</span>
        </h2>
        <div className="milestone-grid">
          {milestones.map((name) => {
            const group = tasks.filter((t) => milestone(t) === name),
              summary = statusSummary(group),
              blocked = group.filter((t) => {
                const row = rows.find((r) => r.task.key === t.key)!;
                return (
                  !["done", "completed", "cancelled"].includes(t.status) &&
                  dependencies(row, rows).some((d) => !d.satisfied)
                );
              }).length;
            return (
              <div key={name}>
                <h3>{name}</h3>
                <div className="milestone-numbers">
                  <span>
                    {summary.completed}/{summary.total}
                  </span>
                  <strong>{summary.percent}%</strong>
                </div>
                <div className="meter">
                  <i style={{ width: `${summary.percent}%` }} />
                </div>
                {blocked > 0 && (
                  <small title="Dependency blockers">
                    <Link2 size={12} />
                    {blocked}
                  </small>
                )}
              </div>
            );
          })}
        </div>
      </Card>
      <details className="file-details">
        <summary>
          <FileJson size={14} />
          {files.length} connected files
        </summary>
        {files.map((file) => (
          <p className="source" key={file}>
            {file}
          </p>
        ))}
      </details>
    </div>
  );
}
