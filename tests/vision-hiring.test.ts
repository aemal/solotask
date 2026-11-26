import {test} from 'node:test';
import assert from 'node:assert/strict';
import {emptyHiring,applyHiringCommand,hiringRoster} from '../lib/vision-hiring';
test('hiring requires a reviewed current draft; initial request never hires',()=>{
 assert.equal(hiringRoster(emptyHiring).length,4);
 assert.throws(()=>applyHiringCommand(emptyHiring,{action:'approve',revision:'0'}));
 const draft=applyHiringCommand(emptyHiring,{action:'draft'});
 assert.equal(draft.stage,'draft');assert.equal(hiringRoster(draft).length,4);
 const revised=applyHiringCommand(draft,{action:'revise',content:draft.document+'\nInclude mobile checks.',revision:'1'});
 assert.throws(()=>applyHiringCommand(revised,{action:'approve',revision:'1'}));
 const hired=applyHiringCommand(revised,{action:'approve',revision:'2'});
 const qa=hiringRoster(hired).find(p=>p.id==='poja')!;
 assert.equal(qa.name,'QA Officer');assert.equal(qa.image,'');assert.equal(qa.specialists.length,0);
 const named=applyHiringCommand(hired,{action:'name',content:'Poja'});
 assert.equal(hiringRoster(named).find(p=>p.id==='poja')!.name,'Poja');assert.ok(hiringRoster(named).find(p=>p.id==='poja')!.image);
 assert.equal(applyHiringCommand(named,{action:'approve',revision:'2'}),named);
});
test('cannot name before hiring or silently overwrite an edited draft',()=>{
 assert.throws(()=>applyHiringCommand(emptyHiring,{action:'name',content:'Poja'}));
 const draft=applyHiringCommand(emptyHiring,{action:'draft',content:'Owner reviewed custom QA role'});
 assert.equal(applyHiringCommand(draft,{action:'draft',content:'replacement'}).document,draft.document);
 assert.throws(()=>applyHiringCommand(draft,{action:'revise',revision:'0',content:'stale'}));
});
import {demoTasks,releaseOwnerDecision} from '../lib/vision-kanban';
test('owner feedback releases only pending owner decisions and reassignment is idempotent',()=>{
 const pending=demoTasks.find(t=>t.id==='OWN-01')!;
 const ready=releaseOwnerDecision(pending);assert.equal(ready.status,'open');assert.equal(ready.owner,'john');assert.equal(ready.id,pending.id);
 assert.equal(releaseOwnerDecision(ready),ready);
 const working=demoTasks.find(t=>t.id==='UX-17')!;assert.equal(releaseOwnerDecision(working),working);
});

test('QA naming handles spoken Pooja and explicit instructions without treating greetings as names',async()=>{
 const {requestedQaName}=await import('../lib/vision-hiring');
 assert.equal(requestedQaName('Pooja.',true),'Pooja');
 assert.equal(requestedQaName('I would like to call you Poja.',false),'Poja');
 assert.equal(requestedQaName('Hi.',true),null);
 assert.equal(requestedQaName('Poja',false),null);
 assert.equal(requestedQaName('What is the QA status?',true),null);
});

 test('QA onboarding preserves the chosen name and approved document through the whole flow',async()=>{
 const {requestedQaName}=await import('../lib/vision-hiring');
 let state=applyHiringCommand(emptyHiring,{action:'draft'});
 state=applyHiringCommand(state,{action:'revise',revision:'1',content:state.document+'\n- Cover payments and mobile Safari.'});
 assert.ok(!hiringRoster(state).some(p=>p.id==='poja'));
 state=applyHiringCommand(state,{action:'approve',revision:'2'});
 assert.equal(hiringRoster(state).find(p=>p.id==='poja')!.image,'');
 assert.equal(requestedQaName('Hi!',true),null);
 const name=requestedQaName('Pooja.',true)!;
 state=applyHiringCommand(state,{action:'name',content:name});
 const restored=JSON.parse(JSON.stringify(state));
 const qa=hiringRoster(restored).find(p=>p.id==='poja')!;
 assert.equal(qa.name,'Pooja');assert.equal(qa.image,'/vision/poja.png');
 assert.match(qa.briefing,/payments and mobile Safari/);
 assert.equal(applyHiringCommand(state,{action:'approve',revision:'2'}),state);
 });
