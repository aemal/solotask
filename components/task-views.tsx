"use client";
import { Button } from "@/components/ui/button";
import { TimeBadge } from "@/components/timing";
import type { Task } from "@/lib/task-model";
import { StatusIcon, PriorityIcon } from "@/components/task-icons";
import {
  Clock3,
  ListChecks,
  Gauge,
  GitBranch,
  Link2,
  Milestone,
  Play,
  Tags,
  Braces,
  CheckCheck,
  AlertCircle,
  Flag,
} from "lucide-react";
import { progress } from "@/lib/task-model";
import {
  flatten,
  milestone,
  dependencies,
  dependents,
  nextTask,
  isReady,
  dependencyIssues,
  unfinished,
} from "@/lib/views";
export function TaskViews({
  view,
  tasks,
  allTasks,
  subtasks,
  compact,
  open,
}: {
  view: string;
  tasks: Task[];
  allTasks: Task[];
  subtasks: boolean;
  compact: boolean;
  open: (key: string) => void;
}) {
  const rows = flatten(allTasks),
    selected = flatten(tasks),
    shown = subtasks ? selected : selected.filter((r) => r.depth === 0);
  const renderTable = (items: typeof rows) => (
    <div className={`table-scroll ${compact ? "compact" : ""}`}>
      <table className="task-table">
        <thead>
          <tr>
            <th>Task</th>
            <th aria-label="Status"><span title="Status" tabIndex={0}><CheckCheck size={14}/></span></th>
            <th aria-label="Priority"><span title="Priority" tabIndex={0}><Flag size={14}/></span></th>
            <th title="Dependencies" aria-label="Dependencies" tabIndex={0}>
              <GitBranch size={14} />
            </th>
            <th title="Blocks" aria-label="Blocks" tabIndex={0}>
              <Link2 size={14} />
            </th>
            <th title="Complexity" aria-label="Complexity" tabIndex={0}>
              <Gauge size={14} />
            </th>
            <th title="Time" aria-label="Time" tabIndex={0}>
              <Clock3 size={14} />
            </th>
            <th title="Progress" aria-label="Progress" tabIndex={0}>
              <ListChecks size={14} />
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((r) => (
            <tr key={r.task.key}>
              <td style={{ paddingLeft: 16 + r.depth * 20 }}>
                <Button className="task-link" onClick={() => open(r.task.key)}>
                  <StatusIcon status={r.task.status} />
                  <span className="task-id">#{r.id}</span>
                  {r.task.title}
                </Button>
                {!compact && (
                  <small>
                    {r.task.tag} · {milestone(r.task)}
                    {r.task.description && ` · ${r.task.description}`}
                  </small>
                )}
              </td>
              <td>
                <span className="table-icon-value" title={`Status: ${r.task.status}`} aria-label={`Status: ${r.task.status}`} tabIndex={0}>
                  <StatusIcon status={r.task.status} />
                </span>
              </td>
              <td>
                <span
                  className={`table-icon-value priority ${r.task.priority}`}
                  title={`${r.task.priority} priority`}
                  aria-label={`${r.task.priority} priority`}
                  tabIndex={0}
                >
                  <PriorityIcon priority={r.task.priority} />
                </span>
              </td>
              <td className="task-relations">
                {dependencies(r, rows).map((d) => (
                  <div key={d.id}>
                    {d.target ? (
                      <Button
                        className="text-button"
                        title={d.target.task.title}
                        onClick={() => open(d.target!.task.key)}
                      >
                        <StatusIcon status={d.target.task.status} size={12} />#
                        {d.id}
                      </Button>
                    ) : (
                      <span className="warning-text">Missing #{d.id}</span>
                    )}
                  </div>
                ))}
                {!r.task.dependencies.length && (
                  <span className="muted">—</span>
                )}
              </td>
              <td className="task-relations">
                {dependents(r, rows).map((d) => (
                  <div key={d.task.key}>
                    <Button
                      className="text-button"
                      title={d.task.title}
                      onClick={() => open(d.task.key)}
                    >
                      #{d.id}
                    </Button>
                  </div>
                ))}
                {!dependents(r, rows).length && (
                  <span className="muted">—</span>
                )}
              </td>
              <td>
                {r.task.complexity === null ? "—" : `${r.task.complexity}/10`}
              </td>
              <td>
                <TimeBadge task={r.task} />
              </td>
              <td>
                <div className="table-progress"><span>{progress(r.task)}%</span>
                <div className="meter" data-complete={progress(r.task) === 100 || undefined}>
                  <i style={{ width: `${progress(r.task)}%` }} />
                </div></div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {!items.length && <div className="lane-empty">No matching tasks.</div>}
    </div>
  );
  if (view === "milestones")
    return (
      <div className="view-stack">
        {[...new Set(tasks.map(milestone))].map((name) => {
          const group = tasks.filter((t) => milestone(t) === name),
            done = group.filter((t) => t.status === "done").length;
          return (
            <section className="view-panel" key={name}>
              <h2>
                <Milestone size={16} />
                {name}
                <span className="count">
                  {done}/{group.length} done
                </span>
              </h2>
              {renderTable(
                shown.filter((r) =>
                  group.some((t) =>
                    flatten([t]).some((x) => x.task.key === r.task.key),
                  ),
                ),
              )}
            </section>
          );
        })}
      </div>
    );
  if (view === "next") {
    const candidate = nextTask(selected, rows);
    return (
      <section className="view-panel">
        <h2>
          <Play size={16} />
          Up next
        </h2>
        {candidate ? (
          renderTable([candidate])
        ) : (
          <div className="lane-empty">
            No eligible task. Check blockers or widen the filters.
          </div>
        )}
      </section>
    );
  }
  if (view === "progress") {
    const blocked = selected.filter(
        (r) =>
          unfinished(r) &&
          (r.task.status === "blocked" ||
            dependencies(r, rows).some((d) => !d.satisfied)),
      ),
      blocking = selected.filter((r) => dependents(r, rows).some(unfinished)),
      issues = dependencyIssues(rows);
    return (
      <div className="view-stack">
        <section className="view-panel">
          <h2>
            <GitBranch size={16} />
            Dependencies<span className="count">{blocked.length} blocked</span>
            <span className="count">
              {shown.filter((r) => isReady(r, rows)).length} ready
            </span>
          </h2>
          {renderTable(shown)}
        </section>
        <section className="view-panel">
          <h2>
            <AlertCircle size={16} />
            Blocked
          </h2>
          {renderTable(blocked)}
        </section>
        <section className="view-panel">
          <h2>
            <Link2 size={16} />
            Blocking others
          </h2>
          {renderTable(blocking)}
        </section>
        <section className="view-panel">
          <h2>
            <CheckCheck size={16} />
            Validation
          </h2>
          {issues.length ? (
            issues.map((i) => (
              <p className="warning-text" key={i}>
                {i}
              </p>
            ))
          ) : (
            <p className="muted">All dependencies valid</p>
          )}
        </section>
      </div>
    );
  }
  if (view === "complexity")
    return (
      <section className="view-panel">
        <h2>
          <Gauge size={16} />
          Complexity
        </h2>
        {renderTable(
          [...shown].sort(
            (a, b) => (b.task.complexity ?? -1) - (a.task.complexity ?? -1),
          ),
        )}
      </section>
    );
  if (view === "tags")
    return (
      <div className="view-stack">
        {[...new Set(tasks.map((t) => t.tag))].map((tag) => (
          <section className="view-panel" key={tag}>
            <h2>
              <Tags size={16} />
              {tag}
              <span className="count">
                {tasks.filter((t) => t.tag === tag).length} tasks
              </span>
            </h2>
            {renderTable(shown.filter((r) => r.task.tag === tag))}
          </section>
        ))}
      </div>
    );
  if (view === "json")
    return (
      <section className="view-panel">
        <h2>
          <Braces size={16} />
          Source
        </h2>
        <pre>
          {JSON.stringify(
            tasks.map((t) => ({ source: t.source, tag: t.tag, task: t.raw })),
            null,
            2,
          )}
        </pre>
      </section>
    );
  return renderTable(shown);
}
