import { readdir, readFile, realpath, stat } from "node:fs/promises";
import path from "node:path";
import { type Task } from "./task-model";
const object = (v: unknown): v is Record<string, unknown> =>
  !!v && typeof v === "object" && !Array.isArray(v);
export function normalize(
  v: unknown,
  source: string,
  tag = "master",
  parent = "",
  inheritedPriority = "medium",
): Task | null {
  if (
    !object(v) ||
    !["string", "number"].includes(typeof v.id) ||
    typeof v.title !== "string"
  )
    return null;
  const id = String(v.id),
    key = `${source}:${tag}:${parent}${id}`;
  const field = (name: string) =>
    typeof v[name] === "string" ? (v[name] as string) : "";
  return {
    raw: v,
    complexity:
      typeof v.complexity === "number"
        ? v.complexity
        : typeof v.complexityScore === "number"
          ? v.complexityScore
          : null,
    id,
    key,
    title: field("title"),
    description: field("description"),
    status: field("status") || "pending",
    priority: field("priority") || inheritedPriority,
    details: field("details"),
    testStrategy: field("testStrategy"),
    dependencies: Array.isArray(v.dependencies)
      ? v.dependencies
          .filter((x) => typeof x === "string" || typeof x === "number")
          .map(String)
      : [],
    subtasks: Array.isArray(v.subtasks)
      ? v.subtasks
          .map((x) =>
            normalize(
              x,
              source,
              tag,
              `${parent}${id}.`,
              field("priority") || inheritedPriority,
            ),
          )
          .filter((x): x is Task => !!x)
      : [],
    source,
    tag,
  };
}
export function parseTasks(data: unknown, source: string): Task[] {
  const read = (items: unknown[], tag: string) =>
    items.map((x) => normalize(x, source, tag)).filter((x): x is Task => !!x);
  if (Array.isArray(data)) return read(data, "master");
  if (!object(data)) return [];
  if (Array.isArray(data.tasks)) return read(data.tasks, "master");
  if (typeof data.title === "string" && data.id !== undefined)
    return read([data], "master");
  return Object.entries(data).flatMap(([tag, value]) =>
    object(value) && Array.isArray(value.tasks) ? read(value.tasks, tag) : [],
  );
}
export async function loadTasks(root: string) {
  const absolute = await realpath(root),
    files: string[] = [],
    warnings: string[] = [];
  async function walk(dir: string) {
    let entries;
    try {
      entries = await readdir(dir, { withFileTypes: true });
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT")
        warnings.push(`Cannot read ${path.relative(absolute, dir)}`);
      return;
    }
    for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
      if (entry.isSymbolicLink()) continue;
      const file = path.join(dir, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && entry.name.endsWith(".json")) files.push(file);
    }
  }
  await walk(path.join(absolute, ".taskmaster", "tasks"));
  for (const name of ["tasks/tasks.json", "tasks.json"]) {
    const file = path.join(absolute, name);
    try {
      if ((await stat(file)).isFile()) files.push(file);
    } catch {}
  }
  const tasks: Task[] = [];
  let latest = 0;
  let currentTag: string | null = null;
  try {
    const state = JSON.parse(
      await readFile(path.join(absolute, ".taskmaster/state.json"), "utf8"),
    );
    if (typeof state.currentTag === "string") currentTag = state.currentTag;
  } catch {}
  for (const file of [...new Set(files)]) {
    const source = path.relative(absolute, file);
    try {
      const info = await stat(file);
      if (info.size > 20 * 1024 * 1024) throw new Error("File exceeds 20MB");
      const parsed = parseTasks(
        JSON.parse(await readFile(file, "utf8")),
        source,
      );
      tasks.push(...parsed);
      latest = Math.max(latest, info.mtimeMs);
    } catch {
      warnings.push(`Could not parse ${source}; check its JSON format.`);
    }
  }
  for (const name of [
    ".taskmaster/reports/task-complexity-report.json",
    "scripts/task-complexity-report.json",
  ]) {
    try {
      const report = JSON.parse(
        await readFile(path.join(absolute, name), "utf8"),
      );
      const attach = (entries: unknown, tag?: string) => {
        if (!Array.isArray(entries)) return;
        for (const entry of entries) {
          if (!object(entry)) continue;
          const matches = tasks.filter(
            (t) =>
              t.id === String(entry.taskId ?? entry.id) &&
              (!tag || t.tag === tag),
          );
          for (const task of matches) {
            task.complexityReport = entry;
            if (
              task.complexity === null &&
              typeof entry.complexityScore === "number"
            )
              task.complexity = entry.complexityScore;
          }
        }
      };
      attach(report.complexityAnalysis);
      if (object(report))
        for (const [tag, value] of Object.entries(report))
          if (object(value)) attach(value.complexityAnalysis, tag);
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code !== "ENOENT")
        warnings.push(`Could not parse ${name}`);
    }
  }
  return {
    currentTag,
    project: path.basename(absolute),
    root: absolute,
    tasks,
    files: files.map((f) => path.relative(absolute, f)),
    warnings,
    updatedAt: latest ? new Date(latest).toISOString() : null,
  };
}
