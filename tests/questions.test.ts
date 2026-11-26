import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, writeFile, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { readQuestions, answerQuestion } from "../lib/questions";
test("answers persist independently without replacing task files or accepting repeat submissions", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "vibeboard-questions-"));
  try {
    assert.deepEqual(await readQuestions(root), { version: 1, questions: [] });
    const dir = path.join(root, ".taskmaster"); await mkdir(dir);
    await writeFile(path.join(dir, "tasks.json"), "preserved");
    const question = (id: string) => ({ id, question: "Which option?", context: "Build can continue", taskIds: ["75"], blocking: false, status: "pending", createdAt: "2026-10-20", answer: null, answeredAt: null, resolvedAt: null });
    await writeFile(path.join(dir, "questions.json"), JSON.stringify({ version: 1, questions: [question("one"), question("two")] }));
    await Promise.all([answerQuestion(root, "one", "First answer"), answerQuestion(root, "two", "Second answer")]);
    const saved = await readQuestions(root);
    assert.deepEqual(saved.questions.map(q => q.answer), ["First answer", "Second answer"]);
    assert.ok(saved.questions.every(q => q.status === "answered" && q.answeredAt && q.resolvedAt === null));
    await assert.rejects(answerQuestion(root, "one", "Overwrite"));
    await assert.rejects(answerQuestion(root, "missing", "Invent"));
    assert.equal(await readFile(path.join(dir, "tasks.json"), "utf8"), "preserved");
  } finally { await rm(root, { recursive: true, force: true }); }
});

test("agents create task-linked questions and acknowledge exact answers without losing concurrent replies", async () => {
  const { createQuestion, consumeAnswer, pickUpAnswers } = await import("../lib/questions");
  const root = await mkdtemp(path.join(tmpdir(), "vibeboard-question-bridge-"));
  try {
    await mkdir(path.join(root, ".taskmaster/tasks"), { recursive: true });
    await writeFile(path.join(root, ".taskmaster/tasks/tasks.json"), JSON.stringify({ master: { tasks: [{ id: 1, title: "Real task", status: "pending" }] } }));
    const input = { id: "decision", question: "Choose a policy?", context: "Task 1 needs a preference", taskIds: ["1"], blocking: false };
    await createQuestion(root, input); await createQuestion(root, input);
    assert.equal((await readQuestions(root)).questions.length, 1);
    await assert.rejects(createQuestion(root, { ...input, id: "invalid", taskIds: ["404"] }), /does not exist/);
    await assert.rejects(consumeAnswer(root, "decision", "yes"), /not ready/);
    await Promise.all([answerQuestion(root, "decision", "Use the default"), createQuestion(root, { ...input, id: "second", question: "A second policy?" })]);
    await assert.rejects(consumeAnswer(root, "decision", "Stale answer"), /changed/);
    assert.equal((await readQuestions(root)).questions[0].pickedUpAt, undefined);
    const picked = await pickUpAnswers(root);
    const firstPickup = picked.questions[0].pickedUpAt;
    assert.ok(firstPickup);
    assert.equal(picked.questions[0].status, "answered");
    assert.equal(picked.questions[1].pickedUpAt, undefined);
    assert.equal((await pickUpAnswers(root)).questions[0].pickedUpAt, firstPickup);
    await consumeAnswer(root, "decision", "Use the default");
    await consumeAnswer(root, "decision", "Use the default");
    const saved = await readQuestions(root);
    assert.equal(saved.questions[0].status, "resolved");
    assert.equal(saved.questions[1].status, "pending");
  } finally { await rm(root, { recursive: true, force: true }); }
});
