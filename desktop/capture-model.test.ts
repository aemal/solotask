import test from 'node:test';
import assert from 'node:assert/strict';
import {newDraft,frameSlide,editDraft,addDictation,appendFrame,conciseLabel,annotationLayout,annotationSvg,type CaptureFrame} from '../components/vision/capture-model';
const frame:CaptureFrame={image:'data:image/png;base64,fixture',point:{x:.5,y:.5},capturedAt:'2026-10-23T10:00:00Z',source:'Screen 1'};
test('editing a submitted package forks every report identity once, preserving selection and original receipt',()=>{
 const slides=[frameSlide(frame,'first'),frameSlide(frame,'second')];
 const submitted={...newDraft(),slides,submittedRoundId:'round-confirmed'};
 const fork=editDraft(submitted,d=>({...d,name:'Revised feedback'}));
 assert.notEqual(fork.submissionId,submitted.submissionId);assert.equal(fork.submittedRoundId,undefined);
 assert.deepEqual(fork.slides.map(s=>s.id),submitted.slides.map(s=>s.id));
 for(const slide of fork.slides){assert.ok(slide.reportId);assert.ok(!submitted.slides.some(s=>(s.reportId||s.id)===slide.reportId));}
 assert.equal(new Set(fork.slides.map(s=>s.reportId)).size,2);
 assert.equal(submitted.submittedRoundId,'round-confirmed');assert.ok(submitted.slides.every(s=>!s.reportId));
 const editedAgain=editDraft(fork,d=>({...d,name:'Another edit'}));
 assert.equal(editedAgain.submissionId,fork.submissionId);assert.deepEqual(editedAgain.slides.map(s=>s.reportId),fork.slides.map(s=>s.reportId));
});
test('dictation before first capture persists and is consumed into notes and arrow label once',()=>{
 const spoken=addDictation(newDraft(),'','The submit button is hidden.');
 assert.equal(spoken.pendingTranscript,'The submit button is hidden.');
 const restored=JSON.parse(JSON.stringify(spoken));
 const captured=appendFrame(restored,frame,'Move it above the fold.');
 assert.equal(captured.pendingTranscript,undefined);
 assert.equal(captured.slides[0].notes,'The submit button is hidden. Move it above the fold.');
 assert.equal(captured.slides[0].annotations[0].text,'The submit button is hidden.');
 const next=appendFrame(captured,frame,'Another issue');assert.equal(next.slides[1].notes,'Another issue');
});

test('arrow captions use only the first source sentence and preserve full notes',()=>{
 const text='The save button is hard to see. Please move it higher and make it larger.';
 const slide=frameSlide(frame,text);
 assert.equal(slide.notes,text);assert.equal(slide.transcript,text);
 assert.equal(slide.annotations[0].text,'The save button is hard to see.');
 assert.ok(conciseLabel('A very long phrase '.repeat(30)).length<=110);
});
test('shared SVG has visible white outline and bounded captions near every image edge',()=>{
 for(const x of [0,.5,1])for(const y of [0,.5,1])for(const ratio of [.1,.625,1.5]){
  const a={id:'edge',type:'arrow' as const,x,y,endX:.5,endY:.5,text:'The button is difficult to see against this background.'};
  const {label,height}=annotationLayout(a,ratio);
  assert.ok(label.x>=0&&label.x+label.width<=1000);
  assert.ok(label.y>=0&&label.y+label.height<=height);
  const svg=annotationSvg(a,ratio);assert.match(svg,/stroke="#ffffff" stroke-width="14"/);assert.match(svg,/stroke-width="8"/);
 }
});
test('SVG escapes label text and sanitizes corrupt local draft numeric/color values',()=>{
 const a={id:'unsafe',type:'arrow',x:'"/><script>bad()</script>',y:NaN,endX:Infinity,endY:-4,text:'<script>not markup</script>',color:'red" onload="bad()'} as unknown as Parameters<typeof annotationSvg>[0];
 const svg=annotationSvg(a,NaN);
 assert.ok(!svg.includes('<script>'));assert.ok(!svg.includes('onload='));assert.ok(!svg.includes('NaN'));assert.ok(!svg.includes('Infinity'));assert.match(svg,/&lt;script&gt;/);
});
