import { readdir, lstat } from "node:fs/promises";
import path from "node:path";
import { projectSkillFiles } from "@/lib/project-skills";
import { projects } from "@/lib/projects";
import { InputError, errorResponse } from "@/lib/prd/security";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("project");
    const project = (await projects()).find(p => p.id === id);
    if (!project) throw new InputError("Select a registered project.");
    const files = new Set<string>(["AGENTS.md"]);
    for (const relative of ["", ".taskmaster/docs"]) {
      try {
        if (relative) {
          for (const part of [".taskmaster", relative]) {
            const info = await lstat(path.join(project.root, part));
            if (info.isSymbolicLink() || !info.isDirectory()) throw new InputError("Markdown folder must be a regular project directory.");
          }
        }
        for (const entry of await readdir(path.join(project.root, relative), { withFileTypes: true })) {
          if (entry.isFile() && /^[A-Za-z0-9][A-Za-z0-9._ -]*\.md$/i.test(entry.name)) files.add(relative ? `${relative}/${entry.name}` : entry.name);
        }
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== "ENOENT") throw error; }
    }
    for (const file of await projectSkillFiles(project.root)) files.add(file);
    return Response.json({ files: [...files].sort((a,b) => a === "AGENTS.md" ? -1 : b === "AGENTS.md" ? 1 : a.localeCompare(b)) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) { return errorResponse(error); }
}
