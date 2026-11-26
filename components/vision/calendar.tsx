"use client";
import { useState } from "react";
import { Card, Tabs } from "@heroui/react";
import { CalendarDays, Clock3, Moon, Sun, ArrowRight, CheckCircle2, MessageSquare } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { VisionSidebar } from "./sidebar";
import { Avatar } from "./workspace";
import { useVision } from "./session";
import { visionMeetings, calendarTime, type VisionMeeting } from "@/lib/vision-calendar";
import "./vision.css";

export function VisionCalendar() {
  const {roster} = useVision();
  const person=(id:string)=>roster.find(p=>p.id===id)!;
  const meetings=visionMeetings.map(m=>m.id==="team-parallel"?{...m,people:roster.map(p=>p.id),messages:m.messages.filter(message=>roster.some(p=>p.id===message.person))}:m).filter(m=>m.people.every(id=>roster.some(p=>p.id===id)));
  const [human,setHuman]=useState(false),[overnight,setOvernight]=useState(false),[selected,setSelected]=useState<VisionMeeting|null>(null);
  return <div className="vision-shell vision-app"><VisionSidebar active="calendar" />
    <main className="vision-main vision-calendar-main">
      <div className="vision-calendar-heading"><div><span className="vision-eyebrow">ATLAS / TEAM CALENDAR</span><h1>Less meeting time. More progress.</h1><p>Design reviews, release checks and handoffs, at agent speed.</p></div><span className="vision-calendar-availability"><span className="vision-dot"/>Available around the clock</span></div>
      <div className="vision-calendar-comparison"><Card><Clock3 size={20}/><div><strong>1 minute</strong><span>Agent review</span></div><ArrowRight size={20}/><div><strong>30 minutes</strong><span>Equivalent human meeting</span></div><p>Illustrative demo comparison, not a measured speed claim.</p></Card><Card><MessageSquare size={20}/><div><strong>{meetings.length} working sessions</strong><span>Clear decisions, shared visuals and named owners</span></div></Card></div>
      <div className="vision-calendar-toolbar"><div><CalendarDays size={20}/><strong>Friday, 23 October</strong><span>Demo schedule</span></div><div className="vision-calendar-switches"><Button className="filter-button" onClick={()=>setOvernight(v=>!v)}>{overnight?<Moon size={16}/>:<Sun size={16}/>} {overnight?"02:00 · Overnight":"09:00 · Morning"}</Button><Tabs selectedKey={human?"human":"agent"} onSelectionChange={key=>setHuman(key==="human")}><Tabs.ListContainer><Tabs.List aria-label="Calendar time scale"><Tabs.Tab id="agent">Agent time<Tabs.Indicator/></Tabs.Tab><Tabs.Tab id="human">Human equivalent<Tabs.Indicator/></Tabs.Tab></Tabs.List></Tabs.ListContainer></Tabs></div></div>
      <p className="vision-calendar-scale">{human?"The same agenda on a human schedule: each working session occupies 30 minutes.":"Every row is one minute. Open a session to see the exchange and its outcome."} {overnight?"Night shift example: the team can coordinate while you are offline.":"The whole team joins alignment while specialist calls continue at the same time."}</p>
      <div className="vision-calendar-scroll"><div className="vision-calendar-grid">
        <div className="vision-calendar-corner">{human?"30 min / row":"1 min / row"}</div>{["Product & engineering","Delivery & quality","Team alignment"].map(name=><div key={name} className="vision-calendar-lane">{name}</div>)}
        {[0,1,2,3].map(minute=><div key={`time${minute}`} className="vision-calendar-time" style={{gridColumn:1,gridRow:minute+2}}>{calendarTime(minute,human,overnight)}</div>)}
        {[0,1,2,3].flatMap(minute=>[0,1,2].map(lane=><div key={`${minute}-${lane}`} className="vision-calendar-cell" style={{gridColumn:lane+2,gridRow:minute+2}}/>))}
        {meetings.map(m=><button key={m.id} className="vision-calendar-event" style={{gridColumn:m.lane+2,gridRow:m.minute+2}} onClick={()=>setSelected(m)}><span className="vision-calendar-event-time">{calendarTime(m.minute,human,overnight)} - {calendarTime(m.minute+1,human,overnight)}<span>{human?"30 min":"60 sec"}</span></span><strong>{m.title}</strong>{m.id==="team-parallel"&&<small className="vision-concurrent-label">Simultaneous calls · {m.people.length} teammates</small>}<span className="vision-calendar-people">{m.people.map(id=><Avatar key={id} lead={person(id)} small/>)}<span>{m.people.map(id=>person(id).name).join(" + ")}</span></span><span className="vision-calendar-event-hint">View exchange <ArrowRight size={13}/></span></button>)}
      </div></div>
      <p className="vision-calendar-footnote">Simulated meetings and messages · AI availability concept · No real meetings or calendar invites are created.</p>
    </main>
    {selected && <Sheet open onOpenChange={open=>{if(!open)setSelected(null)}}><SheetContent className="vision-meeting-drawer"><span className="vision-eyebrow">ATLAS / WORKING SESSION</span><SheetTitle>{selected.title}</SheetTitle><p className="vision-meeting-purpose">{selected.purpose}</p><div className="vision-meeting-meta"><span><Clock3 size={15}/>60 seconds · 30-minute human equivalent</span><span>Simulated exchange</span></div><div className="vision-meeting-participants">{selected.people.map(id=><div key={id}><Avatar lead={person(id)} small/><span><strong>{person(id).name}</strong><small>{person(id).role}</small></span></div>)}</div><div className="vision-meeting-thread">{selected.messages.map((message,i)=><article key={i} className="vision-meeting-message"><Avatar lead={person(message.person)} small/><div><header><strong>{person(message.person).name}</strong><time>+00:{String(message.second).padStart(2,"0")}</time></header><p>{message.text}</p>{message.image&&<figure><img src={`/vision/calendar-${message.image}.svg`} alt={message.caption}/><figcaption>{message.caption} · Demo screenshot</figcaption></figure>}</div></article>)}</div><div className="vision-meeting-outcome"><CheckCircle2 size={20}/><div><strong>Decision & next step</strong><p>{selected.outcome}</p></div></div></SheetContent></Sheet>}
  </div>;
}
