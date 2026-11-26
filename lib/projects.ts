import { readAgentActivity } from "./agent-activity";
import { mkdir, readFile, realpath, stat, writeFile, rename } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { loadTasks } from "./tasks";
import { recordActivity } from "./activity";
import { flatten } from "./views";
import { timingFor } from "./timing";
export type Project = { id: string; name: string; root: string; pinned: boolean; addedAt: string };
const initialRoot = () => process.env.TASK_MASTER_PROJECT || process.cwd();
const directory = () => process.env.TASK_MASTER_UI_STATE_DIR || path.join(process.cwd(), ".task-master-ui");
const identify = (root: string) => createHash("sha256").update(root).digest("hex").slice(0, 20);
async function projectFor(root: string): Promise<Project> {
  const absolute = await realpath(root);
  if (!(await stat(absolute)).isDirectory()) throw Error("Choose a project folder, not a file.");
  return { id: identify(absolute), name: path.basename(absolute), root: absolute, pinned: false, addedAt: new Date().toISOString() };
}
export async function projects(): Promise<Project[]> {
  let saved: Project[] = [];
  try { saved = JSON.parse(await readFile(path.join(directory(), "projects.json"), "utf8")); }
  catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
  const initial = await projectFor(initialRoot());
  return saved.some(p => p.id === initial.id) ? saved : [initial, ...saved];
}
let queue: Promise<unknown> = Promise.resolve();
export function changeProjects(change: (items: Project[]) => Promise<Project[]>) {
  const work = queue.catch(() => {}).then(async () => {
    const result = await change(await projects());
    await mkdir(directory(), { recursive: true });
    const target = path.join(directory(), "projects.json"), temporary = `${target}.${randomUUID()}.tmp`;
    await writeFile(temporary, JSON.stringify(result), { mode: 0o600 });
    await rename(temporary, target);
    return result;
  });
  queue = work;
  return work;
}
export async function addProject(root: string) {
  if (!path.isAbsolute(root)) throw Error("Enter an absolute folder path.");
  const project = await projectFor(root);
  return changeProjects(async items => items.some(p => p.id === project.id) ? items : [...items, project]);
}
export async function projectData(project: Project) {
  const data = await loadTasks(project.root);
  const activity = await recordActivity(data.root, data.tasks, data.warnings.length === 0);
  for (const row of flatten(data.tasks)) row.task.timing = timingFor(row.task, activity.timing || {}, row.depth);
  activity.agentActivity = await readAgentActivity(project.root);
  return { ...data, activity, projectId: project.id };
}
