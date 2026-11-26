import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, rm, readdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseTasks } from "../lib/tasks";
import { diffActivity, snapshot, recordActivity } from "../lib/activity";
const at = "2026-10-20T00:00:00Z";
const parse = (tasks: unknown[]) =>
  parseTasks({ master: { tasks } }, "tasks.json");
test("records separate added subtasks, changed statuses, edits and removals without attributing an agent", () => {
  const before = parse([
    { id: 1, title: "Original", status: "pending" },
    { id: 2, title: "Remove" },
  ]);
  const after = parse([
    {
      id: 1,
      title: "Original",
      status: "done",
      subtasks: [{ id: 1, title: "Child" }],
    },
    { id: 3, title: "New", createdBy: "Harness", metadata: { agent: "Other" } },
  ]);
  const events = diffActivity(snapshot(before), snapshot(after), at);
  assert.equal(events.length, 4);
  assert.equal(events.find((e) => e.type === "status")?.before, "pending");
  assert.equal(events.find((e) => e.taskId === "1.1")?.depth, 1);
  assert.equal(events.find((e) => e.taskId === "1.1")?.actor, null);
  assert.equal(events.find((e) => e.taskId === "3")?.actor, "Harness");
  assert.equal(events.find((e) => e.type === "removed")?.taskId, "2");
});
test("does not emit changes for JSON object order or duplicate parent subtask content", () => {
  const first = parse([
    {
      id: 1,
      title: "A",
      metadata: { x: 1, y: 2 },
      subtasks: [{ id: 1, title: "Child" }],
    },
  ]);
  const reordered = parse([
    {
      title: "A",
      id: 1,
      subtasks: [{ title: "Child", id: 1 }],
      metadata: { y: 2, x: 1 },
    },
  ]);
  assert.equal(
    diffActivity(snapshot(first), snapshot(reordered), at).length,
    0,
  );
  const edited = parse([
    {
      id: 1,
      title: "A",
      metadata: { x: 1, y: 2 },
      subtasks: [{ id: 1, title: "Edited" }],
    },
  ]);
  const events = diffActivity(snapshot(first), snapshot(edited), at);
  assert.equal(events.length, 1);
  assert.equal(events[0].type, "updated");
  assert.deepEqual(events[0].fields, ["title"]);
});
test("first scan is baseline, projects are isolated, and parse errors preserve history", async () => {
  const directory = await mkdtemp(path.join(tmpdir(), "task-activity-")),
    old = process.env.TASK_MASTER_UI_STATE_DIR;
  process.env.TASK_MASTER_UI_STATE_DIR = directory;
  try {
    const baseline = await recordActivity(
      "/example/project-a",
      parse([{ id: 1, title: "A" }]),
    );
    assert.equal(baseline.events.length, 0);
    assert.equal(Object.values(baseline.timing || {})[0]?.status, "pending");
    const change = await recordActivity(
      "/example/project-a",
      parse([
        { id: 1, title: "A" },
        { id: 2, title: "B" },
      ]),
    );
    assert.equal(change.events.length, 1);
    assert.equal(change.events[0].type, "added");
    const invalid = await recordActivity("/example/project-a", [], false);
    assert.equal(invalid.events.length, 1);
    assert.deepEqual(invalid.timing, JSON.parse(JSON.stringify(change.timing)));
    assert.ok(invalid.warning);
    const recovered = await recordActivity(
      "/example/project-a",
      parse([
        { id: 1, title: "A" },
        { id: 2, title: "B" },
      ]),
    );
    assert.equal(recovered.events.length, 1);
    const other = await recordActivity(
      "/example/project-b",
      parse([{ id: 1, title: "Other" }]),
    );
    assert.equal(other.events.length, 0);
    assert.equal((await readdir(directory)).length, 2);
    const removed = await recordActivity("/example/project-a", []);
    assert.equal(removed.events.filter((e) => e.type === "removed").length, 2);
  } finally {
    if (old === undefined) delete process.env.TASK_MASTER_UI_STATE_DIR;
    else process.env.TASK_MASTER_UI_STATE_DIR = old;
    await rm(directory, { recursive: true, force: true });
  }
});
test("timestamp-only file rewrites are ignored, including nested metadata", () => {
  const first = parse([
    {
      id: 1,
      title: "A",
      updatedAt: "2026-10-19T00:00:00Z",
      metadata: { owner: "Team", updatedAt: "2026-10-19T00:00:00Z" },
    },
  ]);
  const later = parse([
    {
      id: 1,
      title: "A",
      updatedAt: "2026-10-20T00:00:00Z",
      metadata: { owner: "Team", updatedAt: "2026-10-20T00:00:00Z" },
    },
  ]);
  assert.equal(diffActivity(snapshot(first), snapshot(later), at).length, 0);
  const edited = parse([
    {
      id: 1,
      title: "B",
      updatedAt: "2026-10-19T23:59:00Z",
      metadata: { owner: "Team", updatedAt: "2026-10-20T00:00:00Z" },
    },
  ]);
  const [event] = diffActivity(snapshot(first), snapshot(edited), at);
  assert.deepEqual(event.fields, ["title"]);
  assert.equal(event.reportedAt, "2026-10-19T23:59:00.000Z");
  assert.equal(event.at, at);
});
test("stale and future source timestamps do not replace detection time", () => {
  const first = parse([{ id: 1, title: "A", updatedAt: at }]);
  for (const updatedAt of [at, "2099-01-01T00:00:00Z", "invalid"]) {
    const later = parse([{ id: 1, title: "B", updatedAt }]);
    assert.equal(
      diffActivity(snapshot(first), snapshot(later), at)[0].reportedAt,
      undefined,
    );
  }
});
test("activity sorts newest first using source times, preserving detection-time fallbacks", async () => {
  const { newestActivity } = await import("../lib/activity-model");
  const changes = diffActivity(
    [],
    snapshot(
      parse([
        { id: 1, title: "Older", createdAt: "2026-10-19T12:00:00Z" },
        { id: 2, title: "Newer", createdAt: "2026-10-19T23:00:00Z" },
        { id: 3, title: "Observed only" },
      ]),
    ),
    at,
  );
  assert.deepEqual(
    newestActivity(changes).map((e) => e.taskId),
    ["3", "2", "1"],
  );
  assert.equal(changes[0].taskId, "1");
});
