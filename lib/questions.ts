import { readFile, writeFile, rename, lstat, open, rm } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { loadTasks } from "./tasks";
import { flatten } from "./views";
export type OwnerQuestion = { id: string; question: string; context: string; taskIds: string[]; blocking: boolean; status: "pending" | "answered" | "resolved"; createdAt: string; answer: string | null; answeredAt: string | null; resolvedAt: string | null; pickedUpAt?: string | null; options?: string[]; originThreadId?: string };
export type QuestionInbox = { version: 1; questions: OwnerQuestion[] };
async function location(root: string) {
  const directory = path.join(root, ".taskmaster");
  const info = await lstat(directory);
  if (!info.isDirectory() || info.isSymbolicLink()) throw Error("Invalid questions directory.");
  return path.join(directory, "questions.json");
}
export async function readQuestions(root: string): Promise<QuestionInbox> {
  try {
    const file = await location(root), info = await lstat(file);
    if (!info.isFile() || info.isSymbolicLink() || info.size > 1_000_000) throw Error("Invalid questions file.");
    const value = JSON.parse(await readFile(file, "utf8"));
    if (value.version !== 1 || !Array.isArray(value.questions) || value.questions.length > 1000) throw Error("Unsupported questions file.");
    const ids = new Set();
    for (const q of value.questions) {
      if (!q || typeof q.id !== "string" || ids.has(q.id) || typeof q.question !== "string" || typeof q.context !== "string" || !["pending", "answered", "resolved"].includes(q.status) || !(q.answer === null || typeof q.answer === "string")) throw Error("Invalid question.");
      ids.add(q.id);
    }
    return value;
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return { version: 1, questions: [] };
    throw error;
  }
}
let queue: Promise<unknown> = Promise.resolve();
function changeQuestions(root: string, change: (inbox: QuestionInbox) => void | Promise<void>) {
  const work = queue.catch(() => {}).then(async () => {
    const file = await location(root), lock = `${file}.lock`, temporary = `${file}.${randomUUID()}.tmp`;
    let handle;
    try { handle = await open(lock, "wx", 0o600); } catch { throw Error("Questions are being updated. Retry shortly."); }
    try {
      const before = await readFile(file, "utf8").catch(error => { if (error.code === "ENOENT") return null; throw error; });
      const inbox = await readQuestions(root); await change(inbox);
      const text = JSON.stringify(inbox, null, 2) + "\n";
      if (inbox.questions.length > 1000 || Buffer.byteLength(text) > 1_000_000) throw Error("Question inbox is full. Archive resolved questions first.");
      await writeFile(temporary, text, { mode: 0o600 });
      const current = await readFile(file, "utf8").catch(error => { if (error.code === "ENOENT") return null; throw error; });
      if (current !== before) throw Error("Questions changed during this update. Refresh and retry.");
      await rename(temporary, file); return inbox;
    } finally { await rm(temporary, { force: true }); await handle.close(); await rm(lock, { force: true }); }
  });
  queue = work; return work;
}
export function answerQuestion(root: string, id: string, answer: string) {
  return changeQuestions(root, inbox => {
    const question = inbox.questions.find(q => q.id === id);
    if (!question || question.status !== "pending") throw Error("Question is no longer pending. Refresh the panel.");
    if (!answer.trim() || answer.length > 20000) throw Error("Enter an answer under 20,000 characters.");
    question.answer = answer; question.status = "answered"; question.answeredAt = new Date().toISOString();
  });
}
export function createQuestion(root: string, input: { id?: string; question: string; context: string; taskIds: string[]; options?: string[]; blocking: boolean; originThreadId?: string }) {
  return changeQuestions(root, async inbox => {
    if (!input.question.trim() || input.question.length > 2000 || input.context.length > 10000 || input.taskIds.length > 30 || input.taskIds.some(id => typeof id !== "string") || (input.options && (input.options.length > 10 || input.options.some(option => typeof option !== "string" || option.length > 1000)))) throw Error("Invalid question fields.");
    const tasks = flatten((await loadTasks(root)).tasks);
    if (input.taskIds.some(id => !tasks.some(row => row.id === id))) throw Error("A linked Task Master task does not exist in this project.");
    const id = input.id || randomUUID();
    if (inbox.questions.some(q => q.id === id || (q.status !== "resolved" && q.question === input.question))) return;
    inbox.questions.push({ ...input, id, status: "pending", createdAt: new Date().toISOString(), answer: null, answeredAt: null, resolvedAt: null });
  });
}
export function consumeAnswer(root: string, id: string, expectedAnswer: string) {
  return changeQuestions(root, inbox => {
    const question = inbox.questions.find(q => q.id === id);
    if (!question || question.status === "pending" || question.answer !== expectedAnswer) throw Error("Answer changed or is not ready. Read the current answers before acknowledging.");
    if (question.status === "resolved") return;
    question.status = "resolved"; question.resolvedAt = new Date().toISOString();
  });
}

// Reading the owner UI never records agent pickup. Only the explicit bridge batch does.
export function pickUpAnswers(root: string) {
  return changeQuestions(root, inbox => {
    const at = new Date().toISOString();
    for (const question of inbox.questions)
      if (question.status === "answered" && !question.pickedUpAt) question.pickedUpAt = at;
  });
}
