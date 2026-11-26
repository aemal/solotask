import { taskResponse } from "@/lib/task-response";
import { projects, projectData } from "@/lib/projects";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const items = await projects();
    const id = new URL(request.url).searchParams.get("project");
    const project = id ? items.find(p => p.id === id) : items[0];
    if (!project) return Response.json({ error: "Project not found." }, { status: 404 });
    return Response.json(taskResponse(await projectData(project), new URL(request.url).searchParams.get("history") === "full"), { headers: { "Cache-Control": "no-store" } });
  } catch {
    return Response.json({ error: "Cannot read the selected project. Check the project path and permissions." }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const { sameOrigin, jsonBody, field, errorResponse, InputError } = await import('@/lib/prd/security');
  try {
    sameOrigin(request);
    const body = await jsonBody(request);
    const project = (await projects()).find(p => p.id === new URL(request.url).searchParams.get('project'));
    if (!project) throw new InputError('Select a registered project.');
    if (!['edit','delete','create','create-subtask'].includes(body.action)) throw new InputError('Invalid task action.');
    if (body.action !== 'delete' && (!body.patch || typeof body.patch !== 'object' || Array.isArray(body.patch))) throw new InputError('Task fields are required.');
    const { mutateTask } = await import('@/lib/task-edit');
    return Response.json(await mutateTask(project.root, field(body.key, 'Task', 2000), body.expected, body.action !== 'delete' ? body.patch : undefined, body.action === 'create' || body.action === 'create-subtask', body.newTag === undefined ? undefined : field(body.newTag, 'Tag', 64).trim(), body.action === 'create-subtask'));
  } catch(error) { return errorResponse(error); }
}
