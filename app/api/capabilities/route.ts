import { binary } from "@/lib/prd/process";
export const dynamic = "force-dynamic";
export async function GET() {
  const available = async (name: "whisper" | "ffmpeg" | "task-master") => { try { await binary(name); return true; } catch { return false; } };
  const [whisper, ffmpeg, taskMaster] = await Promise.all([available("whisper"), available("ffmpeg"), available("task-master")]);
  return Response.json({ whisper, ffmpeg, taskMaster, whisperModel: process.env.VIBEBOARD_WHISPER_MODEL || "base" });
}
