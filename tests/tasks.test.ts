import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { parseTasks, loadTasks } from "../lib/tasks";
import { progress } from "../lib/task-model";
test("tagged tasks preserve custom fields and recursive progress", () => {
  const [task] = parseTasks(
    {
      feature: {
        tasks: [
          {
            id: 1,
            title: "Ship",
            custom: { owner: "Sam" },
            subtasks: [
              { id: 1, title: "Build", status: "done" },
              {
                id: 2,
                title: "Verify",
                subtasks: [
                  { id: 1, title: "Unit", status: "done" },
                  { id: 2, title: "Browser", status: "pending" },
                ],
              },
            ],
          },
        ],
      },
    },
    "tasks.json",
  );
  assert.equal(task.tag, "feature");
  assert.deepEqual(task.raw.custom, { owner: "Sam" });
  assert.equal(progress(task), 75);
  assert.equal(task.subtasks[1].subtasks[0].key, "tasks.json:feature:1.2.1");
});
test("legacy files and malformed records are handled", () => {
  assert.equal(
    parseTasks(
      {
        tasks: [
          null,
          { title: "No ID" },
          { id: 2, title: "Valid", dependencies: [1, null, "3"] },
        ],
      },
      "legacy.json",
    ).length,
    1,
  );
  assert.deepEqual(
    parseTasks([{ id: 1, title: "A" }], "a.json")[0].dependencies,
    [],
  );
});
test("reader aggregates sources, attaches complexity, skips symlinks, warns on malformed JSON", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "task-ui-test-"));
  try {
    await mkdir(path.join(root, ".taskmaster/tasks"), { recursive: true });
    await mkdir(path.join(root, ".taskmaster/reports"), { recursive: true });
    await writeFile(
      path.join(root, ".taskmaster/tasks/tasks.json"),
      JSON.stringify({ master: { tasks: [{ id: 1, title: "A" }] } }),
    );
    await writeFile(path.join(root, ".taskmaster/tasks/broken.json"), "{");
    await writeFile(
      path.join(root, ".taskmaster/reports/task-complexity-report.json"),
      JSON.stringify({
        complexityAnalysis: [
          { taskId: 1, complexityScore: 8, reasoning: "Needs care" },
        ],
      }),
    );
    await symlink(
      path.join(root, ".taskmaster/tasks/tasks.json"),
      path.join(root, ".taskmaster/tasks/copy.json"),
    );
    const result = await loadTasks(root);
    assert.equal(result.tasks.length, 1);
    assert.equal(result.tasks[0].complexity, 8);
    assert.equal(result.warnings.length, 1);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
