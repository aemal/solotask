import { sameOrigin } from "@/lib/prd/security";
import { addProject, changeProjects, projects, projectData } from "@/lib/projects";
import { statusSummary } from "@/lib/dashboard";
import { newestActivity, projectPulse } from "@/lib/activity-model";
import { realpath } from "node:fs/promises";
import { flatten } from "@/lib/views";
export const dynamic = "force-dynamic";
export async function GET() {
  try {
    const items = await projects();
    const summaries = await Promise.all(items.map(async project => {
      try {
        const data = await projectData(project);
        const latest = newestActivity(data.activity.events)[0] || null;
        return { ...project, summary: statusSummary(data.tasks), agentActivity: data.activity.agentActivity, progressHistory: data.activity.progressHistory, pulse: projectPulse(data.activity), latest, latestAvailable: !!latest && flatten(data.tasks).some(r => r.task.key === latest.taskKey), warning: data.warnings[0] };
      } catch { return { ...project, error: "Folder unavailable. Check its path and permissions." }; }
    }));
    return Response.json({ projects: summaries, defaultId: items[0]?.id }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "Could not load saved projects." }, { status: 500 }); }
}
export async function POST(request: Request) {
  try { sameOrigin(request); } catch { return Response.json({ error: "Invalid request origin." }, { status: 403 }); }
  try {
    const body = await request.json();
    if (body.action === "pin" && typeof body.id === "string" && typeof body.pinned === "boolean") {
      await changeProjects(async items => items.map(p => p.id === body.id ? { ...p, pinned: body.pinned } : p));
      return Response.json({ ok: true });
    }
    if (typeof body.root !== "string" || !body.root.trim()) throw Error("Enter a project folder path.");
    const items = await addProject(body.root.trim());
    const root = await realpath(body.root.trim());
    return Response.json({ projects: items, addedId: items.find(p => p.root === root)?.id });
  } catch (error) { return Response.json({ error: error instanceof Error && !('code' in error) ? error.message : "Cannot open that folder. Check the path and permissions." }, { status: 400 }); }
}
