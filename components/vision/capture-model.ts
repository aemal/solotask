export type Annotation = {id:string;type:'arrow'|'rectangle'|'ellipse'|'text';x:number;y:number;width?:number;height?:number;endX?:number;endY?:number;text?:string;color?:string};
export type CaptureFrame = {image:string;point:{x:number;y:number}|null;capturedAt:string;source:string};
export type Slide = {id:string;reportId?:string;title:string;notes:string;transcript:string;image:string;capturedAt:string;annotations:Annotation[]};
export type CaptureDraft = {version:1;submissionId:string;name:string;slides:Slide[];pendingTranscript?:string;submittedRoundId?:string};
export type Source = {id:string;name:string;thumbnail:string};
export type DesktopAPI = {
 info:()=>Promise<{platform:string;wayland:boolean;shortcuts:{toggle:string;capture:string};registered:{toggle:boolean;capture:boolean};origin:string}>;
 sources:()=>Promise<Source[]>;select:(id:string)=>Promise<Source>;capture:()=>Promise<CaptureFrame>;stop:()=>Promise<void>;mode:(mode:'floating'|'review')=>Promise<void>;
 load:()=>Promise<CaptureDraft|null>;save:(draft:CaptureDraft)=>Promise<void>;submit:(payload:unknown)=>Promise<{round:{id:string};tickets:unknown[]}>;
 onCapture:(fn:(frame:CaptureFrame)=>void)=>()=>void;onError:(fn:(message:string)=>void)=>()=>void;
};
declare global {interface Window {feedbackDesktop?:DesktopAPI}}
export function newDraft():CaptureDraft {return {version:1,submissionId:crypto.randomUUID(),name:'Feedback round',slides:[]};}
// UI slide IDs stay stable for selection; wire report IDs are new for every fork.
export function editDraft(draft:CaptureDraft, edit:(draft:CaptureDraft)=>CaptureDraft):CaptureDraft {
 const editable=draft.submittedRoundId?{...draft,submissionId:crypto.randomUUID(),submittedRoundId:undefined,slides:draft.slides.map(s=>({...s,reportId:crypto.randomUUID()}))}:draft;
 return edit(editable);
}
export function addDictation(draft:CaptureDraft,slideId:string,text:string):CaptureDraft {
 if(!text.trim())return draft;
 if(!draft.slides.some(s=>s.id===slideId))return editDraft(draft,d=>({...d,pendingTranscript:[d.pendingTranscript,text].filter(Boolean).join(' ')}));
 return editDraft(draft,d=>({...d,slides:d.slides.map(s=>s.id!==slideId?s:{...s,transcript:[s.transcript,text].filter(Boolean).join(' '),notes:[s.notes,text].filter(Boolean).join(' '),annotations:s.annotations.map((a,i)=>i===s.annotations.length-1?{...a,text:a.text?.trim()||conciseLabel(text)}:a)})}));
}
export function appendFrame(draft:CaptureDraft,frame:CaptureFrame,text:string):CaptureDraft {
 return editDraft(draft,d=>({...d,pendingTranscript:undefined,slides:[...d.slides,frameSlide(frame,[d.pendingTranscript,text].filter(Boolean).join(' '))]}));
}
export function frameSlide(frame:CaptureFrame,text:string):Slide {
 const id=crypto.randomUUID();
 return {id,title:'',notes:text,transcript:text,image:frame.image,capturedAt:frame.capturedAt,annotations:frame.point?[{id:crypto.randomUUID(),type:'arrow',x:Math.max(.03,frame.point.x-.13),y:Math.max(.03,frame.point.y-.12),endX:frame.point.x,endY:frame.point.y,text:conciseLabel(text)}]:[]};
}
/** A verbatim first sentence, shortened at a word boundary; full dictation stays in notes. */
export function conciseLabel(text:string):string {
 if(typeof text!=='string')return '';
 const clean=text.replace(/\s+/g,' ').trim();
 const first=clean.match(/^.*?[.!?](?=\s|$)/)?.[0]||clean;
 if(first.length<=110)return first;
 const prefix=first.slice(0,107),boundary=prefix.lastIndexOf(' ');
 return prefix.slice(0,boundary>65?boundary:107).trimEnd()+'…';
}
const escapeSvg=(text:string)=>text.replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&apos;'}[c]!));
export function annotationLayout(a:Annotation,ratio:number){
 const unit=(value:unknown)=>typeof value==='number'&&Number.isFinite(value)?Math.min(1,Math.max(0,value)):0;
 const safeRatio=typeof ratio==='number'&&Number.isFinite(ratio)?Math.min(10,Math.max(.01,ratio)):1;
 const height=1000*safeRatio,x=unit(a.x)*1000,y=unit(a.y)*height,ex=unit(a.endX??a.x)*1000,ey=unit(a.endY??a.y)*height;
 let path='';
 if(a.type==='arrow'){
  const angle=Math.atan2(ey-y,ex-x),head=30;
  path=`M ${x} ${y} L ${ex} ${ey} M ${ex-head*Math.cos(angle-.55)} ${ey-head*Math.sin(angle-.55)} L ${ex} ${ey} L ${ex-head*Math.cos(angle+.55)} ${ey-head*Math.sin(angle+.55)}`;
 }else if(a.type==='rectangle'){
  const w=unit(a.width)*1000,h=unit(a.height)*height;path=`M ${x} ${y} h ${w} v ${h} h ${-w} Z`;
 }else if(a.type==='ellipse'){
  const rx=Math.abs(unit(a.width)*500),ry=Math.abs(unit(a.height)*height/2),cy=y+ry;
  path=`M ${x} ${cy} a ${rx} ${ry} 0 1 0 ${rx*2} 0 a ${rx} ${ry} 0 1 0 ${-rx*2} 0`;
 }
 const text=conciseLabel(a.text||''),lines:string[]=[];
 // Fixed SVG text lengths make preview and PNG use identical bounded typography.
 for(const word of text.split(/\s+/).filter(Boolean)){
  if(!lines.length)lines.push('');
  if(lines.at(-1)!.length+word.length+1>30&&lines.at(-1))lines.push('');
  const chunks=word.match(/.{1,30}/g)||[];
  chunks.forEach((chunk,i)=>{if(i)lines.push('');lines[lines.length-1]+=(lines.at(-1)?' ':'')+chunk;});
 }
 const maxLines=Math.max(0,Math.floor((height-36)/24));
 if(lines.length>maxLines){lines.splice(maxLines);if(lines.length)lines[lines.length-1]=lines.at(-1)!.slice(0,-1)+'…';}
 const width=Math.min(350,Math.max(70,...lines.map(line=>line.length*9.5+28))),labelHeight=lines.length*24+20;
 const preferredX=x-width-20>=8?x-width-20:x+20;
 const label={x:Math.max(8,Math.min(1000-width-8,preferredX)),y:Math.max(8,Math.min(height-labelHeight-8,y-labelHeight/2)),width,height:Math.min(labelHeight,Math.max(0,height-16)),lines};
 return {path,label,color:typeof a.color==='string'&&/^#[0-9a-f]{6}$/i.test(a.color)?a.color:'#f97316',height};
}
/** The very same escaped SVG fragment is used in the live editor and the permanent PNG. */
export function annotationSvg(a:Annotation,ratio:number):string {
 const {path,label,color}=annotationLayout(a,ratio);
 const strokes=path?`<path d="${path}" fill="none" stroke="#ffffff" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/><path d="${path}" fill="none" stroke="${color}" stroke-width="8" stroke-linecap="round" stroke-linejoin="round"/>`:'';
 if(!label.lines.length)return strokes;
 const labelMarkup=`<rect x="${label.x}" y="${label.y}" width="${label.width}" height="${label.height}" rx="8" fill="#11151b" stroke="#ffffff" stroke-width="2"/>`+label.lines.map((line,i)=>`<text x="${label.x+14}" y="${label.y+28+i*24}" fill="#ffffff" font-family="system-ui,sans-serif" font-size="18" font-weight="600" textLength="${line.length*9.5}" lengthAdjust="spacingAndGlyphs">${escapeSvg(line)}</text>`).join('');
 return strokes+labelMarkup;
}
export async function composeSlide(slide:Slide):Promise<string> {
 const image=new Image();image.src=slide.image;await image.decode();
 const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;
 const ctx=canvas.getContext('2d');if(!ctx)throw Error('Screenshot renderer unavailable.');ctx.drawImage(image,0,0);
 const ratio=canvas.height/canvas.width;
 const markup=`<svg xmlns="http://www.w3.org/2000/svg" width="${canvas.width}" height="${canvas.height}" viewBox="0 0 1000 ${1000*ratio}">${slide.annotations.map(a=>annotationSvg({...a,text:a.text||conciseLabel(slide.title||slide.notes)},ratio)).join('')}</svg>`;
 const url=URL.createObjectURL(new Blob([markup],{type:'image/svg+xml'}));
 try{const overlay=new Image();overlay.src=url;await overlay.decode();ctx.drawImage(overlay,0,0,canvas.width,canvas.height);}finally{URL.revokeObjectURL(url);}
 return canvas.toDataURL('image/png');
}
