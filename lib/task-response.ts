import { newestActivity } from "./activity-model";
import type { projectData } from "./projects";
// Timing is already materialized on each task; the observation store is server-owned.
export function taskResponse(data: Awaited<ReturnType<typeof projectData>>, fullHistory: boolean) {
  const { timing: _timing, ...activity } = data.activity;
  return { ...data, activity: { ...activity, events: fullHistory ? activity.events : newestActivity(activity.events).slice(0, 60) } };
}
