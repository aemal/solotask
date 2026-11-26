import { callbackConfig, callbackQueue, startCallbackWorker } from "@/lib/vision-callbacks";
import { sameOrigin, jsonBody, field, InputError, errorResponse } from "@/lib/prd/security";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id");
    return Response.json({ configured: Boolean(callbackConfig()), job: id ? await callbackQueue.read(id) : null }, { headers: { "Cache-Control": "no-store" } });
  } catch (e) { return errorResponse(e); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    const body = await jsonBody(request);
    if (body.action === "cancel") return Response.json({ job: await callbackQueue.cancel(field(body.id, "Callback", 32)) });
    if (body.action !== "schedule") throw new InputError("Invalid callback action.");
    if (!callbackConfig()) throw new InputError("Phone callbacks are not configured yet. Samantha cannot schedule a phone call until the recipient and provider setup are ready.");
    const job = await callbackQueue.schedule(field(body.session, "Conversation", 120), field(body.summary, "Task summary", 500));
    startCallbackWorker();
    return Response.json({ job });
  } catch (e) { return errorResponse(e); }
}
