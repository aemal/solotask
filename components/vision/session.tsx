"use client";
import {createContext,useContext,useEffect,useRef,useState,type ReactNode} from 'react';
import {usePathname} from 'next/navigation';
import {CallDrawer} from './call-drawer';
import {emptyHiring,hiringRoster,applyHiringCommand,type HiringCommand,type HiringState} from '@/lib/vision-hiring';
import type {VisionLead} from '@/lib/vision-demo';
import {defaultEmployeeRecord,upgradeEmployeeMemories,type EmployeeRecords,type EmployeeRecord} from "@/lib/vision-employees";
// Start this demo run before recruitment; retain the previous run's saved data separately.
const key='vibeboard-vision-hiring-v2';
const Context=createContext<null|{hiring:HiringState; roster:VisionLead[]; command:(c:HiringCommand)=>HiringState; editDocument:(s:string)=>void; resetHiring:()=>void; openCall:(lead:VisionLead)=>void; activeLead:VisionLead|null; records:EmployeeRecords; saveRecord:(id:string,record:EmployeeRecord)=>void}>(null);
export function useVision(){const c=useContext(Context);if(!c)throw Error('Vision provider missing');return c;}
export function VisionSessionProvider({children}:{children:ReactNode}) {
 const [hiring,setHiring]=useState<HiringState>(emptyHiring),[activeLead,setLead]=useState<VisionLead|null>(null),[expanded,setExpanded]=useState(false);
 const [records,setRecords]=useState<EmployeeRecords>({});
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem("vibeboard-vision-employees-v1")||"{}"); if(saved&&typeof saved==="object"){const upgraded=upgradeEmployeeMemories(saved);setRecords(upgraded);localStorage.setItem("vibeboard-vision-employees-v1",JSON.stringify(upgraded));}}catch{}},[]);
 const saveRecord=(id:string,record:EmployeeRecord)=>setRecords(old=>{const next={...old,[id]:record};try{localStorage.setItem("vibeboard-vision-employees-v1",JSON.stringify(next));}catch{}return next;});
 const state=useRef(hiring); const path=usePathname();const previousPath=useRef(path);
 useEffect(()=>{try{const saved=JSON.parse(localStorage.getItem(key)||'null');if(saved&&['vacant','draft','hired','named'].includes(saved.stage)&&typeof saved.document==='string'&&Number.isInteger(saved.revision)&&typeof saved.name==='string'){state.current=saved;setHiring(saved);}}catch{}},[]);
 const commit=(next:HiringState)=>{state.current=next;setHiring(next);try{localStorage.setItem(key,JSON.stringify(next));}catch{};return next;};
 const command=(c:HiringCommand)=>{
   const previous=state.current,next=commit(applyHiringCommand(previous,c));
   if(next.stage!==previous.stage && ['hired','named'].includes(next.stage)) {
     const qa=hiringRoster(next).find(p=>p.id==='poja')!;
     setRecords(old=>{
       const record=(next.stage==='hired'?undefined:old.poja)||{...defaultEmployeeRecord(qa),jobDescription:next.document};
       const updated={...old,poja:{...record,memories:[...record.memories,{id:crypto.randomUUID(),createdAt:new Date().toISOString(),text:next.stage==='hired'?`Joined the Atlas team as QA Officer after Aemal approved job description version ${next.approvedRevision}.`:`Aemal named me ${next.name}. I report to Samantha and own Atlas quality checks.`}]}};
       try{localStorage.setItem('vibeboard-vision-employees-v1',JSON.stringify(updated));}catch{}return updated;
     });
   }
   return next;
 };
 useEffect(()=>{if(previousPath.current!==path){setExpanded(false);previousPath.current=path;}},[path]);
 const roster=hiringRoster(hiring);
 return <Context.Provider value={{hiring,roster,command,activeLead,records,saveRecord,editDocument:document=>{if(state.current.stage==='draft')commit({...state.current,document,revision:state.current.revision+1});},resetHiring:()=>{commit({...emptyHiring});setRecords(old=>{const next={...old};delete next.poja;try{localStorage.setItem("vibeboard-vision-employees-v1",JSON.stringify(next));}catch{}return next;});},openCall:lead=>{if(activeLead&&activeLead.id!==lead.id){window.dispatchEvent(new CustomEvent('vision-invite-teammate',{detail:lead.id}));}else if(!activeLead)setLead(lead);setExpanded(true);}}}>
 {children}
 <CallDrawer lead={activeLead} expanded={expanded} onExpand={()=>setExpanded(true)} onClose={()=>setExpanded(false)} onEnd={()=>{setLead(null);setExpanded(false);}}/>
 </Context.Provider>;
}
