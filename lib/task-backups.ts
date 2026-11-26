import { lstat, readdir, realpath, unlink } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

export const BACKUP_RETENTION = { count: 50, bytes: 25 * 1024 * 1024, ageMs: 30 * 86400000 };

// Call while holding the corresponding task source's .edit.lock.
// Limits apply per task source; always preserve its newest recovery copy.
export async function pruneTaskBackups(root: string, source: string, now = Date.now(), protectedBackup?: string) {
  const base = await realpath(root);
  const directory = path.join(base, '.vibeboard', 'task-backups');
  try { if (await realpath(directory) !== directory) throw Error('Linked backup directory'); }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return { removed: 0, bytes: 0 }; throw error; }
  const hash = createHash('sha256').update(source).digest('hex').slice(0, 12);
  const pattern = new RegExp(`^(\\d{13})-${hash}-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\\.json\\.bak$`);
  const files = [];
  for (const name of await readdir(directory)) {
    const match = pattern.exec(name);
    if (!match) continue;
    const stat = await lstat(path.join(directory, name));
    if (stat.isFile()) files.push({ name, at: Number(match[1]), size: stat.size });
  }
  files.sort((a, b) => Number(b.name === protectedBackup) - Number(a.name === protectedBackup) || b.at - a.at || b.name.localeCompare(a.name));
  let kept = 0, size = 0, removed = 0, bytes = 0;
  for (const file of files) {
    if (!kept || (kept < BACKUP_RETENTION.count && size + file.size <= BACKUP_RETENTION.bytes && now - file.at <= BACKUP_RETENTION.ageMs)) {
      kept++; size += file.size;
    } else {
      await unlink(path.join(directory, file.name)); removed++; bytes += file.size;
    }
  }
  return { removed, bytes };
}
