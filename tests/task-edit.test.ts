import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, readFile, rm, readdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { mutateTask } from '../lib/task-edit';
import { parseTasks } from '../lib/tasks';
import { flatten } from '../lib/views';
const source='.taskmaster/tasks/tasks.json';
const patch={title:'Updated task',description:'Owner description',status:'pending',priority:'high',details:'Preserve context',testStrategy:'Run acceptance checks'};
async function fixture(run:(root:string,file:string)=>Promise<void>){const root=await mkdtemp(path.join(os.tmpdir(),'vb-task-edit-'));const file=path.join(root,source);await mkdir(path.dirname(file),{recursive:true});await writeFile(file,JSON.stringify({master:{extra:'keep',tasks:[{id:1,title:'First',status:'pending',custom:{keep:true},subtasks:[{id:1,title:'Child',subtasks:[]}]},{id:2,title:'Dependent',dependencies:[1,'1.1'],subtasks:[]}]},other:{tasks:[{id:1,title:'Other tag',dependencies:[]}]}}));try{await run(root,file);}finally{await rm(root,{recursive:true,force:true});}}
async function task(file:string,id:string){return flatten(parseTasks(JSON.parse(await readFile(file,'utf8')),source)).find(r=>r.id===id&&r.task.tag==='master')!.task;}
test('edit preserves metadata, nested tasks and tag identity, rejects stale updates',()=>fixture(async(root,file)=>{const t=await task(file,'1');await mutateTask(root,t.key,t.raw,patch);const changed=await task(file,'1');assert.equal(changed.title,'Updated task');assert.deepEqual(changed.raw.custom,{keep:true});assert.equal(changed.subtasks.length,1);await assert.rejects(mutateTask(root,t.key,t.raw,patch),/changed/);const data=JSON.parse(await readFile(file,'utf8'));assert.equal(data.master.extra,'keep');assert.equal(data.other.tasks[0].title,'Other tag');}));
test('delete removes descendant dependencies, preserves other tags and saves original backup',()=>fixture(async(root,file)=>{const original=await readFile(file,'utf8');const t=await task(file,'1');const result=await mutateTask(root,t.key,t.raw);const data=JSON.parse(await readFile(file,'utf8'));assert.equal(data.master.tasks.length,1);assert.deepEqual(data.master.tasks[0].dependencies,[]);assert.equal(data.other.tasks.length,1);assert.equal(await readFile(path.join(root,result.backup),'utf8'),original);}));
test('create assigns next ID within selected tag and leaves complexity unassessed',()=>fixture(async(root,file)=>{const t=await task(file,'1');await mutateTask(root,t.key,t.raw,patch,true);const data=JSON.parse(await readFile(file,'utf8'));assert.equal(data.master.tasks.at(-1).id,3);assert.deepEqual(data.master.tasks.at(-1).dependencies,[]);assert.equal(data.master.tasks.at(-1).complexity,undefined);assert.equal(data.other.tasks.length,1);}));
test('subtask deletion preserves parent and lock conflicts reject without modifying data',()=>fixture(async(root,file)=>{const t=await task(file,'1.1');await mutateTask(root,t.key,t.raw);assert.equal((await task(file,'1')).subtasks.length,0);const before=await readFile(file,'utf8');await writeFile(file+'.edit.lock','busy');const parent=await task(file,'1');await assert.rejects(mutateTask(root,parent.key,parent.raw,patch),/in progress/);assert.equal(await readFile(file,'utf8'),before);assert.equal((await readdir(path.dirname(file))).some(n=>n.endsWith('.tmp')),false);}));
test('create a tag and first ticket without changing the original task list',()=>fixture(async(root,file)=>{const t=await task(file,'1');await mutateTask(root,t.key,t.raw,patch,true,'sprint-2');const data=JSON.parse(await readFile(file,'utf8'));assert.equal(data['sprint-2'].tasks[0].id,1);assert.equal(data.master.tasks.length,2);await assert.rejects(mutateTask(root,t.key,t.raw,patch,true,'sprint-2'),/already exists/);await assert.rejects(mutateTask(root,t.key,t.raw,patch,true,'../escape'),/tag/);}));
test('manual subtasks allocate sibling IDs and preserve parent fields and dependencies',()=>fixture(async(root,file)=>{const parent=await task(file,'1');await mutateTask(root,parent.key,parent.raw,patch,true,undefined,true);const updated=await task(file,'1');assert.equal(updated.title,'First');assert.equal(updated.subtasks.length,2);assert.equal(updated.subtasks[1].id,'2');assert.deepEqual(updated.subtasks[1].dependencies,[]);assert.equal((updated.subtasks[1].raw.planningReview as {status:string}).status,'needed');assert.deepEqual((await task(file,'2')).dependencies,['1','1.1']);}));
test('successful mutation prunes old generated backups and preserves its returned recovery copy',()=>fixture(async(root,file)=>{
 const {createHash,randomUUID}=await import('node:crypto');
 const dir=path.join(root,'.vibeboard/task-backups');await mkdir(dir,{recursive:true});
 const hash=createHash('sha256').update(source).digest('hex').slice(0,12);
 await writeFile(path.join(dir,`${Date.now()-31*86400000}-${hash}-${randomUUID()}.json.bak`),'expired');
 const original=await readFile(file,'utf8'),t=await task(file,'1');
 const result=await mutateTask(root,t.key,t.raw,patch);
 assert.equal((await readdir(dir)).length,1);
 assert.equal(await readFile(path.join(root,result.backup),'utf8'),original);
}));
