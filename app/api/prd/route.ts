import { sameOrigin, jsonBody, field, credentials, InputError, errorResponse } from "@/lib/prd/security";
import { generatePrd, revisionPrompt } from "@/lib/prd/openai";
export const runtime = "nodejs";
export const maxDuration = 240;
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request), { apiKey, model } = credentials(body);
    const instruction = field(body.instruction, "Instructions", 100000);
    let selection: string | undefined;
    let document = "";
    if (body.action === "revise") {
      document = field(body.document, "PRD");
      const start = body.start, end = body.end;
      if (!Number.isInteger(start) || !Number.isInteger(end) || start < 0 || end <= start || end > document.length) throw new InputError("Select a passage in the PRD to revise.");
      selection = document.slice(start, end);
    } else if (body.action !== "draft") throw new InputError("Unknown PRD action.");
    return Response.json({ text: await generatePrd(apiKey, model, revisionPrompt(document, instruction, selection)) });
  } catch (error) { return errorResponse(error); }
}
