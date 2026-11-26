"use client";
import { useEffect, useState } from 'react';
export function RelativeTime({at}:{at:string}) {
 const [now,setNow]=useState(()=>Date.now());
 useEffect(()=>{const timer=setInterval(()=>setNow(Date.now()),15000);return()=>clearInterval(timer);},[]);
 const date=new Date(at), seconds=Math.max(0,Math.floor((now-date.getTime())/1000));
 if(!Number.isFinite(seconds))return <span>Time unavailable</span>;
 const amount=seconds<3600?Math.floor(seconds/60):seconds<86400?Math.floor(seconds/3600):Math.floor(seconds/86400);
 const unit=seconds<3600?'minute':seconds<86400?'hour':'day';
 const label=seconds<60?'Just now':`${amount} ${unit}${amount===1?'':'s'} ago`;
 const exact=date.toLocaleString(undefined,{dateStyle:'full',timeStyle:'long'});
 return <time dateTime={at} title={exact} aria-label={`${label}. ${exact}`} tabIndex={0}>{label}</time>;
}
