"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Inbox, UsersRound, FileText, Network, LayoutDashboard, Columns3, CircleHelp, CalendarDays, PanelLeftClose, PanelLeftOpen, Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
export function VisionSidebar({ active, onBrief }: { active: "team" | "dashboard" | "kanban" | "calendar" | "job-descriptions" | "employees" | "feedback"; onBrief?: () => void }) {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => { try { const saved = localStorage.getItem("task-ui-sidebar"); setCollapsed(saved ? saved === "collapsed" : window.matchMedia("(max-width: 1000px)").matches); } catch {} }, []);
  const [dark, setDark] = useState(false);
  useEffect(() => setDark(document.documentElement.dataset.theme === "dark"), []);
  return <aside className={`vision-sidebar ${collapsed ? "is-collapsed" : ""}`}>
    <Button className="vision-sidebar-toggle" aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"} title={collapsed ? "Expand sidebar" : "Collapse sidebar"} aria-expanded={!collapsed} onClick={() => { setCollapsed(!collapsed); try { localStorage.setItem("task-ui-sidebar", collapsed ? "expanded" : "collapsed"); } catch {} }}>{collapsed ? <PanelLeftOpen size={18}/> : <PanelLeftClose size={18}/>}</Button>
    <Link href="/vision/team" className="vision-brand" aria-label="SoloTask Vision home"><span className="vision-brand-mark"><Network size={21}/></span><span className="vision-sidebar-brand-text">SoloTask<small>VISION WORKSPACE</small></span></Link>
    <nav aria-label="Vision pages">
      {([{id:"dashboard",name:"Dashboard",icon:LayoutDashboard},{id:"team",name:"Your team",icon:Network},{id:"kanban",name:"Kanban",icon:Columns3},{id:"feedback",name:"Feedback",icon:Inbox},{id:"calendar",name:"Team calendar",icon:CalendarDays},{id:"job-descriptions",name:"Job descriptions",icon:FileText},{id:"employees",name:"AI employees",icon:UsersRound}] as const).map(({id,name,icon:Icon}) => <Link key={id} href={`/vision/${id}`} aria-current={active===id ? "page" : undefined} aria-label={name} title={name}><Icon size={19}/><span>{name}</span></Link>)}
    </nav>
    <div className="vision-sidebar-footer"><span className="vision-demo-label">Presentation demo</span><div>
      {onBrief && <Button aria-label="Project briefing" title="Project briefing" onClick={onBrief}><CircleHelp size={18}/></Button>}
      <Button aria-label={dark ? "Switch to light theme" : "Switch to dark theme"} title="Switch theme" onClick={() => {const next=!dark;setDark(next);document.documentElement.dataset.theme=next?"dark":"light";localStorage.setItem("task-ui-theme",next?"dark":"light");}}>{dark?<Sun size={18}/>:<Moon size={18}/>}</Button>
    </div></div>
  </aside>;
}
