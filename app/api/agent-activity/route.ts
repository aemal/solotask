import { projects } from "@/lib/projects";
import { readAgentActivity, reportAgentActivity } from "@/lib/agent-activity";
import { sameOrigin, jsonBody, field, errorResponse, InputError } from "@/lib/prd/security";
import { agentStates, type AgentState } from "@/lib/agent-activity-model";
export const dynamic = "force-dynamic";
async function root(request: Request) {
  const id = new URL(request.url).searchParams.get("project");
  const project = (await projects()).find(p => p.id === id);
  if (!project) throw new InputError("Select a registered project.");
  return project.root;
}
export async function GET(request: Request) {
  try { return Response.json(await readAgentActivity(await root(request)), { headers: { "Cache-Control": "no-store" } }); } catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request);
    if (!agentStates.includes(body.status)) throw new InputError("Invalid agent status.");
    return Response.json(await reportAgentActivity(await root(request), { sessionId: field(body.sessionId, "Session ID", 200), status: body.status as AgentState, detail: body.detail === undefined ? "" : field(body.detail, "Activity", 500) }));
  } catch (error) { return errorResponse(error); }
}
