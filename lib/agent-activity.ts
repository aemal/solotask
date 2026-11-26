import { mkdir, readFile, writeFile, rename, rm } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { agentStates, type AgentActivity, type AgentSignal } from "./agent-activity-model";
const target = (root: string) => path.join(process.env.TASK_MASTER_UI_STATE_DIR || path.join(process.cwd(), ".task-master-ui"), "agents", `${createHash("sha256").update(root).digest("hex")}.json`);
export async function readAgentActivity(root: string): Promise<AgentActivity> {
  try {
    const value = JSON.parse(await readFile(target(root), "utf8"));
    if (!Array.isArray(value.signals) || value.signals.length > 2000 || value.signals.some((s: AgentSignal) => typeof s.sessionId !== "string" || !agentStates.includes(s.status) || typeof s.detail !== "string" || !Number.isFinite(Date.parse(s.at)))) throw Error("Invalid agent history");
    return value;
  } catch (error) {
    return { signals: [], ...((error as NodeJS.ErrnoException).code !== "ENOENT" ? { warning: "Agent observation unavailable" } : {}) };
  }
}
let queue: Promise<unknown> = Promise.resolve();
export function reportAgentActivity(root: string, input: Omit<AgentSignal, "at">) {
  const work = queue.catch(() => {}).then(async () => {
    if (!agentStates.includes(input.status) || !input.sessionId.trim() || input.sessionId.length > 200 || input.detail.length > 500) throw Error("Invalid agent signal");
    const activity = await readAgentActivity(root);
    if (activity.warning) throw Error(activity.warning);
    const now = Date.now();
    const result: AgentActivity = { signals: [...activity.signals.filter(s => Date.parse(s.at) >= now - 3600000), { ...input, at: new Date(now).toISOString() }].slice(-2000) };
    const file = target(root), temporary = `${file}.${randomUUID()}.tmp`;
    await mkdir(path.dirname(file), { recursive: true });
    try { await writeFile(temporary, JSON.stringify(result), { mode: 0o600 }); await rename(temporary, file); }
    finally { await rm(temporary, { force: true }); }
    return result;
  });
  queue = work; return work;
}
