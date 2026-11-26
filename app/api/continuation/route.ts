import { projects } from "@/lib/projects";
import { readContinuation, saveContinuation, stopHookConfiguration, prepareContinuation } from "@/lib/continuation";
import { sameOrigin, jsonBody, errorResponse, InputError } from "@/lib/prd/security";
import { readFile, lstat } from "node:fs/promises";
import path from "node:path";
export const dynamic = "force-dynamic";
async function projectRoot(request: Request) {
  const id = new URL(request.url).searchParams.get("project");
  const project = (await projects()).find(p => p.id === id);
  if (!project) throw new InputError("Select a registered project.");
  return project.root;
}
async function response(root: string) {
  const data = await readContinuation(root);
  let lastInvocation = null;
  try { const file = path.join(root, ".vibeboard/stop-state.json"), info = await lstat(file); if (!info.isSymbolicLink() && info.size < 10000) { const state = JSON.parse(await readFile(file, "utf8")); lastInvocation = { at: state.at, outcome: state.outcome }; } } catch {}
  return Response.json({ ...data, hookConfiguration: stopHookConfiguration(root), lastInvocation }, { headers: { "Cache-Control": "no-store" } });
}
export async function GET(request: Request) { try { return await response(await projectRoot(request)); } catch (error) { return errorResponse(error); } }
export async function POST(request: Request) {
  try { sameOrigin(request); const root = await projectRoot(request), body = await jsonBody(request); if (!(body.revision === null || typeof body.revision === "string")) throw new InputError("Invalid settings revision."); await saveContinuation(root, body.settings, body.revision); await prepareContinuation(root, body.settings.enabled); return response(root); } catch (error) { return errorResponse(error); }
}
