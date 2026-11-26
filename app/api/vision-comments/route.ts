import path from "node:path";
import { readFeedback } from "@/lib/vision-feedback";
import { demoTasks } from "@/lib/vision-kanban";
import {
  readTaskComments,
  addTaskComment,
  editTaskComment,
  deleteTaskComment,
} from "@/lib/task-comments";
import {
  InputError,
  sameOrigin,
  jsonBody,
  field,
  errorResponse,
} from "@/lib/prd/security";
export const dynamic = "force-dynamic";
// Separate storage; never resolve or mutate a real Task Master ticket.
const root = path.join(process.cwd(), ".vibeboard", "vision-demo");
async function ticket(key: unknown) {
  const value = field(key, "Ticket", 100);
  if (!demoTasks.some((t) => t.id === value) && !(await readFeedback(process.cwd())).tickets.some(t => t.id === value))
    throw new InputError("Unknown demo ticket.");
  return value;
}
export async function GET(request: Request) {
  try {
    const key = await ticket(new URL(request.url).searchParams.get("key"));
    const store = await readTaskComments(root);
    return Response.json(
      {
        comments: store.comments.filter(
          (c) => !c.deletedAt && c.taskKey === key,
        ),
      },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch (error) {
    return errorResponse(error);
  }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request);
    const key = await ticket(body.key);
    if (body.action !== undefined && !["edit", "delete"].includes(body.action))
      throw new InputError("Invalid comment action.");
    const id = field(body.id, "Comment ID", 100);
    const store =
      body.action === "edit"
        ? await editTaskComment(
            root,
            key,
            id,
            field(body.text, "Comment", 20000),
            field(body.expectedText, "Original comment", 20000),
          )
        : body.action === "delete"
          ? await deleteTaskComment(root, key, id)
          : await addTaskComment(
              root,
              key,
              field(body.text, "Comment", 20000),
              id,
            );
    return Response.json({
      comments: store.comments.filter((c) => !c.deletedAt && c.taskKey === key),
    });
  } catch (error) {
    return errorResponse(error);
  }
}
