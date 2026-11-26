"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import {
  Activity,
  Plus,
  Trash2,
  ArrowRight,
  Pencil,
  UserRound,
  FileJson,
  Clock3,
  Info,
} from "lucide-react";
import { activityTime, newestActivity } from "@/lib/activity-model";
import type { ActivityFeed } from "@/lib/activity-model";
import { FilterSelect } from "@/components/ui/select";
import { StatusIcon } from "@/components/task-icons";
const types = {
  added: { label: "Added", icon: Plus },
  removed: { label: "Removed", icon: Trash2 },
  status: { label: "Status changed", icon: ArrowRight },
  updated: { label: "Updated", icon: Pencil },
};
function timeAgo(timestamp: string, now: number): string {
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return "Unknown time";
  const seconds = Math.max(0, Math.floor((now - parsed) / 1000));
  if (seconds < 60) return "just now";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} min ago`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} hr ago`;
  const days = Math.floor(seconds / 86400);
  if (days < 7) return `${days} ${days === 1 ? "day" : "days"} ago`;
  if (days < 30) {
    const weeks = Math.floor(days / 7);
    return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
  }
  if (days < 365) {
    const months = Math.floor(days / 30);
    return `${months} ${months === 1 ? "month" : "months"} ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} ${years === 1 ? "year" : "years"} ago`;
}
export function ActivityPulse({ feed, tag, query, onDetails, open, currentKeys }: {
  feed?: ActivityFeed;
  tag: string;
  query: string;
  onDetails: () => void;
  open: (key: string) => void;
  currentKeys: Set<string>;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 10000);
    return () => window.clearInterval(timer);
  }, []);
  const events = newestActivity(feed?.events || []).filter((event) =>
    (tag === "all" || event.tag === tag) &&
    `${event.taskId} ${event.title} ${event.actor || ""} ${event.fields.join(" ")}`
      .toLowerCase().includes(query.toLowerCase()),
  );
  const bins = Array.from({ length: 40 }, () => 0);
  for (const event of events) {
    const age = now - Date.parse(activityTime(event));
    if (age >= 0 && age < 3600000) bins[39 - Math.floor(age / 90000)]++;
  }
  const count = bins.reduce((sum, value) => sum + value, 0);
  const peak = Math.max(1, ...bins);
  const latest = events[0];
  return (
    <section className="activity-pulse" aria-label="System activity">
      <div className="pulse-summary">
        <Activity size={18} aria-hidden="true" />
        <div>
          <strong>System pulse</strong>
          <small>{feed?.warning ? "Activity observation interrupted" : `${count} ${count === 1 ? "change" : "changes"} in the last hour`}</small>
        </div>
      </div>
      <div className="pulse-chart">
        <svg viewBox="0 0 400 32" preserveAspectRatio="none" role="img" aria-label={`${count} changes in the last hour, oldest on the left, newest on the right`}>
          {bins.map((value, index) => {
            const height = value ? 5 + (value / peak) * 27 : 2;
            return <rect key={index} x={index * 10} y={(32 - height) / 2} width="4" height={height} rx="2" fill={value ? "var(--accent)" : "var(--border)"}><title>{value} changes · {Math.round((40 - index) * 1.5)} min ago</title></rect>;
          })}
        </svg>
        {latest ? <Button className="pulse-task" disabled={!currentKeys.has(latest.taskKey)} onClick={() => open(latest.taskKey)} title={currentKeys.has(latest.taskKey) ? "Open task details" : "Task no longer exists"}>Latest: #{latest.taskId} {latest.title} · {timeAgo(activityTime(latest), now)}</Button> : <small>Waiting for the first task change</small>}
      </div>
      <Button className="filter-button pulse-details" onClick={onDetails}>View details<ArrowRight size={14} aria-hidden="true" /></Button>
    </section>
  );
}
export default function ActivityLog({
  feed,
  tag,
  query,
  currentKeys,
  open,
}: {
  feed?: ActivityFeed;
  tag: string;
  query: string;
  currentKeys: Set<string>;
  open: (key: string) => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const update = () => setNow(Date.now());
    const timer = window.setInterval(update, 10000);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener("visibilitychange", update);
    };
  }, []);
  const [kind, setKind] = useState("all");
  const events = newestActivity(feed?.events || []).filter(
    (event) =>
      (tag === "all" || event.tag === tag) &&
      (kind === "all" || event.type === kind) &&
      `${event.taskId} ${event.title} ${event.actor || ""} ${event.fields.join(" ")}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  return (
    <section className="activity-panel">
      <div className="activity-heading">
        <h2>
          <Activity size={16} />
          Activity<span className="count">{events.length}</span>
        </h2>
        <FilterSelect
          label="Activity type"
          value={kind}
          onValueChange={setKind}
          icon={Activity}
          options={[
            { value: "all", label: "All changes" },
            ...Object.entries(types).map(([value, type]) => ({
              value,
              label: type.label,
            })),
          ]}
        />
      </div>
      {feed?.warning && (
        <div className="notice">
          <Info size={14} />
          {feed.warning}
        </div>
      )}
      <div className="activity-feed">
        {events.map((event) => {
          const { icon: Icon, label } = types[event.type];
          return (
            <article className="activity-event" key={event.id}>
              <div className={`activity-marker event-${event.type}`}>
                <Icon size={14} />
              </div>
              <div className="activity-body">
                <div className="activity-top">
                  <span className="event-label">
                    {event.depth ? "Subtask" : "Task"} {label.toLowerCase()}
                  </span>
                  <time
                    dateTime={activityTime(event)}
                    title={`${event.reportedAt ? `Recorded ${new Date(event.reportedAt).toLocaleString()} · ` : ""}Detected ${new Date(event.at).toLocaleString()}`}
                  >
                    {new Date(activityTime(event)).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    <small>{timeAgo(activityTime(event), now)}</small>
                  </time>
                </div>
                <Button
                  className="activity-task"
                  disabled={!currentKeys.has(event.taskKey)}
                  onClick={() => open(event.taskKey)}
                >
                  <span className="task-id">#{event.taskId}</span>
                  {event.title}
                </Button>
                <div className="activity-meta">
                  {event.type === "status" && (
                    <span className="activity-status">
                      <StatusIcon
                        status={event.before || "pending"}
                        size={12}
                      />
                      {event.before}
                      <ArrowRight size={12} />
                      <StatusIcon status={event.after || "pending"} size={12} />
                      {event.after}
                    </span>
                  )}
                  <span
                    className="actor"
                    title={
                      event.actor
                        ? "Attribution reported in the task JSON; not independently verified"
                        : "No author information recorded in the task JSON"
                    }
                  >
                    <UserRound size={12} />
                    {event.actor ? `${event.actor} · reported` : "Unknown"}
                  </span>
                  <span className="tag">{event.tag}</span>
                  {event.fields
                    .filter((field) => field !== "status")
                    .map((field) => (
                      <span className="field-chip" key={field}>
                        {field}
                      </span>
                    ))}
                </div>
                <div className="event-source">
                  <FileJson size={11} />
                  {event.source}
                </div>
              </div>
            </article>
          );
        })}
      </div>
      {!events.length && (
        <div className="activity-empty">
          <Activity size={29} />
          <h3>
            {kind === "all" ? "Listening for changes" : "No matching changes"}
          </h3>
          <p>New tasks, edits and status changes appear here.</p>
        </div>
      )}
      <details className="activity-note">
        <summary>
          <Info size={13} />
          About this log
        </summary>
        <p>
          Newest changes appear first. Task-recorded creation or update times
          are used when valid; otherwise the time is when the UI detected the
          change. Hover for timestamp details. Timestamp-only rewrites are
          ignored. Changes are observed when the UI refreshes. Existing tasks
          establish the first baseline; previous edits cannot be reconstructed.
          Events persist across restarts, with the latest 1,000 retained per
          project. Polling may combine rapid edits.
        </p>
        <p>
          Authors appear only when recorded in createdBy, generatedBy, updatedBy
          or similar task metadata. “Unknown” does not imply an agent.
        </p>
        {feed?.startedAt && (
          <p>
            <Clock3 size={12} />
            Recording since {new Date(feed.startedAt).toLocaleString()}
          </p>
        )}
      </details>
    </section>
  );
}
