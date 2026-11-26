import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import vm from "node:vm";
import { mergeTranscript } from "../lib/prd/transcript";
import { voiceWorker } from "../lib/prd/voice-worker";

test("overlapping windows deduplicate boundaries without removing intentional single-word repetitions", () => {
  assert.equal(mergeTranscript(["Build a task board", "task board with search."]), "Build a task board with search.");
  assert.equal(mergeTranscript(["Use React, and TypeScript.", "and typescript with tests"]), "Use React, and TypeScript. with tests");
  assert.equal(mergeTranscript(["very", "very good"]), "very very good");
  assert.equal(mergeTranscript(["", "hello"]), "hello");
});
test("audio worklet preserves resampling phase and flushes the final audio tail", async () => {
  const source = await readFile(path.join(process.cwd(), "public/audio-capture.js"), "utf8");
  for (const rate of [44100, 48000]) {
    const messages: unknown[] = [];
    let Processor: any;
    class Base { port = { onmessage: null as any, postMessage: (data: unknown) => messages.push(data) }; }
    vm.runInNewContext(source, { AudioWorkletProcessor: Base, sampleRate: rate, registerProcessor: (_: string, cls: any) => { Processor = cls; } });
    const processor = new Processor();
    let remaining = rate;
    while (remaining) { const length = Math.min(128, remaining); processor.process([[new Float32Array(length).fill(.25)]]); remaining -= length; }
    processor.port.onmessage({ data: "flush" });
    const frames = messages.filter(value => typeof value !== "string") as Int16Array[];
    assert.equal(frames.reduce((count, frame) => count + frame.length, 0), 16000);
    assert.ok(frames.every(frame => frame.every(sample => sample === 8192)));
    assert.equal(messages[messages.length - 1], "flushed");
  }
});
test("voice API reuses a warm worker, validates windows and does not inherit API keys", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vibeboard-live-voice-test-"));
  const previous = { python: process.env.VIBEBOARD_WHISPER_PYTHON, whisper: process.env.VIBEBOARD_WHISPER_BIN, key: process.env.OPENAI_API_KEY };
  try {
    const script = path.join(root, "fake-python");
    await writeFile(script, `#!/usr/bin/env node\nimport readline from 'node:readline';\nconsole.log(JSON.stringify({ready:true}));\nlet calls=0;\nfor await (const line of readline.createInterface({input:process.stdin})) { const request=JSON.parse(line); console.log(JSON.stringify({id:request.id,text:process.pid+':'+(++calls)+':'+Buffer.from(request.audio,'base64').length+':'+Boolean(process.env.OPENAI_API_KEY)})); }\n`, { mode: 0o755 });
    process.env.VIBEBOARD_WHISPER_BIN = script; process.env.VIBEBOARD_WHISPER_PYTHON = script; process.env.OPENAI_API_KEY = "test-should-not-leak";
    voiceWorker.stop("Reset test");
    const { POST } = await import("../app/api/voice/route");
    const request = (body: Uint8Array, origin = "http://localhost") => new Request("http://localhost/api/voice", { method: "POST", headers: { origin, "Content-Type": "application/octet-stream" }, body: new Uint8Array(body).buffer });
    const first = await POST(request(new Uint8Array(32000)));
    assert.equal(first.status, 200);
    const one = (await first.json()).text.split(":");
    const second = await POST(request(new Uint8Array(64000)));
    const two = (await second.json()).text.split(":");
    assert.equal(one[0], two[0], "worker process is reused");
    assert.equal(one[1], "1"); assert.equal(two[1], "2"); assert.equal(two[2], "64000"); assert.equal(two[3], "false");
    assert.equal((await POST(request(new Uint8Array(3)))).status, 400);
    assert.equal((await POST(request(new Uint8Array(640002)))).status, 400);
    assert.equal((await POST(request(new Uint8Array(32000), "https://other.example"))).status, 400);
  } finally {
    voiceWorker.stop("Test complete");
    for (const [name, value] of [["VIBEBOARD_WHISPER_PYTHON", previous.python], ["VIBEBOARD_WHISPER_BIN", previous.whisper], ["OPENAI_API_KEY", previous.key]]) { if (value === undefined) delete process.env[name!]; else process.env[name!] = value; }
    await rm(root, { recursive: true, force: true });
  }
});

test("older Whisper tokenizer compatibility avoids unrelated network initialization", async () => {
  const { execFileSync } = await import("node:child_process");
  const root = await mkdtemp(path.join(os.tmpdir(), "vibeboard-tokenizer-test-"));
  try {
    const fixture = path.join(root, "tokenizer_fixture.py");
    await writeFile(fixture, `def gpt2():\n    raise RuntimeError("Unexpected vocabulary download")\ndef get_encoding():\n    return gpt2()["pat_str"]\ndef modern_encoding():\n    return "bundled-local-pattern"\n`);
    const script = `import importlib.util,runpy,types\nspec=importlib.util.spec_from_file_location("fixture",${JSON.stringify(fixture)})\nm=importlib.util.module_from_spec(spec);spec.loader.exec_module(m)\ncompat=runpy.run_path("scripts/whisper-tokenizer-compat.py")\ntry:\n m.get_encoding()\n raise AssertionError("Fixture should request network")\nexcept RuntimeError: pass\nassert compat["configure"](m)\nassert m.get_encoding()==compat["GPT2_PATTERN"]\nmodern=types.SimpleNamespace(get_encoding=m.modern_encoding,gpt2=None)\nassert not compat["configure"](modern)\nassert modern.get_encoding()=="bundled-local-pattern"\nprint("ok")\n`;
    assert.equal(execFileSync("python3", ["-c", script], { cwd: process.cwd(), encoding: "utf8" }).trim(), "ok");
  } finally { await rm(root, { recursive: true, force: true }); }
});
