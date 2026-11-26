import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, rm, symlink } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { defaultContinuation, readContinuation, saveContinuation, prepareContinuation } from '../lib/continuation';
test('continuation settings preserve revision and existing project configuration', async () => {
 const root = await mkdtemp(path.join(tmpdir(), 'vb-continuation-'));
 try {
  assert.equal((await readContinuation(root)).settings.enabled, false);
  await prepareContinuation(root, true);
  const data = await readContinuation(root); assert.equal(data.settings.enabled, true);
  await assert.rejects(saveContinuation(root, defaultContinuation, null), /changed/);
  await saveContinuation(root, { ...data.settings, enabled: false }, data.revision);
  await prepareContinuation(root, true); assert.equal((await readContinuation(root)).settings.enabled, false);
 } finally { await rm(root, {recursive:true,force:true}); }
});
test('Stop hook continues ready backlog, pauses no-progress chains, resumes on progress, and respects disable and event scope', async () => {
 const root = await mkdtemp(path.join(tmpdir(), 'vb stop hook '));
 const script = path.resolve('bin/vibeboard-stop-hook.mjs');
 const run = (turn: string, active = true, session = 'test-session', event = 'Stop') => {
  const child = spawnSync(process.execPath, [script], {input:JSON.stringify({hook_event_name:event,cwd:root,session_id:session,turn_id:turn,stop_hook_active:active}),encoding:'utf8'});
  assert.equal(child.status,0,child.stderr); return JSON.parse(child.stdout);
 };
 try {
  await mkdir(path.join(root,'.taskmaster/tasks'),{recursive:true});
  const file = path.join(root,'.taskmaster/tasks/tasks.json');
  const plan = {master:{tasks:[{id:1,status:'pending',dependencies:[]}]}};
  await writeFile(file,JSON.stringify(plan)); await prepareContinuation(root,true);
  assert.deepEqual(run('interrupt',false,'test-session','Interrupt'),{});
  assert.equal(run('one',false).decision,'block');
  assert.deepEqual(run('one'),{});
  assert.equal(run('two').decision,'block');
  assert.equal(run('three').decision,'block');
  assert.deepEqual(run('four'),{});
  assert.equal(run('other',true,'another-session').decision,'block');
  assert.deepEqual(run('five'),{});
  plan.master.tasks.push({id:2,status:'pending',dependencies:[]}); await writeFile(file,JSON.stringify(plan));
  assert.equal(run('six').decision,'block');
  plan.master.tasks.forEach(t=>t.status='done'); await writeFile(file,JSON.stringify(plan)); assert.deepEqual(run('seven'),{});
  const data=await readContinuation(root); await saveContinuation(root,{...data.settings,enabled:false},data.revision); assert.deepEqual(run('eight'),{});
 } finally { await rm(root,{recursive:true,force:true}); }
});
test('continuation rejects a symlink settings directory',async()=>{
 const root=await mkdtemp(path.join(tmpdir(),'vb-stop-link-')); const other=await mkdtemp(path.join(tmpdir(),'vb-stop-target-'));
 try { await symlink(other,path.join(root,'.vibeboard')); await assert.rejects(readContinuation(root),/Invalid/); }
 finally { await rm(root,{recursive:true,force:true}); await rm(other,{recursive:true,force:true}); }
});
