import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { currentAgents } from "../lib/agent-activity-model";
import { readAgentActivity, reportAgentActivity } from "../lib/agent-activity";
test("agent activity distinguishes missing, stale and concurrent sessions", () => {
  assert.deepEqual(currentAgents(undefined), []);
  const activity = { signals: [
    { sessionId: "one", status: "working" as const, detail: "Coding", at: new Date(1000).toISOString() },
    { sessionId: "two", status: "waiting" as const, detail: "Decision", at: new Date(150000).toISOString() },
    { sessionId: "two", status: "completed" as const, detail: "Done", at: new Date(160000).toISOString() },
  ] };
  const agents = currentAgents(activity, 170000);
  assert.equal(agents.length, 2);
  assert.equal(agents[0].stale, true);
  assert.equal(agents[1].status, "completed");
  assert.equal(agents[1].stale, false);
  assert.ok(currentAgents({ ...activity, warning: "Unavailable" }, 170000).every(s => s.stale));
});
test("reported activity persists project-scoped signals and rejects unknown states", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "vb-agents-"));
  const previous = process.env.TASK_MASTER_UI_STATE_DIR;
  process.env.TASK_MASTER_UI_STATE_DIR = directory;
  try {
    await Promise.all([reportAgentActivity("project-a", { sessionId: "one", status: "working", detail: "Testing" }), reportAgentActivity("project-a", { sessionId: "two", status: "idle", detail: "Paused" })]);
    assert.equal((await readAgentActivity("project-a")).signals.length, 2);
    assert.equal((await readAgentActivity("project-b")).signals.length, 0);
    await assert.rejects(reportAgentActivity("project-a", { sessionId: "", status: "working", detail: "" }));
  } finally { if (previous === undefined) delete process.env.TASK_MASTER_UI_STATE_DIR; else process.env.TASK_MASTER_UI_STATE_DIR = previous; await rm(directory, { recursive: true, force: true }); }
});
