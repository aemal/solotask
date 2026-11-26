#!/usr/bin/env node
import { readFile, writeFile, lstat, open, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { randomUUID, createHash } from 'node:crypto';
async function json(file, max = 2000000) {
  const info = await lstat(file);
  if (!info.isFile() || info.isSymbolicLink() || info.size > max) throw Error('Invalid hook input file');
  return JSON.parse(await readFile(file, 'utf8'));
}
export async function stopDecision(input) {
  if (input.hook_event_name !== 'Stop' || typeof input.cwd !== 'string' || typeof input.session_id !== 'string' || !input.session_id || typeof input.turn_id !== 'string') return {};
  const dir = path.join(input.cwd, '.vibeboard');
  const info = await lstat(dir); if (!info.isDirectory() || info.isSymbolicLink()) return {};
  const settings = await json(path.join(dir, 'continuation.json'), 10000);
  if (!settings.enabled || typeof settings.reason !== 'string' || !settings.reason.trim() || settings.reason.length > 4000 || !Number.isInteger(settings.maxUnchangedStops) || settings.maxUnchangedStops < 1 || settings.maxUnchangedStops > 20) return {};
  for (const name of ['.taskmaster', '.taskmaster/tasks']) {
    const folder = await lstat(path.join(input.cwd, name)); if (!folder.isDirectory() || folder.isSymbolicLink()) return {};
  }
  const plan = await json(path.join(input.cwd, '.taskmaster/tasks/tasks.json'));
  const tasks = plan.master?.tasks; if (!Array.isArray(tasks)) return {};
  const finished = status => ['done', 'completed', 'cancelled'].includes(status);
  const ready = tasks.filter(task => ['pending', 'in-progress', 'review'].includes(task.status) && (task.dependencies || []).every(id => tasks.some(other => String(other.id) === String(id) && finished(other.status))));
  const sessionKey = createHash('sha256').update(input.session_id).digest('hex').slice(0, 24);
  const lock = path.join(dir, `stop-${sessionKey}.lock`); let handle;
  try { handle = await open(lock, 'wx', 0o600); } catch { return {}; }
  const stateFile = path.join(dir, `stop-${sessionKey}.json`), temporary = `${stateFile}.${randomUUID()}.tmp`;
  try {
    let previous = {}; try { previous = await json(stateFile, 10000); } catch (error) { if (error.code !== 'ENOENT') return {}; }
    const sameSession = previous.sessionId === input.session_id && Date.now() - Date.parse(previous.at) < 3600000;
    if (sameSession && previous.turnId === input.turn_id) return {};
    // Cap chained Stop continuations. A fresh owner turn resets the chain.
    const fingerprint = createHash("sha256").update(JSON.stringify(tasks)).digest("hex");
    const count = sameSession && input.stop_hook_active && previous.fingerprint === fingerprint ? previous.count || 0 : 0;
    const outcome = !ready.length ? 'No ready tasks' : count >= settings.maxUnchangedStops ? 'No-progress limit reached' : 'Continuation requested';
    const state = { sessionId: input.session_id, turnId: input.turn_id, fingerprint, count: count + (outcome === 'Continuation requested' ? 1 : 0), at: new Date().toISOString(), outcome };
    await writeFile(temporary, JSON.stringify(state), { mode: 0o600, flag: 'wx' }); await rename(temporary, stateFile);
    // A small last-invocation receipt is informational; session counters remain isolated.
    const receiptTemp = path.join(dir, `receipt-${randomUUID()}.tmp`);
    try { await writeFile(receiptTemp, JSON.stringify({ at: state.at, outcome: state.outcome }), { mode: 0o600, flag: 'wx' }); await rename(receiptTemp, path.join(dir, 'stop-state.json')); }
    finally { await rm(receiptTemp, { force: true }); }
    if (outcome !== 'Continuation requested') return {};
    return { decision: 'block', reason: `${settings.reason}\n\nReady top-level Task Master tasks: ${ready.slice(0, 10).map(t => `#${t.id}`).join(', ')}. Check current task state, saved owner answers and genuine blockers before acting. Do not continue work the owner cancelled. Update Task Master with verified progress. Repeated stops without a task-plan change pause continuation after ${settings.maxUnchangedStops} attempts.` };
  } finally { await rm(temporary, { force: true }); await handle.close(); await rm(lock, { force: true }); }
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    let text = ''; for await (const chunk of process.stdin) { text += chunk; if (text.length > 1000000) throw Error('Input too large'); }
    process.stdout.write(JSON.stringify(await stopDecision(JSON.parse(text))) + '\n');
  } catch { process.stdout.write('{}\n'); }
}
