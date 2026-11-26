"use client";
import {useState} from 'react';
import {Card,Tabs} from '@heroui/react';
import {Phone,ArrowLeft,Plus,Pencil,Trash2,Brain,Clock3} from 'lucide-react';
import {Button} from '@/components/ui/button';
import DictatedTextarea from '@/components/dictated-textarea';
import RefinableDocument from '@/components/refinable-document';
import {VisionSidebar} from './sidebar';
import {useVision} from './session';
import {Avatar,Pulse} from './workspace';
import {defaultEmployeeRecord,type MemoryEntry} from '@/lib/vision-employees';
export function VisionEmployees(){
 const {roster,hiring,records,saveRecord,openCall}=useVision();
 const [selected,setSelected]=useState<string|null>(null),[tab,setTab]=useState('memory'),[editing,setEditing]=useState<string|null>(null),[draft,setDraft]=useState(''),[removed,setRemoved]=useState<MemoryEntry|null>(null);
 const [dictating,setDictating]=useState(false);
 const person=roster.find(p=>p.id===selected);
 const record=person?(records[person.id]||{...defaultEmployeeRecord(person),...(person.id==='poja'?{jobDescription:hiring.document}:{})}):null;
 const saveMemory=()=>{if(!person||!record||!draft.trim()||dictating||draft.length>4000)return;const now=new Date().toISOString();const memories=editing==='new'?[...record.memories,{id:crypto.randomUUID(),text:draft.trim(),createdAt:now}]:record.memories.map(m=>m.id===editing?{...m,text:draft.trim(),updatedAt:now}:m);saveRecord(person.id,{...record,memories});setEditing(null);setDraft('');};
 const date=(value:string)=>new Date(value).toLocaleString('en-GB',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'});
 return <div className="vision-shell vision-app"><VisionSidebar active="employees"/><main className="vision-main vision-employees-main">
 {!person?<><div className="vision-page-heading"><div><span className="vision-eyebrow">ATLAS / AI EMPLOYEES</span><h1>Your people. Their context.</h1><p>Roles, activity and the knowledge that stays with each teammate.</p></div><span className="vision-status">{roster.length} teammates</span></div>
 <Card className="vision-employee-table-wrap"><table className="vision-employee-table"><thead><tr><th>Name</th><th>Title</th><th>Last worked</th><th>Activity signal</th><th><span className="sr-only">Profile</span></th></tr></thead><tbody>{roster.map(p=><tr key={p.id}><td><Avatar lead={p} small/><strong>{p.name}</strong></td><td>{p.role}</td><td>{p.id==='lisa'?'Just resumed':p.id==='poja'?'Onboarding':'Just now'}<small>Simulated</small></td><td><span className="vision-employee-signal"><Pulse recentlyResumed={p.id==='lisa'} seed={[...p.id].reduce((a,c)=>a*31+c.charCodeAt(0),0)}/><span>{p.id==='poja'?'New hire':'Working'}</span></span></td><td><Button className="filter-button" aria-label={`View ${p.name} profile`} onClick={()=>{setSelected(p.id);setEditing(null);setRemoved(null);}}>Details</Button></td></tr>)}</tbody></table></Card><p className="vision-calendar-footnote">Demo employees · Activity is simulated · Profile edits are saved in this browser.</p></>:<>
 <Button className="filter-button" onClick={()=>{setSelected(null);setEditing(null);}}><ArrowLeft size={16}/>All employees</Button>
 <Card className="vision-employee-profile"><Avatar lead={person}/><div className="vision-employee-identity"><h1>{person.name}</h1><p>{person.role}</p><small>{person.focus}</small></div><Button className="primary-button" onClick={()=>openCall(person)}><Phone size={17}/>Call</Button></Card>
 <Tabs className="vision-employee-profile-tabs" selectedKey={tab} onSelectionChange={k=>setTab(String(k))}><Tabs.ListContainer><Tabs.List aria-label="Employee profile sections"><Tabs.Tab id="memory">Long-term memory<Tabs.Indicator/></Tabs.Tab><Tabs.Tab id="job">Job description<Tabs.Indicator/></Tabs.Tab></Tabs.List></Tabs.ListContainer></Tabs>
 {tab==='job'?<Card className="vision-job-document"><RefinableDocument label={`${person.name} job description`} value={record!.jobDescription} maxLength={20000} onChange={jobDescription=>saveRecord(person.id,{...record!,jobDescription})}/></Card>:<section className="vision-memory-section"><div className="vision-memory-heading"><div><h2><Brain size={20}/>What {person.name} remembers</h2><p>Preferences learned from working with you. Review, edit or remove any note.</p></div><Button className="filter-button" onClick={()=>{setEditing('new');setDraft('');}}><Plus size={16}/>Add memory</Button></div>
 {removed&&<div className="vision-memory-undo" role="status">Memory removed.<Button className="text-button" onClick={()=>{saveRecord(person.id,{...record!,memories:[...record!.memories,removed]});setRemoved(null);}}>Undo</Button></div>}
 {editing==='new'&&<Card className="vision-memory-editor"><label>New memory<DictatedTextarea key="new-memory" onBusyChange={setDictating} aria-label="New memory" rows={3} value={draft} maxLength={4000} onValueChange={setDraft}/></label><div><Button className="primary-button" disabled={dictating||!draft.trim()||draft.length>4000} onClick={saveMemory}>Save memory</Button><Button className="filter-button" onClick={()=>setEditing(null)}>Cancel</Button></div></Card>}
 <div className="vision-memory-timeline">{[...record!.memories].sort((a,b)=>b.createdAt.localeCompare(a.createdAt)).map(m=><article key={m.id} className="vision-memory-entry"><div className="vision-memory-date"><Clock3 size={14}/><time>{date(m.createdAt)}</time>{m.updatedAt&&<small>Edited {date(m.updatedAt)}</small>}</div>{editing===m.id?<><DictatedTextarea key={m.id} onBusyChange={setDictating} aria-label="Edit memory" rows={4} value={draft} maxLength={4000} onValueChange={setDraft}/><div className="vision-memory-actions"><Button className="primary-button" disabled={dictating||!draft.trim()||draft.length>4000} onClick={saveMemory}>Save changes</Button><Button className="filter-button" onClick={()=>setEditing(null)}>Cancel</Button></div></>:<><p>{m.text}</p><div className="vision-memory-actions"><Button className="text-button" onClick={()=>{setEditing(m.id);setDraft(m.text);}}><Pencil size={14}/>Edit</Button><Button className="text-button" onClick={()=>{saveRecord(person.id,{...record!,memories:record!.memories.filter(x=>x.id!==m.id)});setRemoved(m);}}><Trash2 size={14}/>Delete</Button></div></>}</article>)}</div>
 {!record!.memories.length&&<div className="vision-memory-empty"><Brain size={24}/><p>No memories yet. Add the first piece of context for this teammate.</p></div>}
 </section>}
 </>}
 </main></div>;
}
