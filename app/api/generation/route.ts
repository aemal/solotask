import { sameOrigin, jsonBody, field, credentials, InputError, errorResponse } from "@/lib/prd/security";
import { uiStacks } from "@/lib/skill-catalog";
import { DEFAULT_AGENTS } from "@/lib/agents-template";
import { startGeneration } from "@/lib/prd/generation";
export const runtime = "nodejs";
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request), { apiKey, model } = credentials(body);
    if (body.approved !== true) throw new InputError("Review and approve the PRD before generating tasks.");
    if (!Number.isInteger(body.count) || body.count < 1 || body.count > 50) throw new InputError("Request between 1 and 50 tasks.");
    if (body.uiStack !== undefined && (body.appType !== "web" || body.existing === true || !uiStacks.some(s => s.id === body.uiStack))) throw new InputError("UI stack selection is only available for explicitly selected new web projects.");
    if (body.autoContinue !== undefined && typeof body.autoContinue !== "boolean") throw new InputError("Invalid continuation mode.");
    if (body.existing !== undefined && typeof body.existing !== "boolean") throw new InputError("Invalid project mode.");
    if (body.agents !== undefined && (typeof body.agents !== "string" || body.agents.length > 80000)) throw new InputError("Agent instructions must be under 80,000 characters.");
    return Response.json(await startGeneration({ uiStack: body.uiStack, autoContinue: body.autoContinue !== false, existing: body.existing === true, agents: body.agents ?? DEFAULT_AGENTS, root: field(body.root, "Destination folder", 3000).trim(), prd: field(body.prd, "PRD"), apiKey, model, count: body.count }), { status: 202 });
  } catch (error) { return errorResponse(error); }
}
