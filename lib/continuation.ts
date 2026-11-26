import { mkdir, lstat, readFile, writeFile, open, rename, rm } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { InputError } from "./prd/security";
export const defaultContinuation = { enabled: false, reason: "Continue the next ready task from this project's approved Task Master backlog. Read AGENTS.md and all saved owner answers first. Verify changes and record evidence. Continue independent work when a task is blocked. Stop when approved scope is complete, no useful authorized work remains, or the owner asks to stop. Do not bypass approvals or repeat unchanged failed attempts.", maxUnchangedStops: 3 };
export type Continuation = typeof defaultContinuation;
const hash = (text: string) => createHash("sha256").update(text).digest("hex");
export async function continuationDirectory(root: string) {
  const dir = path.join(root, ".vibeboard");
  await mkdir(dir, { recursive: true });
  const info = await lstat(dir);
  if (!info.isDirectory() || info.isSymbolicLink()) throw new InputError("Invalid project settings directory.");
  return dir;
}
export async function readContinuation(root: string) {
  const file = path.join(root, ".vibeboard/continuation.json");
  try {
    const parent = await lstat(path.dirname(file)); if (parent.isSymbolicLink() || !parent.isDirectory()) throw new InputError("Invalid project settings directory.");
    const info = await lstat(file); if (info.isSymbolicLink() || !info.isFile() || info.size > 10000) throw new InputError("Invalid continuation settings.");
    const text = await readFile(file, "utf8"), value = JSON.parse(text);
    validate(value);
    return { settings: value as Continuation, revision: hash(text) };
  } catch (error) { if ((error as NodeJS.ErrnoException).code === "ENOENT") return { settings: defaultContinuation, revision: null }; throw error; }
}
function validate(value: Continuation) {
  if (!value || typeof value.enabled !== "boolean" || typeof value.reason !== "string" || !value.reason.trim() || value.reason.length > 4000 || !Number.isInteger(value.maxUnchangedStops) || value.maxUnchangedStops < 1 || value.maxUnchangedStops > 20) throw new InputError("Provide a reason and a no-progress limit from 1 to 20.");
}
export async function saveContinuation(root: string, settings: Continuation, revision: string | null) {
  validate(settings);
  const dir = await continuationDirectory(root), lock = path.join(dir, "continuation.lock"), file = path.join(dir, "continuation.json"), temp = `${file}.${randomUUID()}.tmp`;
  const handle = await open(lock, "wx", 0o600).catch(() => { throw new InputError("Settings are being saved. Retry shortly."); });
  try {
    if ((await readContinuation(root)).revision !== revision) throw new InputError("Settings changed. Reload before saving.");
    await writeFile(temp, JSON.stringify(settings, null, 2) + "\n", { flag: "wx", mode: 0o600 });
    await rename(temp, file);
    return readContinuation(root);
  } finally { await rm(temp, { force: true }); await handle.close(); await rm(lock, { force: true }); }
}
export function stopHookConfiguration(root: string) {
  const quote = (text: string) => `'${text.replace(/'/g, "'\\''")}'`;
  return { hooks: { Stop: [{ hooks: [{ type: "command", command: `${quote(process.execPath)} ${quote(path.join(root, ".vibeboard/stop-hook.mjs"))}`, timeout: 10 }] }] } };
}

export async function prepareContinuation(root: string, enabled: boolean) {
  const current = await readContinuation(root);
  if (current.revision === null) await saveContinuation(root, { ...defaultContinuation, enabled }, null);
  const dir = await continuationDirectory(root);
  const script = await readFile(path.join(process.cwd(), "bin/vibeboard-stop-hook.mjs"), "utf8");
  for (const [name, content] of [["stop-hook.mjs", script], ["hooks.json", JSON.stringify(stopHookConfiguration(root), null, 2) + "\n"]]) {
    try { await writeFile(path.join(dir, name), content, { flag: "wx", mode: 0o600 }); }
    catch (error) { if ((error as NodeJS.ErrnoException).code !== "EEXIST") throw error; }
  }
}
