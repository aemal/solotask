import {test} from 'node:test';
import assert from 'node:assert/strict';
import {defaultEmployeeRecord,upgradeEmployeeMemories} from '../lib/vision-employees';
import {leads} from '../lib/vision-demo';
test('sample memory migration preserves owner edits, additions, deletions and job description',()=>{
 const person=leads.find(p=>p.id==='samantha')!;
 const base=defaultEmployeeRecord(person);
 const untouched={...base.memories[1],text:person.focus};
 const edited={...base.memories[0],text:'My own preference',updatedAt:'2026-10-23T10:00:00Z'};
 const added={id:'owner-note',text:'Prefer afternoon reviews',createdAt:'2026-10-23T10:00:00Z'};
 const result=upgradeEmployeeMemories({samantha:{jobDescription:'Custom job',memories:[untouched,edited,added]}});
 assert.equal(result.samantha.memories[0].text,base.memories[1].text);
 assert.deepEqual(result.samantha.memories.slice(1),[edited,added]);
 assert.equal(result.samantha.jobDescription,'Custom job');
 assert.deepEqual(upgradeEmployeeMemories(result),result);
 assert.deepEqual(upgradeEmployeeMemories({samantha:{...base,memories:[]}}).samantha.memories,[]);
});
