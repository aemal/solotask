import { readFile, writeFile, rename, mkdir, lstat, realpath, open, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash, randomUUID } from 'node:crypto';
import { parseTasks } from './tasks';
import { flatten, dependencies } from './views';
import { InputError } from './prd/security';
import { pruneTaskBackups } from './task-backups';
export type TaskPatch = { title: string; description: string; status: string; priority: string; details: string; testStrategy: string };
export async function mutateTask(root: string, key: string, expected: unknown, patch?: TaskPatch, create = false, newTag?: string, subtask = false) {
  const base = await realpath(root);
  // Source comes from the registered project's own parsed files, never a client path.
  const { loadTasks } = await import('./tasks');
  const loaded = await loadTasks(base);
  const selected = flatten(loaded.tasks).find(r => r.task.key === key);
  if (!selected) throw new InputError('Task no longer exists. Refresh the project.');
  const file = path.join(base, selected.task.source);
  let cursor = base;
  for (const segment of selected.task.source.split(path.sep)) { cursor = path.join(cursor, segment); if ((await lstat(cursor)).isSymbolicLink()) throw new InputError('Linked task files cannot be edited.'); }
  if (!file.startsWith(base + path.sep)) throw new InputError('Invalid task source.');
  const lock = file + '.edit.lock';
  let handle;
  try { handle = await open(lock, 'wx'); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'EEXIST') throw new InputError('Another task edit is in progress. Try again shortly.');
    throw new InputError('Cannot write to this project’s task folder. Check the server’s file permissions.');
  }
  const temporary = file + '.' + randomUUID() + '.tmp';
  try {
    const original = await readFile(file, 'utf8');
    const data = JSON.parse(original);
    const rows = flatten(parseTasks(data, selected.task.source));
    const row = rows.find(r => r.task.key === key);
    if (!row || JSON.stringify(row.task.raw) !== JSON.stringify(expected)) throw new InputError('This task changed since you opened it. Refresh before editing.');
    const deletedKeys = new Set(flatten([row.task]).map(r => r.task.key));
    const affected = rows.filter(r => !deletedKeys.has(r.task.key)).flatMap(r => dependencies(r, rows).filter(d => d.target && deletedKeys.has(d.target.task.key)).map(d => ({ raw: r.task.raw, dependency: d.id, parent: r.parent?.id })));
    let list: unknown[];
    if (row.parent) list = row.parent.task.raw.subtasks as unknown[];
    else if (Array.isArray(data)) list = data;
    else if (Array.isArray(data.tasks)) list = data.tasks;
    else if (data[row.task.tag]?.tasks) list = data[row.task.tag].tasks;
    else throw new InputError('This legacy single-task file must be migrated before editing.');
    if (subtask) {
      if (!create || !patch) throw new InputError('Subtask fields are required.');
      if (row.task.raw.subtasks !== undefined && !Array.isArray(row.task.raw.subtasks)) throw new InputError('Parent subtasks are invalid.');
      row.task.raw.subtasks ??= []; list = row.task.raw.subtasks as unknown[];
    }
    if (newTag !== undefined) {
      if (!create || !/^[a-z0-9][a-z0-9_-]{0,63}$/.test(newTag) || ['constructor','prototype','__proto__'].includes(newTag)) throw new InputError('Use a tag of 1–64 lowercase letters, numbers, hyphens or underscores.');
      if (Array.isArray(data) || Array.isArray(data.tasks) || !data[row.task.tag]?.tasks) throw new InputError('This legacy task file does not support tags. Use a tagged Task Master plan.');
      if (Object.hasOwn(data,newTag)) throw new InputError('This tag already exists. Select its task list instead.');
      data[newTag] = { tasks: [] }; list = data[newTag].tasks;
    }
    if (patch) {
      if (!patch.title?.trim() || patch.title.length > 1000) throw new InputError('Enter a title under 1,000 characters.');
      if (!['pending','in-progress','review','done','completed','blocked','deferred','cancelled'].includes(patch.status)) throw new InputError('Invalid status.');
      if (!['low','medium','high','critical'].includes(patch.priority)) throw new InputError('Invalid priority.');
      for (const name of ['description','details','testStrategy'] as const) if (typeof patch[name] !== 'string' || patch[name].length > 100000) throw new InputError('Task text is too large.');
      if (create) {
        if (row.parent && !subtask) throw new InputError('Choose a top-level task scope.');
        const ids = list.map(item => Number((item as { id: unknown }).id));
        if (ids.some(id => !Number.isSafeInteger(id) || id < 0)) throw new InputError('This task file does not use numeric Task Master IDs.');
        list.push({ id: Math.max(0, ...ids) + 1, ...patch, title: patch.title.trim(), dependencies: [], subtasks: [], planningReview: { status: 'needed', reason: 'New task: review PRD alignment, complexity and dependencies.' } });
      } else {
        const contentChanged = ['title','description','details','testStrategy'].some(name => row.task.raw[name] !== patch[name as keyof TaskPatch]);
        Object.assign(row.task.raw, patch, { title: patch.title.trim() });
        if (contentChanged) row.task.raw.planningReview = { status: 'needed', reason: 'Requirements changed: review PRD alignment, complexity and dependencies.' };
      }
    } else {
      const index = list.indexOf(row.task.raw); if (index < 0) throw new InputError('Task source could not be updated.');
      list.splice(index, 1);
      for (const item of affected) item.raw.dependencies = (item.raw.dependencies as (string|number)[]).filter(id => (String(id).includes('.') || !item.parent ? String(id) : `${item.parent}.${id}`) !== item.dependency);
    }
    const backups = path.join(base, '.vibeboard', 'task-backups');
    await mkdir(backups, { recursive: true });
    // Refuse redirected backup paths as well as redirected source paths.
    if ((await realpath(backups)) !== backups) throw new InputError('Task backup folder must not be a symbolic link.');
    const backup = `${Date.now()}-${createHash('sha256').update(selected.task.source).digest('hex').slice(0,12)}-${randomUUID()}.json.bak`;
    await writeFile(path.join(backups, backup), original, { mode: 0o600, flag: 'wx' });
    await writeFile(temporary, JSON.stringify(data, null, 2) + '\n', { mode: 0o600 });
    if (await readFile(file, 'utf8') !== original) throw new InputError('The task file changed during this edit. Refresh and retry.');
    await rename(temporary, file);
    // The source edit lock also serializes retention for this source. Cleanup failure
    // must never turn a committed edit into an apparent failed mutation.
    const backupWarning = await pruneTaskBackups(base, selected.task.source, Date.now(), backup).then(() => undefined, () => 'Task saved, but old backup cleanup failed.');
    return { created: create, deleted: !patch, dependenciesRemoved: patch ? 0 : affected.length, backup: `.vibeboard/task-backups/${backup}`, ...(backupWarning ? { backupWarning } : {}) };
  } finally { await rm(temporary, { force: true }); await handle.close(); await rm(lock, { force: true }); }
}
