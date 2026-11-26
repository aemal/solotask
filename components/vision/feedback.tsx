"use client";
import {useEffect,useState} from 'react';
import Link from 'next/link';
import {Card} from '@heroui/react';
import {ArrowUpRight,CheckCircle2,Images,Phone,Send,Tag} from 'lucide-react';
import {Button} from '@/components/ui/button';
import DictatedTextarea from '@/components/dictated-textarea';
import {VisionSidebar} from './sidebar';
import {useVision} from './session';
import {useFeedbackData,selectFeedbackRound} from './feedback-data';
import './feedback.css';
export function VisionFeedback(){
 const {roster,openCall}=useVision();const {rounds,tickets,loading,error,update,refresh}=useFeedbackData();
 const [roundId,setRoundId]=useState(''),[ticketId,setTicketId]=useState(''),[note,setNote]=useState(''),[busy,setBusy]=useState(false),[dictating,setDictating]=useState(false),[notice,setNotice]=useState('');
 useEffect(()=>{const query=new URLSearchParams(window.location.search).get('round');if(query)setRoundId(query);},[]);
 const round=rounds.find(r=>r.id===roundId)||rounds[0];const reports=tickets.filter(t=>t.roundId===round?.id);const ticket=reports.find(t=>t.id===ticketId)||reports[0];
 useEffect(()=>{if(round)selectFeedbackRound(round.id);},[round?.id]);
 const act=async(action:'start'|'clarify')=>{if(!round)return;setBusy(true);setNotice('');try{await update(action==='start'?{action,roundId:round.id,owners:roster.filter(p=>p.id!=='samantha').map(p=>p.id)}:{action,roundId:round.id,reportId:ticket?.id,text:note});setNote('');setNotice(action==='start'?'Samantha is expanding the brief and assigning the team. Follow the round in Kanban.':'Context added to this feedback ticket.');}catch(e){setNotice(e instanceof Error?e.message:'Could not save.');}finally{setBusy(false);}};
 return <div className="vision-shell vision-app"><VisionSidebar active="feedback"/><main className="vision-main vision-feedback-main">
 <div className="vision-page-heading"><div><span className="vision-eyebrow">ATLAS / FEEDBACK</span><h1>Your review. Ready for the team.</h1><p>Desktop captures arrive here as named feedback rounds. Review the evidence, then hand it to Samantha.</p></div><span className="vision-preview">DEMO WORKFLOW</span></div>
 {error&&<div role="alert" className="feedback-notice">{error}<Button onClick={()=>void refresh()}>Retry</Button></div>}
 {!round?<Card className="feedback-empty"><Images size={32}/><h2>{loading?'Loading your feedback…':'Your next review starts on desktop'}</h2><p>Capture screenshots, point out the issues and dictate your notes. Submit the package from the desktop app to see it here.</p><Link href="/vision/capture">Open capture workspace <ArrowUpRight size={16}/></Link></Card>:<>
 <div className="feedback-rounds" aria-label="Feedback rounds">{rounds.map(r=><button key={r.id} className={`feedback-round ${r.id===round.id?'selected':''}`} onClick={()=>{setRoundId(r.id);setTicketId('');setNote('');setNotice('');}}><Tag size={17}/><span><strong>{r.name}</strong><small>{r.reportIds.length} reports · {new Date(r.createdAt).toLocaleDateString()} · {r.status==='submitted'?'Awaiting your handoff':'Handed to the team'}</small></span>{r.status==='in-progress'&&<CheckCircle2 size={18}/>}</button>)}</div>
 <header className="feedback-round-heading"><div><h2>{round.name}</h2><p>{reports.length} screenshots · {round.status==='submitted'?'Review with Samantha before starting':'Assignments and progress are simulated'}</p></div><div className="feedback-actions"><Button className="filter-button" onClick={()=>{selectFeedbackRound(round.id);openCall(roster.find(p=>p.id==='samantha')!);}}><Phone size={16}/>Talk to Samantha</Button><Link className="filter-button" href={`/vision/kanban?round=${encodeURIComponent(round.id)}`}>View in Kanban <ArrowUpRight size={15}/></Link><Button className="primary-button" disabled={busy||round.status!=='submitted'} onClick={()=>void act('start')}><Send size={16}/>{round.status==='submitted'?'Let the team start':'Handed to the team'}</Button></div></header>
 <div className="feedback-deck"><nav className="feedback-thumbnails" aria-label="Screenshots in this round">{reports.map((t,i)=><button key={t.id} aria-current={ticket?.id===t.id?'true':undefined} className={ticket?.id===t.id?'selected':''} onClick={()=>{setTicketId(t.id);setNote('');}}><img src={t.imageUrl} alt={`Screenshot ${i+1}: ${t.title}`}/><span>{i+1}. {t.title}</span><small>{`FB-${t.id.slice(3,11).toUpperCase()}`}</small></button>)}</nav>
 {ticket&&<Card className="feedback-slide"><div className="feedback-slide-title"><span>{`FB-${ticket.id.slice(3,11).toUpperCase()}`}</span><span>{ticket.enriched?'Expanded by Samantha':'Your original review'}</span></div><h2>{ticket.title}</h2><a href={ticket.imageUrl} target="_blank" rel="noreferrer" className="feedback-full-image"><img src={ticket.imageUrl} alt={ticket.title}/><span>Open full screenshot <ArrowUpRight size={14}/></span></a><p className="feedback-owner-note">{ticket.ownerNotes||ticket.summary}</p>{ticket.transcript&&ticket.transcript!==ticket.ownerNotes&&<details><summary>Original dictation</summary><p>{ticket.transcript}</p></details>}
 {ticket.enriched&&<section><h3>Samantha’s implementation brief</h3><ul>{ticket.steps.map(step=><li key={step}>{step}</li>)}</ul></section>}
 <section className="feedback-clarify"><h3>Add context for Samantha</h3><DictatedTextarea value={note} onValueChange={setNote} onBusyChange={setDictating} rows={3} maxLength={4000} aria-label="Additional feedback context" placeholder="What should the team know about this screenshot?"/><div className="feedback-actions"><Button className="filter-button" disabled={busy||dictating||!note.trim()} onClick={()=>void act('clarify')}>Save context</Button></div></section></Card>}
 </div>{notice&&<p className="feedback-notice" role="status">{notice}</p>}
 </>}
 </main></div>;
}
