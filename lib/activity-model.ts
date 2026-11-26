import type { TimingStore } from "./timing";
export type ActivityEvent = {
  id: string;
  at: string;
  reportedAt?: string;
  type: "added" | "removed" | "status" | "updated";
  taskKey: string;
  taskId: string;
  title: string;
  tag: string;
  source: string;
  depth: number;
  before?: string;
  after?: string;
  fields: string[];
  actor: string | null;
};
export type ActivityFeed = {
  agentActivity?: import("./agent-activity-model").AgentActivity;
  progressHistory?: import("./progress-history").ProgressSample[];
  timing?: TimingStore;
  startedAt: string;
  events: ActivityEvent[];
  warning?: string;
};

export function activityTime(event: ActivityEvent): string {
  return event.reportedAt || event.at;
}
export function newestActivity(events: ActivityEvent[]): ActivityEvent[] {
  return [...events].sort(
    (a, b) =>
      Date.parse(activityTime(b)) - Date.parse(activityTime(a)) ||
      Date.parse(b.at) - Date.parse(a.at),
  );
}

export type ProjectPulse = { bins: number[]; count: number; recentCount: number; observedAt: string; warning?: string };
export function projectPulse(feed: ActivityFeed, now = Date.now()): ProjectPulse {
  const bins = Array.from({ length: 40 }, () => 0);
  let recentCount = 0;
  for (const event of feed.events) {
    const age = now - Date.parse(activityTime(event));
    if (!Number.isFinite(age) || age < 0 || age >= 3600000) continue;
    bins[39 - Math.floor(age / 90000)]++;
    if (age < 300000) recentCount++;
  }
  return { bins, count: bins.reduce((sum, count) => sum + count, 0), recentCount, observedAt: new Date(now).toISOString(), ...(feed.warning ? { warning: feed.warning } : {}) };
}
