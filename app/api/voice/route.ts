import { voiceWorker } from "@/lib/prd/voice-worker";
import { sameOrigin, InputError, errorResponse } from "@/lib/prd/security";
export const runtime = "nodejs";
export const maxDuration = 240;
export async function GET() {
  try { await voiceWorker.prepare(); return Response.json({ ready: true }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return errorResponse(error); }
}
export async function POST(request: Request) {
  try {
    sameOrigin(request);
    if (request.headers.get("content-type") !== "application/octet-stream") throw new InputError("Expected PCM16 audio.");
    const reader = request.body?.getReader(); if (!reader) throw new InputError("Audio is required.");
    const chunks: Uint8Array[] = []; let size = 0;
    try { while (true) { const { value, done } = await reader.read(); if (done) break; size += value.length; if (size > 640000) { await reader.cancel(); throw new InputError("Audio windows must be under 20 seconds."); } chunks.push(value); } } finally { reader.releaseLock(); }
    if (!size || size % 2) throw new InputError("Invalid PCM16 audio.");
    return Response.json({ text: await voiceWorker.transcribe(Buffer.concat(chunks)) });
  } catch (error) { return errorResponse(error); }
}
