import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, readdir, rm, mkdir } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { generatePrd, revisionPrompt } from "../lib/prd/openai";
import { sameOrigin, credentials, redact, jsonBody } from "../lib/prd/security";
import { reserveFolder, startGeneration, getJob, cancelJob } from "../lib/prd/generation";
import { runProcess } from "../lib/prd/process";

test("PRD requests use OpenAI without saving responses; API failures do not become drafts", async () => {
  let sent: Record<string, unknown> = {};
  const mock: typeof fetch = async (url, options) => {
    assert.equal(url, "https://api.openai.com/v1/responses");
    assert.equal((options?.headers as Record<string, string>).Authorization, "Bearer test-key");
    sent = JSON.parse(String(options?.body));
    return Response.json({ status: "completed", output: [{ content: [{ type: "output_text", text: "# Approved PRD" }] }] });
  };
  assert.equal(await generatePrd("test-key", "gpt-4o", "brief", mock), "# Approved PRD");
  assert.equal(sent.store, false);
  assert.equal(sent.input, "brief");
  const failure: typeof fetch = async () => Response.json({}, { status: 401 });
  await assert.rejects(generatePrd("test-key", "gpt-4o", "brief", failure), /rejected/);
  const incomplete: typeof fetch = async () => Response.json({ status: "incomplete", output: [{ content: [{ type: "output_text", text: "cut off" }] }] });
  await assert.rejects(generatePrd("test-key", "gpt-4o", "brief", incomplete), /limit/);
  assert.match(revisionPrompt("complete document", "make specific", "selected text"), /only the selected passage/);
  assert.match(revisionPrompt("", "my idea"), /acceptance criteria/);
});
test("write APIs reject other origins and malformed credentials, and redact keys", async () => {
  assert.throws(() => sameOrigin(new Request("http://localhost/api/prd", { headers: { origin: "https://evil.example" } })), /origin/);
  assert.doesNotThrow(() => sameOrigin(new Request("http://localhost/api/prd", { headers: { origin: "http://localhost" } })));
  assert.throws(() => credentials({ apiKey: "key with spaces", model: "gpt-4o" }), /whitespace/);
  assert.throws(() => credentials({ apiKey: "secret", model: "gpt; bad" }), /model/);
  assert.equal(redact("key secret123 and sk-abc123", "secret123"), "key [redacted] and [redacted]");
  await assert.rejects(jsonBody(new Request("http://localhost", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{" })), /JSON/);
});
test("folder reservations refuse existing files and concurrent use", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vibeboard-reserve-"));
  try {
    await writeFile(path.join(root, "keep.md"), "keep");
    await assert.rejects(reserveFolder(root), /empty/);
    assert.equal(await readFile(path.join(root, "keep.md"), "utf8"), "keep");
    const destination = path.join(root, "new");
    const reservation = await reserveFolder(destination);
    await assert.rejects(reserveFolder(destination), /empty|generation/);
    await reservation.release();
    assert.deepEqual(await readdir(destination), []);
  } finally { await rm(root, { recursive: true, force: true }); }
});
test("local process timeout terminates the child", async () => {
  await assert.rejects(runProcess(process.execPath, ["-e", "setInterval(() => {}, 1000)"], { cwd: os.tmpdir(), timeout: 50 }), /timed out/);
});
test("generation stages task files, keeps keys out of disk/logs, registers successes and supports cancellation", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vibeboard-generation-test-"));
  const prior = { project: process.env.TASK_MASTER_PROJECT, state: process.env.TASK_MASTER_UI_STATE_DIR, binary: process.env.VIBEBOARD_TASK_MASTER_BIN };
  const wait = async (id: string) => {
    for (let i = 0; i < 160; i++) { const job = getJob(id)!; if (job.status !== "running") { await new Promise(resolve => setTimeout(resolve, 30)); return job; } await new Promise(resolve => setTimeout(resolve, 25)); }
    throw Error("Job did not finish");
  };
  try {
    const host = path.join(root, "host"); await mkdir(host);
    process.env.TASK_MASTER_PROJECT = host; process.env.TASK_MASTER_UI_STATE_DIR = path.join(root, "state");
    const script = path.join(root, "task-master");
    await writeFile(script, `#!/usr/bin/env node\nimport {writeFile} from 'node:fs/promises';\nconst args=process.argv.slice(2);\nconsole.log(process.env.OPENAI_API_KEY);\nif(args[args.indexOf('--num-tasks')+1]==='2') { setInterval(()=>{},1000); } else { await writeFile(args[args.indexOf('--output')+1],JSON.stringify({master:{tasks:[{id:1,title:'Generated task',status:'pending',subtasks:[]}]}})); }\n`, { mode: 0o755 });
    process.env.VIBEBOARD_TASK_MASTER_BIN = script;
    const job = await startGeneration({ root: path.join(root, "new-app"), prd: "# PRD\nBuild a tracker", apiKey: "sk-test-secret123", model: "gpt-4o", count: 1, agents: "# Custom agent instructions\nKeep working and check owner questions." });
    const result = await wait(job.id);
    assert.equal(result.status, "complete", result.error);
    assert.ok(result.projectId); assert.equal(result.taskCount, 1);
    assert.ok(!result.logs.join("\n").includes("sk-test-secret123"));
    const configuration = await readFile(path.join(result.root, ".taskmaster/config.json"), "utf8");
    assert.ok(!configuration.includes("sk-test-secret123"));
    assert.equal(JSON.parse(configuration).models.main.provider, "openai");
    assert.equal(await readFile(path.join(result.root, ".taskmaster/docs/prd.md"), "utf8"), "# PRD\nBuild a tracker");
    assert.equal(await readFile(path.join(result.root, "AGENTS.md"), "utf8"), "# Custom agent instructions\nKeep working and check owner questions.");
    assert.equal(JSON.parse(await readFile(path.join(result.root, ".vibeboard/continuation.json"), "utf8")).enabled, true);
    assert.ok(JSON.parse(await readFile(path.join(result.root, ".vibeboard/hooks.json"), "utf8")).hooks.Stop);
    assert.deepEqual(await readdir(result.root), [".taskmaster", ".vibeboard", "AGENTS.md"]);
    await assert.rejects(startGeneration({ root: result.root, prd: "overwrite", apiKey: "secret", model: "gpt-4o", count: 1 }), /empty/);
    const existingRoot = path.join(root, "existing-project"); await mkdir(existingRoot);
    await writeFile(path.join(existingRoot, "README.md"), "Existing project documentation");
    await writeFile(path.join(existingRoot, "app.ts"), "export const existing = true;");
    await writeFile(path.join(existingRoot, "AGENTS.md"), "Owner's existing rules");
    const adopted = await startGeneration({ root: existingRoot, existing: true, prd: "# Existing project PRD", agents: "Do not overwrite", apiKey: "secret", model: "gpt-4o", count: 1 });
    assert.equal((await wait(adopted.id)).status, "complete");
    assert.equal(await readFile(path.join(existingRoot, "AGENTS.md"), "utf8"), "Owner's existing rules");
    assert.equal(await readFile(path.join(existingRoot, "app.ts"), "utf8"), "export const existing = true;");
    assert.equal(await readFile(path.join(existingRoot, "README.md"), "utf8"), "Existing project documentation");
    assert.equal(await readFile(path.join(existingRoot, ".taskmaster/docs/prd.md"), "utf8"), "# Existing project PRD");
    await assert.rejects(startGeneration({ root: existingRoot, existing: true, prd: "replace", apiKey: "secret", model: "gpt-4o", count: 1 }), /already has task/);
    const cancelled = await startGeneration({ root: path.join(root, "cancelled"), prd: "cancel", apiKey: "secret", model: "gpt-4o", count: 2 });
    cancelJob(cancelled.id); assert.equal((await wait(cancelled.id)).status, "cancelled");
    assert.deepEqual(await readdir(cancelled.root), []);
    await writeFile(script, "#!/usr/bin/env node\nprocess.exit(1);\n", { mode: 0o755 });
    const failed = await startGeneration({ root: path.join(root, "failed"), prd: "fail", apiKey: "secret", model: "gpt-4o", count: 1 });
    assert.equal((await wait(failed.id)).status, "failed");
    assert.deepEqual(await readdir(failed.root), []);
  } finally {
    for (const [key, value] of [["TASK_MASTER_PROJECT", prior.project], ["TASK_MASTER_UI_STATE_DIR", prior.state], ["VIBEBOARD_TASK_MASTER_BIN", prior.binary]]) { if (value === undefined) delete process.env[key!]; else process.env[key!] = value; }
    await rm(root, { recursive: true, force: true });
  }
});

test("local transcription endpoint uses Whisper and removes temporary audio", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vibeboard-voice-test-"));
  const previous = process.env.VIBEBOARD_WHISPER_BIN, previousFfmpeg = process.env.VIBEBOARD_FFMPEG_BIN;
  try {
    const script = path.join(root, "whisper");
    await writeFile(script, `#!/usr/bin/env node\nimport {writeFile} from 'node:fs/promises';\nimport path from 'node:path';\nconst args=process.argv.slice(2);\nawait writeFile(path.join(args[args.indexOf('--output_dir')+1],'recording.txt'),args[0]);\n`, { mode: 0o755 });
    process.env.VIBEBOARD_WHISPER_BIN = script; process.env.VIBEBOARD_FFMPEG_BIN = process.execPath;
    const { POST } = await import("../app/api/transcribe/route");
    const form = new FormData(); form.append("audio", new Blob(["test audio"], { type: "audio/webm" }), "sample.webm");
    const response = await POST(new Request("http://localhost/api/transcribe", { method: "POST", headers: { origin: "http://localhost" }, body: form }));
    assert.equal(response.status, 200);
    const { text } = await response.json();
    assert.match(text, /recording.webm$/);
    await assert.rejects(readFile(text), /ENOENT/);
    const bad = new FormData(); bad.append("audio", new Blob(["not audio"], { type: "text/plain" }), "bad.txt");
    assert.equal((await POST(new Request("http://localhost/api/transcribe", { method: "POST", headers: { origin: "http://localhost" }, body: bad }))).status, 400);
  } finally {
    if (previous === undefined) delete process.env.VIBEBOARD_WHISPER_BIN; else process.env.VIBEBOARD_WHISPER_BIN = previous;
    if (previousFfmpeg === undefined) delete process.env.VIBEBOARD_FFMPEG_BIN; else process.env.VIBEBOARD_FFMPEG_BIN = previousFfmpeg;
    await rm(root, { recursive: true, force: true });
  }
});

test("explicit tunnel origin works behind a proxy without trusting forwarded headers", () => {
  const previous = process.env.VIBEBOARD_PUBLIC_ORIGIN;
  process.env.VIBEBOARD_PUBLIC_ORIGIN = "https://phone.example";
  try {
    const request = (origin: string) => new Request("http://localhost:4310/api/voice", { headers: { origin, "x-forwarded-host": "evil.example", "x-forwarded-proto": "https" } });
    assert.doesNotThrow(() => sameOrigin(request("https://phone.example")));
    for (const origin of ["https://evil.example", "http://phone.example", "https://phone.example.evil.example", "null", ""]) assert.throws(() => sameOrigin(request(origin)), /origin/);
    assert.throws(() => sameOrigin(new Request("http://localhost:4310/api/voice")), /origin/);
  } finally {
    if (previous === undefined) delete process.env.VIBEBOARD_PUBLIC_ORIGIN;
    else process.env.VIBEBOARD_PUBLIC_ORIGIN = previous;
  }
});

test("loopback origin aliases support the local bridge without trusting other hosts or ports", () => {
  assert.doesNotThrow(() => sameOrigin(new Request("http://localhost:4310/api/questions", { headers: { origin: "http://127.0.0.1:4310" } })));
  assert.throws(() => sameOrigin(new Request("http://localhost:4310/api/questions", { headers: { origin: "http://127.0.0.1:4311" } })), /origin/);
  assert.throws(() => sameOrigin(new Request("https://outside.example/api/questions", { headers: { origin: "http://127.0.0.1" } })), /origin/);
});
