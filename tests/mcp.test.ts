import { test } from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
test("stdio bridge lists tools and returns every unconsumed answer only for its configured project", () => {
  const fixture = { questions: [{ id: "a", status: "answered", answer: "A" }, { id: "b", status: "answered", answer: "B" }, { id: "c", status: "resolved", answer: "C" }] };
  const code = `globalThis.fetch=async url=>{if(!String(url).includes('project=fixture-project'))throw Error('Wrong project');return Response.json(${JSON.stringify(fixture)});};await import('./bin/vibeboard-mcp.mjs');`;
  const messages = [{ jsonrpc: "2.0", id: 1, method: "initialize" }, { jsonrpc: "2.0", id: 2, method: "tools/list" }, { jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "read_owner_answers", arguments: {} } }];
  const child = spawnSync(process.execPath, ["--input-type=module", "-e", code], { cwd: process.cwd(), env: { ...process.env, VIBEBOARD_PROJECT_ID: "fixture-project", VIBEBOARD_SERVER_URL: "http://localhost:4310" }, input: messages.map(m => JSON.stringify(m)).join("\n") + "\n", encoding: "utf8", timeout: 10000 });
  assert.equal(child.status, 0, child.stderr);
  const lines = child.stdout.trim().split("\n").map(line => JSON.parse(line));
  assert.equal(lines[0].result.serverInfo.name, "vibeboard-owner-questions");
  assert.ok(lines[1].result.tools.some((tool: { name: string }) => tool.name === "report_agent_activity"));
  assert.deepEqual(JSON.parse(lines[2].result.content[0].text).answers.map((q: { id: string }) => q.id), ["a", "b"]);
});
