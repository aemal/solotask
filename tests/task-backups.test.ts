import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readdir, rm, symlink, truncate } from 'node:fs/promises';
import { createHash, randomUUID } from 'node:crypto';
import os from 'node:os';
import path from 'node:path';
import { pruneTaskBackups, BACKUP_RETENTION } from '../lib/task-backups';
const source = '.taskmaster/tasks/tasks.json';
async function fixture(run: (root: string, dir: string, put: (at: number, source?: string) => Promise<string>) => Promise<void>) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'vb-retention-'));
  const dir = path.join(root, '.vibeboard/task-backups');
  await mkdir(dir, { recursive: true });
  const put = async (at: number, src = source) => {
    const name = `${at}-${createHash('sha256').update(src).digest('hex').slice(0,12)}-${randomUUID()}.json.bak`;
    await writeFile(path.join(dir, name), 'backup'); return name;
  };
  try { await run(root, dir, put); } finally { await rm(root, { recursive: true, force: true }); }
}
test('retention bounds count, isolates sources and preserves unrelated files and links', () => fixture(async (root, dir, put) => {
  const now = Date.now();
  for (let i=0; i<55; i++) await put(now-i);
  const other = await put(now-100, 'tasks.json');
  await writeFile(path.join(dir, 'manual-backup.json'), 'keep');
  const linked = await put(now-1000); await rm(path.join(dir, linked)); await symlink(path.join(dir, 'manual-backup.json'), path.join(dir, linked));
  assert.equal((await pruneTaskBackups(root, source, now)).removed, 5);
  const names = await readdir(dir); assert.equal(names.length, 53); assert.ok(names.includes(other)); assert.ok(names.includes(linked));
}));
test('retention removes expired copies but keeps newest even when old and oversized', () => fixture(async (root, dir, put) => {
  const now = Date.now(); const newest = await put(now-BACKUP_RETENTION.ageMs-1000); await put(now-BACKUP_RETENTION.ageMs-2000);
  await truncate(path.join(dir, newest), BACKUP_RETENTION.bytes+1);
  assert.equal((await pruneTaskBackups(root, source, now)).removed, 1);
  assert.deepEqual(await readdir(dir), [newest]);
}));
test('retention enforces byte budget on recent backups', () => fixture(async (root, dir, put) => {
  const now = Date.now(); const newest = await put(now), older = await put(now-1);
  await truncate(path.join(dir, newest), 16*1024*1024); await truncate(path.join(dir, older), 16*1024*1024);
  assert.equal((await pruneTaskBackups(root, source, now)).removed, 1); assert.deepEqual(await readdir(dir), [newest]);
}));
test('retention refuses redirected backup directories', () => fixture(async (root, dir) => {
  await rm(dir, { recursive: true }); const outside = path.join(root, 'outside'); await mkdir(outside); await symlink(outside, dir);
  await assert.rejects(pruneTaskBackups(root, source), /Linked/);
}));
test('the just-created backup survives timestamp ties', () => fixture(async (root, dir, put) => {
  const now = Date.now(); const current = await put(now);
  for (let i=0; i<55; i++) await put(now);
  await pruneTaskBackups(root, source, now, current);
  assert.ok((await readdir(dir)).includes(current));
}));
