"use client";
import {useCallback,useEffect,useRef,useState} from 'react';
import type {FeedbackRound,FeedbackTicket} from '@/lib/vision-feedback-types';
export function selectFeedbackRound(roundId:string){
 sessionStorage.setItem('vision-feedback-selected-round',roundId);
 window.dispatchEvent(new CustomEvent('vision-feedback-selected',{detail:{roundId}}));
}
export function useFeedbackData(){
 const [data,setData]=useState<{rounds:FeedbackRound[];tickets:FeedbackTicket[]}>({rounds:[],tickets:[]});
 const [error,setError]=useState(''),[loading,setLoading]=useState(true);const inFlight=useRef(false);
 const refresh=useCallback(async()=>{if(inFlight.current)return;inFlight.current=true;try{const response=await fetch('/api/vision-feedback',{cache:'no-store'});if(!response.ok)throw Error('Could not load feedback. Check the local server and retry.');setData(await response.json());setError('');}catch(e){setError(e instanceof Error?e.message:'Could not load feedback.');}finally{inFlight.current=false;setLoading(false);}},[]);
 const active=data.tickets.some(t=>t.scheduledAt&&t.status==='open');
 useEffect(()=>{void refresh();const timer=setInterval(()=>{if(!document.hidden)void refresh();},active?1000:5000);return()=>clearInterval(timer);},[refresh,active]);
 const update=async(body:Record<string,unknown>)=>{const response=await fetch('/api/vision-feedback',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});const result=await response.json();if(!response.ok)throw Error(result.error||'Could not save feedback.');await refresh();return result;};
 return {...data,error,loading,refresh,update};
}
