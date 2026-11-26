import { getJob, cancelJob } from "@/lib/prd/generation";
import { sameOrigin, errorResponse } from "@/lib/prd/security";
export const dynamic = "force-dynamic";
type Context = { params: Promise<{ id: string }> };
export async function GET(_: Request, context: Context) {
  const job = getJob((await context.params).id);
  return job ? Response.json(job, { headers: { "Cache-Control": "no-store" } }) : Response.json({ error: "Run not found. The server may have restarted. Check the destination folder before retrying." }, { status: 404 });
}
export async function DELETE(request: Request, context: Context) {
  try {
    sameOrigin(request); const job = cancelJob((await context.params).id);
    return job ? Response.json(job) : Response.json({ error: "Run not found." }, { status: 404 });
  } catch (error) { return errorResponse(error); }
}
