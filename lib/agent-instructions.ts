import { readFile, lstat, open, rename, rm } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { InputError } from "./prd/security";
async function documentPath(root: string, name: string) {
  const skill = /^\.agents\/skills\/[A-Za-z0-9][A-Za-z0-9._-]*(?:\/[A-Za-z0-9][A-Za-z0-9._-]*)*\.md$/i.test(name) && !name.split("/").some(p => p === "." || p === "..");
  if (!skill && !/^(?:\.taskmaster\/docs\/)?[A-Za-z0-9][A-Za-z0-9._ -]*\.md$/i.test(name)) throw new InputError("Choose a project Markdown or installed skill file.");
  if (skill) {
    const parts = name.split("/").slice(0, -1);
    for (let i=1;i<=parts.length;i++) { const info = await lstat(path.join(root,...parts.slice(0,i))); if (!info.isDirectory() || info.isSymbolicLink()) throw new InputError("Skill folders must be regular project directories."); }
  }
  if (name.startsWith(".taskmaster/")) {
    for (const directory of [path.join(root, ".taskmaster"), path.join(root, ".taskmaster/docs")]) {
      const info = await lstat(directory);
      if (!info.isDirectory() || info.isSymbolicLink()) throw new InputError("Markdown folder must be a regular project directory.");
    }
  }
  return path.join(root, name);
}
const revision = (content: string) => createHash("sha256").update(content).digest("hex");
export async function readInstructions(root: string, name = "AGENTS.md") {
  const file = await documentPath(root, name);
  try {
    const info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 100000) throw new InputError(`${name} must be a regular file under 100 KB.`);
    const content = await readFile(file, "utf8");
    return { content, revision: revision(content), exists: true };
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { content: "", revision: null, exists: false };
    throw error;
  }
}
export async function saveInstructions(root: string, content: string, expectedRevision: string | null, name = "AGENTS.md") {
  if (typeof content !== "string" || Buffer.byteLength(content) > 100000) throw new InputError("Instructions must be under 100 KB.");
  const file = await documentPath(root, name), lock = name.startsWith(".agents/skills/") ? path.join(root, ".vibeboard/skills.lock") : path.join(root, ".vibeboard-agents.lock"), temporary = `${file}.${randomUUID()}.tmp`;
  let handle;
  try { handle = await open(lock, "wx", 0o600); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "EEXIST") throw new InputError("Instructions are being saved. Retry shortly.");
    throw error;
  }
  try {
    if ((await readInstructions(root, name)).revision !== expectedRevision) throw new InputError(`${name} changed on disk. Reload it before saving to avoid overwriting changes.`);
    const output = await open(temporary, "wx", 0o600);
    try { await output.writeFile(content); } finally { await output.close(); }
    if ((await readInstructions(root, name)).revision !== expectedRevision) throw new InputError(`${name} changed on disk. Reload it before saving.`);
    await rename(temporary, file);
    return { content, revision: revision(content), exists: true };
  } finally { await rm(temporary, { force: true }); await handle.close(); await rm(lock, { force: true }); }
}
