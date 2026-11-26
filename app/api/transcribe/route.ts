import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { binary, runProcess } from "@/lib/prd/process";
import { sameOrigin, InputError, errorResponse } from "@/lib/prd/security";
export const runtime = "nodejs";
export const maxDuration = 900;
let transcribing = false;
export async function POST(request: Request) {
  let folder: string | undefined;
  let ownsLock = false;
  try {
    sameOrigin(request);
    if (transcribing) throw new InputError("Whisper is already transcribing. Try again when it finishes.");
    if (Number(request.headers.get("content-length")) > 20 * 1024 * 1024) throw new InputError("Recording exceeds 20 MB. Record a shorter passage.");
    transcribing = true; ownsLock = true;
    const form = await request.formData(), audio = form.get("audio");
    if (!(audio instanceof File) || !audio.size || audio.size > 20 * 1024 * 1024) throw new InputError("Provide an audio recording under 20 MB.");
    if (!/^(audio|video)\/(webm|ogg|mp4|wav|mpeg|x-wav)/.test(audio.type)) throw new InputError("Unsupported audio recording format.");
    const whisper = await binary("whisper"); await binary("ffmpeg");
    folder = await mkdtemp(path.join(os.tmpdir(), "vibeboard-voice-"));
    const file = path.join(folder, "recording" + (audio.type.includes("mp4") ? ".mp4" : audio.type.includes("ogg") ? ".ogg" : audio.type.includes("wav") ? ".wav" : audio.type.includes("mpeg") ? ".mp3" : ".webm"));
    await writeFile(file, Buffer.from(await audio.arrayBuffer()), { mode: 0o600 });
    try {
      await runProcess(whisper, [file, "--model", process.env.VIBEBOARD_WHISPER_MODEL || "base", "--output_format", "txt", "--output_dir", folder, "--fp16", "False", "--verbose", "False"], { cwd: folder, signal: request.signal, timeout: 600000 });
    } catch {
      throw new InputError(request.signal.aborted ? "Transcription cancelled." : "Local Whisper could not transcribe. Check ffmpeg, the Whisper installation and first-run model/tokenizer downloads; see README setup instructions.");
    }
    const text = (await readFile(path.join(folder, "recording.txt"), "utf8")).trim();
    if (!text) throw new InputError("No speech detected. Try another recording.");
    return Response.json({ text });
  } catch (error) { return errorResponse(error); }
  finally { if (ownsLock) transcribing = false; if (folder) await rm(folder, { recursive: true, force: true }); }
}
