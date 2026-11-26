import { prepareProjectSkills, downloadSkill } from "../project-skills";
import { prepareContinuation } from "../continuation";
import { randomUUID } from "node:crypto";
import { mkdir, readdir, realpath, open, mkdtemp, writeFile, readFile, rm, cp, rename, lstat } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { addProject } from "../projects";
import { parseTasks } from "../tasks";
import { binary, runProcess } from "./process";
import { DEFAULT_AGENTS } from "../agents-template";
import { InputError, redact } from "./security";
export type GenerationJob = { id: string; root: string; status: "running" | "complete" | "failed" | "cancelled"; stage: string; logs: string[]; startedAt: string; projectId?: string; taskCount?: number; error?: string };
type InternalJob = { job: GenerationJob; controller: AbortController };
const shared = globalThis as typeof globalThis & { vibeboardJobs?: Map<string, InternalJob> };
const jobs = shared.vibeboardJobs ||= new Map<string, InternalJob>();
export function getJob(id: string) { return jobs.get(id)?.job; }
export function cancelJob(id: string) { const item = jobs.get(id); if (item?.job.status === "running") item.controller.abort(); return item?.job; }
export async function reserveFolder(input: string, existing = false) {
  if (!path.isAbsolute(input) || input.includes("\0")) throw new InputError("Choose an absolute destination folder path.");
  await mkdir(input, { recursive: true });
  const root = await realpath(input);
  async function check() {
    if (!existing) { if ((await readdir(root)).some(name => name !== ".vibeboard-generation.lock")) throw new InputError("Choose a new or empty folder. Existing project files will not be overwritten."); }
    for (const name of [".taskmaster", "tasks.json", "tasks/tasks.json"]) {
      try { await lstat(path.join(root, name)); throw new InputError("This folder already has task planning files. Open the existing plan instead; it will not be replaced."); }
      catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
  }
  await check();
  const lock = path.join(root, ".vibeboard-generation.lock");
  try { const handle = await open(lock, "wx", 0o600); await handle.close(); }
  catch { throw new InputError("Another generation is using this folder."); }
  try { await check(); } catch (error) { await rm(lock, { force: true }); throw error; }
  return { root, release: () => rm(lock, { force: true }) };
}
export async function startGeneration(input: { root: string; prd: string; apiKey: string; model: string; count: number; agents?: string; existing?: boolean; autoContinue?: boolean; uiStack?: string }) {
  if ([...jobs.values()].some(item => item.job.status === "running")) throw new InputError("A task generation is already running. Finish or cancel it first.");
  const executable = await binary("task-master");
  const reservation = await reserveFolder(input.root, input.existing);
  const id = randomUUID(), controller = new AbortController();
  const job: GenerationJob = { id, root: reservation.root, status: "running", stage: "Preparing Task Master", logs: [], startedAt: new Date().toISOString() };
  jobs.set(id, { job, controller });
  for (const [key, value] of jobs) if (jobs.size > 40 && value.job.status !== "running") jobs.delete(key);
  const log = (line: string) => { job.logs.push(redact(line, input.apiKey)); if (job.logs.length > 250) job.logs.shift(); };
  void (async () => {
    let stage: string | undefined, publish: string | undefined;
    let publishedAgents = false;
    let publishedWeb: string[] = [];
    try {
      stage = await mkdtemp(path.join(os.tmpdir(), "vibeboard-plan-"));
      if (input.uiStack) {
        if (input.existing) throw new InputError("Existing projects keep their UI stack.");
        await prepareProjectSkills(stage, input.uiStack, [], async source => { if(controller.signal.aborted) throw new InputError("Cancelled."); job.stage = `Installing latest ${source.name} skill`; log(`Downloading ${source.repo}/${source.directory} from its current default branch`); return downloadSkill(source); });
      }
      const taskmaster = path.join(stage, ".taskmaster");
      await mkdir(path.join(taskmaster, "tasks"), { recursive: true }); await mkdir(path.join(taskmaster, "docs"));
      await writeFile(path.join(taskmaster, "docs/prd.md"), input.prd, { mode: 0o600 });
      const model = { provider: "openai", modelId: input.model, maxTokens: 16000, temperature: 0.2 };
      await writeFile(path.join(taskmaster, "config.json"), JSON.stringify({ models: { main: model, research: model, fallback: model }, global: { projectName: path.basename(job.root), logLevel: "info", defaultSubtasks: 5, defaultPriority: "medium", defaultTag: "master" } }, null, 2));
      job.stage = "Generating tasks with Task Master"; log(`Task Master · OpenAI ${input.model} · ${input.count} requested tasks`);
      await runProcess(executable, ["parse-prd", "--input", path.join(taskmaster, "docs/prd.md"), "--output", path.join(taskmaster, "tasks/tasks.json"), "--num-tasks", String(input.count), "--force"], { cwd: stage, apiKey: input.apiKey, signal: controller.signal, log });
      if (controller.signal.aborted) throw new InputError("Cancelled.");
      const parsed = parseTasks(JSON.parse(await readFile(path.join(taskmaster, "tasks/tasks.json"), "utf8")), ".taskmaster/tasks/tasks.json");
      if (!parsed.length) throw new InputError("Task Master finished without a valid task plan. Check its log and model configuration.");
      job.stage = "Saving project";
      if (!input.existing && (await readdir(job.root)).some(name => name !== ".vibeboard-generation.lock")) throw new InputError("The destination changed during generation. Files were not published.");
      if (input.existing) for (const name of ["tasks.json", "tasks/tasks.json"]) {
        try { await lstat(path.join(job.root, name)); throw new InputError("Task planning files appeared during generation. They were preserved; the new plan was not published."); }
        catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
      }
      publish = path.join(job.root, `.vibeboard-publish-${id}`);
      await cp(taskmaster, publish, { recursive: true, force: false, errorOnExist: true });
      if (controller.signal.aborted) throw new InputError("Cancelled.");
      const destination = path.join(job.root, ".taskmaster");
      try { await lstat(destination); throw new InputError("Task files already exist; refusing to overwrite them."); } catch (e) { if ((e as NodeJS.ErrnoException).code !== "ENOENT") throw e; }
      try {
        const agentsFile = await open(path.join(job.root, "AGENTS.md"), "wx", 0o600);
        publishedAgents = true;
        try { await agentsFile.writeFile((input.agents ?? DEFAULT_AGENTS) + (input.uiStack ? "\n\n## UI stack and installed skills\nRead UI-STACK.md before implementing UI. The selected stack is locked; do not switch frameworks. Project skills are in .agents/skills/*/SKILL.md; read relevant skills and their references. Preserve local skill edits during updates.\n" : "")); } finally { await agentsFile.close(); }
      } catch (error) {
        if (!input.existing || (error as NodeJS.ErrnoException).code !== "EEXIST") throw error;
        log("Preserved existing AGENTS.md instructions.");
      }
      if (input.uiStack) for (const name of [".agents", ".vibeboard", "UI-STACK.md"]) {
        try { await lstat(path.join(job.root,name)); throw new InputError("Project setup files appeared during generation. They were preserved."); } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
        await rename(path.join(stage!,name),path.join(job.root,name)); publishedWeb.push(name);
      }
      await rename(publish, destination); publish = undefined; publishedAgents = false; publishedWeb = [];
      try { await prepareContinuation(job.root, input.autoContinue !== false); log("Continuation settings and Stop hook bundle prepared. Install and trust .vibeboard/hooks.json in Codex to activate it."); }
      catch { log("Task plan saved; continuation setup needs attention in Project settings."); }
      try {
        const items = await addProject(job.root);
        job.projectId = items.find(p => p.root === job.root)?.id;
      } catch { job.error = "Task plan saved. Automatic cockpit registration failed; add this folder with Add existing folder."; log(job.error); }
      job.taskCount = parsed.length; job.status = "complete"; job.stage = "Ready in your cockpit";
      log(`Saved ${parsed.length} tasks to .taskmaster/tasks/tasks.json`);
    } catch (error) {
      job.status = controller.signal.aborted ? "cancelled" : "failed";
      job.error = error instanceof InputError ? redact(error.message, input.apiKey) : "Generation failed. Check the folder permissions and local Task Master installation.";
      job.stage = job.status === "cancelled" ? "Cancelled" : "Generation failed"; log(job.error);
    } finally {
      input.apiKey = "";
      if (stage) await rm(stage, { recursive: true, force: true }).catch(() => {});
      for (const name of publishedWeb) await rm(path.join(job.root,name),{recursive:true,force:true}).catch(()=>{});
      if (publishedAgents) await rm(path.join(job.root, "AGENTS.md"), { force: true });
      if (publish) await rm(publish, { recursive: true, force: true }).catch(() => {});
      await reservation.release().catch(() => {});
    }
  })();
  return job;
}
