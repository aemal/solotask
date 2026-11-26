"use client";
import { Card, Popover } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AgentStatus } from "@/components/agent-status";
import type { AgentActivity } from "@/lib/agent-activity-model";
import { ProgressChange } from "@/components/progress-change";
import type { ProgressSample } from "@/lib/progress-history";
import { useEffect, useState } from "react";
import { Folder, Search, Plus, Pin, ArrowUpRight, LayoutGrid, ChevronsUpDown, Check, X, Activity, FileText } from "lucide-react";
import type { Project } from "@/lib/projects";
import type { ActivityEvent, ProjectPulse } from "@/lib/activity-model";
import { activityTime } from "@/lib/activity-model";
import { StatusIcon } from "@/components/task-icons";
export type ProjectSummary = Project & {
  pulse?: ProjectPulse;
  agentActivity?: AgentActivity;
  progressHistory?: ProgressSample[];
  summary?: { total: number; completed: number; percent: number; counts: Record<string, number> };
  latest?: ActivityEvent | null;
  error?: string;
  warning?: string;
  latestAvailable?: boolean;
};
export function useProjects(watch: boolean, cockpit = false) {
  const [items, setItems] = useState<ProjectSummary[]>([]);
  const [error, setError] = useState("");
  async function refresh() {
    try {
      const response = await fetch("/api/projects", { cache: "no-store" });
      const data = await response.json();
      if (!response.ok) throw Error(data.error);
      setItems(data.projects);
      setError("");
    } catch (e) { setError(e instanceof Error ? e.message : "Could not load projects."); }
  }
  useEffect(() => {
    refresh();
    if (!watch) return;
    const timer = setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, cockpit ? 10000 : 60000);
    return () => clearInterval(timer);
  }, [watch, cockpit]);
  async function pin(project: ProjectSummary) {
    const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "pin", id: project.id, pinned: !project.pinned }) });
    if (!response.ok) { setError("Could not update pinned projects."); return; }
    await refresh();
  }
  return { items, error, refresh, pin };
}
export function ProjectSwitcher({ items, active, choose, cockpit, create, refresh, pin }: {
  items: ProjectSummary[]; active: string; choose: (id: string) => void; cockpit: () => void;
  create: () => void;
  refresh: () => Promise<void>; pin: (project: ProjectSummary) => Promise<void>;
}) {
  const [expanded, setExpanded] = useState(false), [query, setQuery] = useState(""), [adding, setAdding] = useState(false), [root, setRoot] = useState(""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const current = items.find(p => p.id === active) || items[0];
  const [recent, setRecent] = useState<string[]>([]);
  useEffect(() => { try { setRecent(JSON.parse(localStorage.getItem("vibeboard-recent") || "[]")); } catch {} }, [active]);
  const rank = (id: string) => recent.includes(id) ? recent.indexOf(id) : Number.MAX_SAFE_INTEGER;
  const matches = items.filter(p => `${p.name} ${p.root}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || rank(a.id) - rank(b.id) || a.name.localeCompare(b.name));
  function select(id: string) { choose(id); setExpanded(false); setQuery(""); }
  return (
    <div className="project-picker">
      <Popover isOpen={expanded} onOpenChange={setExpanded}>
      <Button className="project-switch" title="Switch project" aria-label="Switch project" aria-expanded={expanded}>
        <span className="project-avatar"><Folder size={16} /></span>
        <span className="project-switch-label"><strong>{current?.name || "Projects"}</strong><small>Project workspace</small></span>
        <ChevronsUpDown size={15} />
      </Button>
      <Popover.Content className="project-switcher-popover" placement="right top" offset={12}>
        <Popover.Dialog className="project-menu" aria-label="Project switcher">
          <div className="project-menu-heading"><div><strong>Switch workspace</strong><small>{items.length} projects on this computer</small></div><Button className="icon-button" aria-label="Close project switcher" onClick={() => setExpanded(false)}><X size={15} /></Button></div>
          <label className="search project-search"><Search size={15} /><Input type="search" id="vibeboard-project-picker-filter-v2" name="vibeboard-project-picker-filter-v2" autoComplete="off" data-1p-ignore data-lpignore="true" data-bwignore="true" data-form-type="other" autoFocus aria-label="Search projects" placeholder="Search projects…" value={query} onChange={e => setQuery(e.target.value)} /></label>
          <Button className="project-menu-action" onClick={() => { cockpit(); setExpanded(false); }}><LayoutGrid size={16} />All projects<ArrowUpRight size={14} /></Button>
          <div className="project-menu-list">
            {matches.map(project => <div className={`project-menu-row ${project.id === active ? "active" : ""}`} key={project.id}>
              <Button className="project-option" aria-current={project.id === active ? "true" : undefined} onClick={() => select(project.id)}><span className="project-option-avatar"><Folder size={17} /></span><span className="project-option-label"><strong>{project.name}</strong><small title={project.root}>{project.root.split(/[\\/]/).filter(Boolean).slice(-2).join(" / ")}</small></span>{project.id === active && <Check className="project-option-check" size={16} />}</Button>
              <Button className="icon-button" aria-label={`${project.pinned ? "Unpin" : "Pin"} ${project.name}`} aria-pressed={project.pinned} onClick={() => pin(project)}><Pin size={13} /></Button>
            </div>)}
            {!matches.length && <p className="project-message">No matching projects.</p>}
          </div>
          <div className="project-menu-footer"><Button className="project-menu-action" onClick={() => { create(); setExpanded(false); }}><FileText size={16} />New project from PRD</Button>
          <Button className="project-menu-action" onClick={() => setAdding(!adding)}><Plus size={16} />Add existing folder</Button></div>
          {adding && <form className="project-add" onSubmit={async e => {
            e.preventDefault(); setBusy(true); setError("");
            try {
              const response = await fetch("/api/projects", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ root }) });
              const data = await response.json();
              if (!response.ok) throw Error(data.error);
              await refresh();
              setRoot(""); setAdding(false);
              if (data.addedId) select(data.addedId);
            } catch (e) { setError(e instanceof Error ? e.message : "Could not add project."); }
            finally { setBusy(false); }
          }}>
            <label htmlFor="project-folder">Local project folder</label>
            <Input id="project-folder" placeholder="/Users/you/projects/my-project" value={root} onChange={e => setRoot(e.target.value)} required />
            <small>Paste the full folder path. Task files stay in that folder.</small>
            {error && <p role="alert">{error}</p>}
            <Button type="submit" className="filter-button" disabled={busy}>{busy ? "Adding…" : "Add project"}</Button>
          </form>}
        </Popover.Dialog>
      </Popover.Content>
      </Popover>
    </div>
  );
}
export function ProjectCockpit({ items, error, choose, pin, create, onActivity }: { onActivity: (id: string) => void; items: ProjectSummary[]; error: string; choose: (id: string, taskKey?: string) => void; pin: (project: ProjectSummary) => Promise<void>; create: () => void }) {
  const [query, setQuery] = useState("");
  const shown = items.filter(p => `${p.name} ${p.root}`.toLowerCase().includes(query.toLowerCase())).sort((a, b) => Number(b.pinned) - Number(a.pinned) || a.name.localeCompare(b.name));
  return <div className="view-stack">
    <div className="cockpit-heading"><p>{items.length} local {items.length === 1 ? "project" : "projects"}</p><div className="cockpit-actions"><label className="search"><Search size={16} /><Input type="search" id="vibeboard-cockpit-filter-v2" name="vibeboard-cockpit-filter-v2" autoComplete="off" data-1p-ignore data-lpignore="true" data-bwignore="true" data-form-type="other" aria-label="Search cockpit projects" placeholder="Search projects…" value={query} onChange={e => setQuery(e.target.value)} /></label><Button className="primary-button" onClick={create}><Plus size={15} />New project</Button></div></div>
    {error && <div role="alert" className="notice">{error}</div>}
    <div className="project-grid">{shown.map(project => <Card className="overview-panel project-card" key={project.id}>
      <div className="overview-heading"><h2><Folder size={17} />{project.name}</h2><Button className="icon-button" aria-label={`${project.pinned ? "Unpin" : "Pin"} ${project.name}`} aria-pressed={project.pinned} onClick={() => pin(project)}><Pin size={15} /></Button></div>
      <p className="project-path" title={project.root}>{project.root}</p>
      {project.error ? <p className="notice">{project.error}</p> : <>
        <div className="project-progress"><strong>{project.summary?.percent || 0}%</strong><span>{project.summary?.completed || 0}/{project.summary?.total || 0} complete</span></div>
        <ProgressChange history={project.progressHistory} interrupted={!!project.warning} />
        <div className="meter"><i style={{ width: `${project.summary?.percent || 0}%` }} /></div>
        <div className="project-stats">
          <span><StatusIcon status="in-progress" size={14} /><strong>{project.summary?.counts["in-progress"] || 0}</strong>in progress</span>
          <span><StatusIcon status="review" size={14} /><strong>{project.summary?.counts.review || 0}</strong>in review</span>
          <span><StatusIcon status="blocked" size={14} /><strong>{project.summary?.counts.blocked || 0}</strong>blocked</span>
        </div>
        <AgentStatus activity={project.agentActivity} />
        <ProjectPulseBar project={project} details={() => onActivity(project.id)} />
        <div className="project-latest"><Activity size={14} />{project.latest ? <Button className="project-task-link" disabled={!project.latestAvailable} onClick={() => choose(project.id, project.latest!.taskKey)}>#{project.latest.taskId} {project.latest.title}<small>{new Date(activityTime(project.latest)).toLocaleString()}</small></Button> : <span>Listening for task changes</span>}</div>
        {project.warning && <p className="notice">{project.warning}</p>}
      </>}
      <Button className="filter-button" onClick={() => choose(project.id)}>Open project<ArrowUpRight size={14} /></Button>
    </Card>)}</div>
    {!shown.length && <div className="empty">{items.length ? "No matching projects" : "Loading projects…"}</div>}
  </div>;
}

function ProjectPulseBar({ project, details }: { project: ProjectSummary; details: () => void }) {
  const pulse = project.pulse;
  const peak = Math.max(1, ...(pulse?.bins || []));
  return <section className="project-pulse" aria-label={`${project.name} system pulse`}>
    <div className="project-pulse-heading"><strong><Activity size={14} />System pulse</strong><small>{pulse?.warning || project.warning ? "Observation interrupted" : pulse?.recentCount ? "Recent activity" : "Quiet"}</small></div>
    <svg viewBox="0 0 400 34" preserveAspectRatio="none" role="img" aria-label={`${pulse?.count || 0} task changes in the last hour, oldest on the left`}>
      {(pulse?.bins || Array.from({ length: 40 }, () => 0)).map((count, index) => { const height = count ? 5 + 27 * count / peak : 2; return <rect key={index} x={index * 10} y={(34 - height) / 2} width="5" height={height} rx="2" fill={count ? "var(--accent)" : "var(--border)"}><title>{count} changes · {Math.round((40 - index) * 1.5)} min ago</title></rect>; })}
    </svg>
    <div className="project-pulse-footer"><small>{pulse?.count || 0} changes · last hour</small><Button className="text-button" onClick={details}>View activity<ArrowUpRight size={12} /></Button></div>
    <small className="metric-caption">Observed task changes · not an agent health check</small>
  </section>;
}
