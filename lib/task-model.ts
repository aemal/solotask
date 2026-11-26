import type { TaskTiming } from "./timing";
export type Task = {
  timing?: TaskTiming;
  raw: Record<string, unknown>;
  complexity: number | null;
  complexityReport?: Record<string, unknown>;
  id: string;
  title: string;
  description: string;
  status: string;
  priority: string;
  details: string;
  testStrategy: string;
  dependencies: string[];
  subtasks: Task[];
  source: string;
  tag: string;
  key: string;
};
export const isComplete = (status: string) =>
  ["done", "completed", "cancelled"].includes(status);
export function progress(task: Task): number {
  if (isComplete(task.status)) return 100;
  if (!task.subtasks.length) return 0;
  return Math.round(
    task.subtasks.reduce((sum, child) => sum + progress(child), 0) /
      task.subtasks.length,
  );
}
