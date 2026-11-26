import { access } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import path from "node:path";
import os from "node:os";
import { InputError, redact } from "./security";
export const executablePath = () => [path.dirname(process.execPath), process.env.PATH, "/opt/homebrew/bin", "/usr/local/bin"].filter(Boolean).join(path.delimiter);
export async function binary(name: "whisper" | "ffmpeg" | "task-master") {
  const override = process.env[name === "whisper" ? "VIBEBOARD_WHISPER_BIN" : name === "ffmpeg" ? "VIBEBOARD_FFMPEG_BIN" : "VIBEBOARD_TASK_MASTER_BIN"];
  const candidates = override ? [override] : executablePath().split(path.delimiter).map(dir => path.join(dir, name + (process.platform === "win32" ? ".cmd" : "")));
  for (const candidate of candidates) { try { await access(candidate, constants.X_OK); return candidate; } catch {} }
  throw new InputError(`${name} is not installed or not on the SoloTask server's PATH.`);
}
export async function runProcess(command: string, args: string[], options: { cwd: string; apiKey?: string; signal?: AbortSignal; timeout?: number; log?: (line: string) => void }) {
  return new Promise<void>((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: options.cwd, shell: false, detached: process.platform !== "win32", stdio: ["ignore", "pipe", "pipe"],
      env: { NODE_ENV: "production", PATH: executablePath(), HOME: os.homedir(), USERPROFILE: os.homedir(), TMPDIR: os.tmpdir(), TEMP: os.tmpdir(), SYSTEMROOT: process.env.SYSTEMROOT, LANG: "en_US.UTF-8", NO_COLOR: "1", FORCE_COLOR: "0", ...(options.apiKey ? { OPENAI_API_KEY: options.apiKey } : {}) },
    });
    let stopped = false, finished = false, tail = "";
    let forceStop: ReturnType<typeof setTimeout> | undefined;
    const stop = () => {
      if (stopped || finished) return;
      stopped = true;
      if (!child.pid) return;
      try { process.platform === "win32" ? child.kill("SIGTERM") : process.kill(-child.pid, "SIGTERM"); } catch {}
      forceStop = setTimeout(() => { try { process.platform === "win32" ? child.kill("SIGKILL") : process.kill(-child.pid!, "SIGKILL"); } catch {} }, 3000);
    };
    const timer = setTimeout(stop, options.timeout || 900000);
    options.signal?.addEventListener("abort", stop, { once: true });
    if (options.signal?.aborted) stop();
    const output = (chunk: Buffer) => {
      tail += chunk.toString();
      const lines = tail.split(/\r?\n|\r/); tail = lines.pop() || "";
      for (const line of lines) options.log?.(redact(line, options.apiKey).slice(0, 1500));
      if (tail.length > 4000) { options.log?.(redact(tail, options.apiKey).slice(0, 1500)); tail = ""; }
    };
    child.stdout.on("data", output); child.stderr.on("data", output);
    const finish = (error?: Error) => {
      if (finished) return; finished = true;
      clearTimeout(timer); clearTimeout(forceStop); options.signal?.removeEventListener("abort", stop);
      if (tail) options.log?.(redact(tail, options.apiKey).slice(0, 1500));
      error ? reject(error) : resolve();
    };
    child.on("error", () => finish(new InputError("Could not start the local process. Check installation and permissions.")));
    child.on("close", code => finish(stopped ? new InputError(options.signal?.aborted ? "Cancelled." : "Local process timed out.") : code === 0 ? undefined : new InputError(`Local process exited with code ${code}. See the run log for details.`)));
  });
}
