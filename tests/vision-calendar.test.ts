import {test} from 'node:test';
import assert from 'node:assert/strict';
import {visionMeetings,calendarTime} from '../lib/vision-calendar';
test('calendar compresses equivalent human sessions and supports overnight view',()=>{assert.equal(calendarTime(3,false,false),'09:03');assert.equal(calendarTime(3,true,false),'10:30');assert.equal(calendarTime(3,false,true),'02:03');});
test('simultaneous team call fills the first alignment slot and messages stay within their minute',()=>{
 const team=visionMeetings.find(m=>m.id==='team-parallel')!;
 assert.equal(team.minute,0);assert.equal(team.lane,2);assert.equal(team.people.length,5);
 assert.ok(visionMeetings.some(m=>m.id!==team.id&&m.minute===team.minute&&m.people.some(p=>team.people.includes(p))));
 for(const m of visionMeetings) assert.ok(m.messages.every(x=>m.people.includes(x.person)&&x.second>=0&&x.second<60));
 const slots=visionMeetings.map(m=>`${m.minute}:${m.lane}`);assert.equal(new Set(slots).size,slots.length);
});
