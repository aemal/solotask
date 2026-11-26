import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, rm, symlink } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { projects, addProject, changeProjects, projectData } from "../lib/projects";
test("registry persists, canonicalizes folders and isolates project task data", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "vibeboard-projects-"));
  const previousProject = process.env.TASK_MASTER_PROJECT, previousState = process.env.TASK_MASTER_UI_STATE_DIR;
  try {
    const first = path.join(root, "first"), second = path.join(root, "second");
    await mkdir(first); await mkdir(second);
    await writeFile(path.join(first, "tasks.json"), JSON.stringify([{ id: 1, title: "First project", status: "done" }]));
    await writeFile(path.join(second, "tasks.json"), JSON.stringify([{ id: 1, title: "Second project", status: "pending" }]));
    process.env.TASK_MASTER_PROJECT = first;
    process.env.TASK_MASTER_UI_STATE_DIR = path.join(root, "state");
    assert.equal((await projects()).length, 1);
    await assert.rejects(addProject("relative/path"), /absolute/);
    await assert.rejects(addProject(path.join(root, "missing")));
    await assert.rejects(addProject(path.join(first, "tasks.json")), /folder/);
    await Promise.all([addProject(second), addProject(second)]);
    const alias = path.join(root, "alias");
    await symlink(second, alias);
    await addProject(alias);
    const items = await projects();
    assert.equal(items.length, 2);
    assert.notEqual(items[0].id, items[1].id);
    await changeProjects(async list => list.map(p => ({ ...p, pinned: p.id === items[1].id })));
    assert.equal((await projects())[1].pinned, true);
    const one = await projectData(items[0]), two = await projectData(items[1]);
    assert.equal(one.tasks[0].title, "First project");
    assert.equal(two.tasks[0].title, "Second project");
    await writeFile(path.join(second, "tasks.json"), JSON.stringify([{ id: 1, title: "Second changed", status: "in-progress" }]));
    assert.equal((await projectData(items[0])).activity.events.length, 0);
    assert.ok((await projectData(items[1])).activity.events.length > 0);
  } finally {
    if (previousProject === undefined) delete process.env.TASK_MASTER_PROJECT; else process.env.TASK_MASTER_PROJECT = previousProject;
    if (previousState === undefined) delete process.env.TASK_MASTER_UI_STATE_DIR; else process.env.TASK_MASTER_UI_STATE_DIR = previousState;
    await rm(root, { recursive: true, force: true });
  }
});
