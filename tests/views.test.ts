import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTasks } from "../lib/tasks";
import { dashboard } from "../lib/dashboard";
import {
  flatten,
  milestone,
  filterTasks,
  nextTask,
  dependencyIssues,
  dependencies,
} from "../lib/views";
const tasks = parseTasks(
  {
    master: {
      tasks: [
        {
          id: 1,
          title: "Foundation",
          status: "done",
          details: "Milestone: M0 — Planning",
        },
        {
          id: 2,
          title: "Owner approval",
          status: "pending",
          priority: "high",
          dependencies: [1],
          metadata: { milestone: "M0 — Planning" },
        },
        {
          id: 3,
          title: "Build",
          status: "pending",
          dependencies: [2],
          milestone: { name: "M1" },
          subtasks: [
            { id: 1, title: "Design", status: "done" },
            { id: 2, title: "Code", status: "pending", dependencies: [1] },
          ],
        },
        {
          id: 4,
          title: "Missing input",
          status: "blocked",
          dependencies: [99],
        },
        { id: 5, title: "Later", status: "deferred" },
        { id: 6, title: "Cancelled", status: "cancelled" },
      ],
    },
    other: {
      tasks: [
        { id: 2, title: "Other approval", status: "done" },
        { id: 3, title: "Other task", status: "pending", dependencies: [2] },
      ],
    },
  },
  "tasks.json",
);
test("dashboard separates task/subtask totals, explicit status and dependency blockers", () => {
  const master = tasks.filter((t) => t.tag === "master"),
    info = dashboard(master, tasks);
  assert.equal(info.tasks.total, 6);
  assert.equal(info.tasks.completed, 2);
  assert.equal(info.subtasks.total, 2);
  assert.equal(info.subtasks.percent, 50);
  assert.equal(info.tasks.counts.blocked, 1);
  assert.equal(info.blocked.length, 2);
  assert.equal(info.ready.length, 1);
  assert.equal(info.next?.id, "2");
  assert.equal(info.analyzed, 0);
});
test("milestones support structured metadata and actual migrated detail lines", () => {
  assert.equal(milestone(tasks[0]), "M0 — Planning");
  assert.equal(milestone(tasks[1]), "M0 — Planning");
  assert.equal(milestone(tasks[2]), "M1");
  assert.equal(milestone(tasks[3]), "No milestone");
});
test("composed filters retain complete dependency context", () => {
  const rows = flatten(tasks),
    filtered = filterTasks(
      tasks,
      {
        tag: "master",
        priority: "high",
        status: "pending",
        readiness: "ready",
        query: "approval",
      },
      rows,
    );
  assert.equal(filtered.length, 1);
  assert.equal(nextTask(flatten(filtered), rows)?.id, "2");
  assert.equal(
    filterTasks(
      tasks,
      {
        tag: "master",
        priority: "all",
        status: "all",
        readiness: "blocking",
        query: "",
      },
      rows,
    ).length,
    2,
  );
});
test("nested dependencies stay scoped and missing references are diagnosed", () => {
  const rows = flatten(tasks),
    code = rows.find((r) => r.id === "3.2")!;
  assert.equal(dependencies(code, rows)[0].target?.id, "3.1");
  assert.equal(dependencies(code, rows)[0].satisfied, true);
  assert.equal(dependencyIssues(rows).length, 1);
  assert.match(dependencyIssues(rows)[0], /missing dependency #99/);
});
test("cycles are reported and cannot become a ready next task", () => {
  const cyc = flatten(
    parseTasks(
      [
        { id: 1, title: "A", dependencies: [2] },
        { id: 2, title: "B", dependencies: [1] },
      ],
      "cycle.json",
    ),
  );
  assert.equal(nextTask(cyc), undefined);
  assert.ok(dependencyIssues(cyc).some((i) => i.includes("cycle")));
});
test("next prioritizes ready subtasks of in-progress parents", () => {
  const rows = flatten(
    parseTasks(
      [
        {
          id: 1,
          title: "Parent",
          status: "in-progress",
          subtasks: [
            { id: 1, title: "A", status: "done" },
            { id: 2, title: "B", status: "pending", dependencies: [1] },
          ],
        },
        { id: 2, title: "Unstarted critical", priority: "critical" },
      ],
      "tasks.json",
    ),
  );
  assert.equal(nextTask(rows)?.id, "1.2");
});
test("cancelled prerequisites satisfy dependencies and cancelled items count as complete", () => {
  const data = parseTasks(
      [
        { id: 1, title: "Cancelled", status: "cancelled" },
        { id: 2, title: "Available", dependencies: [1] },
      ],
      "tasks.json",
    ),
    info = dashboard(data);
  assert.equal(info.tasks.percent, 50);
  assert.equal(info.ready[0].id, "2");
  assert.equal(info.next?.id, "2");
});
test("source and milestone filters compose without mixing same IDs across tags or files", () => {
  const filtered = filterTasks(tasks, {
    tag: "master",
    priority: "all",
    status: "all",
    readiness: "all",
    query: "",
    milestone: "M1",
    source: "tasks.json",
  });
  assert.deepEqual(
    filtered.map((t) => t.id),
    ["3"],
  );
  const other = parseTasks(
    [
      { id: 1, title: "Other root", status: "pending" },
      { id: 2, title: "Waits", dependencies: [1] },
    ],
    "other.json",
  );
  assert.equal(
    dependencies(flatten(other)[1], flatten([...tasks, ...other]))[0].satisfied,
    false,
  );
});
