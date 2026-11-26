import { projects } from "@/lib/projects";
import { readInstructions, saveInstructions } from "@/lib/agent-instructions";
import { sameOrigin, jsonBody, errorResponse, InputError } from "@/lib/prd/security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
async function root(request: Request) {
  const id = new URL(request.url).searchParams.get("project");
  const project = (await projects()).find(p => p.id === id);
  if (!project) throw new InputError("Select a registered project.");
  return project.root;
}
export async function GET(request: Request) {
  try { return Response.json(await readInstructions(await root(request), new URL(request.url).searchParams.get("file") || "AGENTS.md"), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request);
    if (typeof body.content !== "string" || !(body.revision === null || typeof body.revision === "string")) throw new InputError("Invalid instructions or revision.");
    return Response.json(await saveInstructions(await root(request), body.content, body.revision, new URL(request.url).searchParams.get("file") || "AGENTS.md"));
  } catch (error) { return errorResponse(error); }
}
