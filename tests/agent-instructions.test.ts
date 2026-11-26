import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, writeFile, readFile, symlink, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { readInstructions, saveInstructions } from "../lib/agent-instructions";
import { DEFAULT_AGENTS } from "../lib/agents-template";
test("instructions create and edit with revision conflicts and symlink protection", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vibeboard-agents-"));
  try {
    assert.equal((await readInstructions(root)).exists, false);
    const saved = await saveInstructions(root, DEFAULT_AGENTS, null);
    assert.match(await readFile(path.join(root, "AGENTS.md"), "utf8"), /Twilio\/ElevenLabs/);
    await writeFile(path.join(root, "AGENTS.md"), "External agent edits");
    await assert.rejects(saveInstructions(root, "Stale browser edit", saved.revision), /changed on disk/);
    assert.equal((await readInstructions(root)).content, "External agent edits");
    const current = await readInstructions(root);
    await saveInstructions(root, "Updated instructions", current.revision);
    assert.equal((await readInstructions(root)).content, "Updated instructions");
    await assert.rejects(saveInstructions(root, "x".repeat(100001), current.revision), /100 KB/);
    await rm(path.join(root, "AGENTS.md"));
    await writeFile(path.join(root, "secret.txt"), "preserve");
    await symlink(path.join(root, "secret.txt"), path.join(root, "AGENTS.md"));
    await assert.rejects(readInstructions(root), /regular file/);
    await assert.rejects(saveInstructions(root, "overwrite", null), /regular file/);
    assert.equal(await readFile(path.join(root, "secret.txt"), "utf8"), "preserve");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("project Markdown editing stays inside approved document folders", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "vibeboard-documents-"));
  try {
    const { mkdir } = await import("node:fs/promises");
    await mkdir(path.join(root, ".taskmaster/docs"), { recursive: true });
    await writeFile(path.join(root, "README.md"), "# Readme");
    await writeFile(path.join(root, ".taskmaster/docs/prd.md"), "# PRD");
    const readme = await readInstructions(root, "README.md");
    await saveInstructions(root, "# Updated readme", readme.revision, "README.md");
    const prd = await readInstructions(root, ".taskmaster/docs/prd.md");
    await saveInstructions(root, "# Updated PRD", prd.revision, ".taskmaster/docs/prd.md");
    assert.equal(await readFile(path.join(root, ".taskmaster/docs/prd.md"), "utf8"), "# Updated PRD");
    for (const name of ["../escape.md", "/tmp/escape.md", ".env", ".taskmaster/tasks/tasks.json", ".taskmaster/docs/../escape.md"]) {
      await assert.rejects(readInstructions(root, name), /Choose a project Markdown/);
      await assert.rejects(saveInstructions(root, "escape", null, name), /Choose a project Markdown/);
    }
    await rm(path.join(root, ".taskmaster/docs"), { recursive: true });
    await symlink(root, path.join(root, ".taskmaster/docs"));
    await assert.rejects(readInstructions(root, ".taskmaster/docs/README.md"), /regular project directory/);
  } finally { await rm(root, { recursive: true, force: true }); }
});
