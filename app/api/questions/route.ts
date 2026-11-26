import { projects } from "@/lib/projects";
import { readQuestions, answerQuestion, createQuestion, consumeAnswer, pickUpAnswers } from "@/lib/questions";
import { sameOrigin, jsonBody, field, errorResponse, InputError } from "@/lib/prd/security";
export const dynamic = "force-dynamic";
async function root(request: Request) {
  const id = new URL(request.url).searchParams.get("project");
  const project = (await projects()).find(p => p.id === id);
  if (!project) throw new InputError("Select a registered project.");
  return project.root;
}
export async function GET(request: Request) {
  try { return Response.json(await readQuestions(await root(request)), { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request);
    const selectedRoot = await root(request);
    if (body.action === "create") {
      if (!Array.isArray(body.taskIds) || body.taskIds.some((id: unknown) => typeof id !== "string") || typeof body.blocking !== "boolean" || (body.options !== undefined && !Array.isArray(body.options))) throw new InputError("Invalid question fields.");
      return Response.json(await createQuestion(selectedRoot, { id: body.id === undefined ? undefined : field(body.id, "Question ID", 200), question: field(body.question, "Question", 2000), context: field(body.context, "Context", 10000), taskIds: body.taskIds, blocking: body.blocking, options: body.options, originThreadId: body.originThreadId === undefined ? undefined : field(body.originThreadId, "Origin thread", 200) }));
    }
    if (body.action === "pickup") return Response.json(await pickUpAnswers(selectedRoot));
    if (body.action === "consume") return Response.json(await consumeAnswer(selectedRoot, field(body.id, "Question ID", 200), field(body.answer, "Expected answer", 20000)));
    if (body.action !== undefined && body.action !== "answer") throw new InputError("Unknown question action.");
    return Response.json(await answerQuestion(selectedRoot, field(body.id, "Question ID", 200), field(body.answer, "Answer", 20000)));
  } catch (error) { return errorResponse(error); }
}
