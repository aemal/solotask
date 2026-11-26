"use client";
import Link from 'next/link';
import {FileText,Phone,CheckCircle2,RotateCcw} from 'lucide-react';
import {Card} from '@heroui/react';
import {Button} from '@/components/ui/button';
import RefinableDocument from '@/components/refinable-document';
import {VisionSidebar} from './sidebar';
import {useVision} from './session';
export function VisionJobs(){
 const {hiring,command,editDocument,resetHiring,roster,openCall,activeLead}=useVision();
 return <div className="vision-shell vision-app"><VisionSidebar active="job-descriptions"/><main className="vision-main vision-jobs-main">
 <div className="vision-page-heading"><div><span className="vision-eyebrow">ATLAS / HIRING</span><h1>The right role. Your final say.</h1><p>Shape the job description with Samantha, then welcome your new teammate.</p></div><Button className="filter-button" onClick={()=>openCall(roster[0])}><Phone size={17}/>{activeLead?'Open conversation':'Call Samantha'}</Button></div>
 {hiring.stage==='vacant'?<Card className="vision-job-empty"><FileText size={32}/><h2>A QA role is waiting to be defined.</h2><p>Tell Samantha “Let’s hire a QA officer.” She’ll prepare a draft here for you to review together.</p><Button className="primary-button" onClick={()=>command({action:'draft'})}>Draft QA job description</Button></Card>:<>
 <div className="vision-job-meta"><span className="vision-status"><span className="vision-dot"/>{hiring.stage==='draft'?'Draft · ready for your review':'Approved · teammate hired'}</span><span>Version {hiring.revision} · Saved in this browser</span></div>
 <Card className="vision-job-document"><RefinableDocument label="QA job description" value={hiring.document} disabled={hiring.stage!=='draft'} maxLength={20000} onChange={editDocument}/></Card>
 <div className="vision-job-actions">{hiring.stage==='draft'?<><p>Edit directly while talking. Tell Samantha when you approve this version and want to hire.</p><Button className="primary-button" onClick={()=>{command({action:'approve',revision:String(hiring.revision)});window.dispatchEvent(new Event('vision-owner-approved-hire'));}}>Approve & hire QA officer</Button></>:<><p><CheckCircle2 size={17}/>Your QA officer is ready. {hiring.name?`You named her ${hiring.name}.`:'Ask Samantha to introduce her, then choose her name.'}</p><Link href="/vision/team" className="primary-button">Meet your team</Link></>}</div>
 </>}
 <details className="vision-job-demo-settings"><summary>Demo controls</summary><p>Reset the hiring story to start again with an open QA role. This only affects this demo in this browser.</p><Button disabled={!!activeLead} className="filter-button" onClick={resetHiring}><RotateCcw size={16}/>Reset hiring demo</Button>{activeLead&&<small>End the current conversation before resetting.</small>}</details>
 </main></div>;
}
