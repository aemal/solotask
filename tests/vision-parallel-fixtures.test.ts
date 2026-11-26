import {test} from 'node:test';
import assert from 'node:assert/strict';
import {demoTasks} from '../lib/vision-kanban';

test('demo shows two independent active outcomes per delivery lead within three worker slots',()=>{
 for(const owner of ['bob','lisa','john']){
  const active=demoTasks.filter(t=>t.owner===owner&&t.status==='in-progress');
  assert.equal(active.length,2,`${owner} should visibly work on two outcomes in parallel`);
  assert.ok(active.length<=3,`${owner} exceeds the demo worker limit`);
  assert.equal(new Set(active.map(t=>t.title)).size,active.length);
  assert.ok(active.every(t=>t.steps.length>0));
  const ids=new Set(active.map(t=>t.id));
  assert.ok(active.every(t=>t.dependencies.every(id=>!ids.has(id))),`${owner}'s parallel tasks must not block each other`);
 }
 assert.equal(new Set(demoTasks.map(t=>t.id)).size,demoTasks.length);
});
