import { spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFile } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { binary, executablePath } from "./process";
import { InputError } from "./security";

type Pending = { resolve: (text: string) => void; reject: (error: Error) => void; timer: ReturnType<typeof setTimeout> };
class VoiceWorker {
  private child?: ChildProcessWithoutNullStreams;
  private ready?: Promise<void>;
  private pending = new Map<number, Pending>();
  private nextId = 0;
  private idle?: ReturnType<typeof setTimeout>;
  async prepare() { await this.start(); if (!this.pending.size) { clearTimeout(this.idle); this.idle = setTimeout(() => this.stop("Worker idle."), 10 * 60 * 1000); this.idle.unref(); } }
  async transcribe(audio: Buffer): Promise<string> {
    // Bound server work rather than building an unbounded queue of stale windows.
    if (this.pending.size >= 2) throw new InputError("Whisper is busy. Wait for the current audio window to finish.");
    await this.start();
    clearTimeout(this.idle);
    if (this.pending.size >= 2) throw new InputError("Whisper is busy. Wait for the current audio window to finish.");
    return new Promise((resolve, reject) => {
      const id = ++this.nextId;
      const timer = setTimeout(() => this.stop("Whisper timed out. Check local model setup."), 180000);
      this.pending.set(id, { resolve, reject, timer });
      this.child!.stdin.write(JSON.stringify({ id, audio: audio.toString("base64") }) + "\n", error => { if (error) this.stop("Whisper worker disconnected."); });
    });
  }
  private start() {
    if (this.ready) return this.ready;
    this.ready = this.launch().catch(error => { this.ready = undefined; throw error; });
    return this.ready;
  }
  private async launch() {
    const whisper = await binary("whisper");
    const header = (await readFile(whisper, "utf8")).split("\n")[0];
    const interpreter = process.env.VIBEBOARD_WHISPER_PYTHON || (header.startsWith("#!/") && !header.includes("/env ") ? header.slice(2).trim() : "python3");
    return new Promise<void>((resolve, reject) => {
      const child = spawn(interpreter, ["-u", path.join(process.cwd(), "scripts/whisper-worker.py"), process.env.VIBEBOARD_WHISPER_MODEL || "base"], { stdio: "pipe", env: { NODE_ENV: "production", PATH: executablePath(), HOME: os.homedir(), TMPDIR: os.tmpdir(), SYSTEMROOT: process.env.SYSTEMROOT, PYTHONUNBUFFERED: "1", VIBEBOARD_WHISPER_THREADS: process.env.VIBEBOARD_WHISPER_THREADS || "4", ...(process.env.TIKTOKEN_CACHE_DIR ? { TIKTOKEN_CACHE_DIR: process.env.TIKTOKEN_CACHE_DIR } : {}) } });
      this.child = child;
      let buffer = "", initialized = false;
      const timeout = setTimeout(() => { reject(new InputError("Whisper model startup timed out. Check first-run downloads.")); this.stop("Whisper startup timed out."); }, 180000);
      child.stderr.on("data", () => {}); // Drain diagnostics; no audio or transcripts in server logs.
      child.stdout.on("data", chunk => {
        buffer += chunk.toString();
        if (buffer.length > 1000000) { this.stop("Invalid Whisper response."); return; }
        let newline: number;
        while ((newline = buffer.indexOf("\n")) >= 0) {
          const line = buffer.slice(0, newline); buffer = buffer.slice(newline + 1);
          try {
            const message = JSON.parse(line);
            if (!initialized) {
              if (message.ready) { initialized = true; clearTimeout(timeout); resolve(); }
              else if (message.error) { clearTimeout(timeout); reject(new InputError(message.error)); this.stop(message.error); }
              continue;
            }
            const pending = this.pending.get(message.id);
            if (pending) { clearTimeout(pending.timer); this.pending.delete(message.id); message.error ? pending.reject(new InputError(message.error)) : pending.resolve(String(message.text || "")); }
            if (!this.pending.size) { clearTimeout(this.idle); this.idle = setTimeout(() => this.stop("Worker idle."), 10 * 60 * 1000); this.idle.unref(); }
          } catch { /* Ignore third-party startup notices outside the JSON protocol. */ }
        }
      });
      const closed = () => { clearTimeout(timeout); if (!initialized) reject(new InputError("Whisper could not start. Check Python, Whisper and model downloads.")); if (this.child === child) this.stop("Whisper worker stopped."); };
      child.on("error", closed); child.on("exit", closed);
    });
  }
  stop(message: string) {
    clearTimeout(this.idle);
    const child = this.child; this.child = undefined; this.ready = undefined;
    child?.kill("SIGKILL");
    for (const pending of this.pending.values()) { clearTimeout(pending.timer); pending.reject(new InputError(message)); }
    this.pending.clear();
  }
}
const shared = globalThis as typeof globalThis & { vibeboardVoiceWorker?: VoiceWorker; vibeboardVoiceWorkerVersion?: number };
if (shared.vibeboardVoiceWorkerVersion !== 2) { shared.vibeboardVoiceWorker?.stop("Worker upgraded."); shared.vibeboardVoiceWorker = new VoiceWorker(); shared.vibeboardVoiceWorkerVersion = 2; }
export const voiceWorker = shared.vibeboardVoiceWorker!;
