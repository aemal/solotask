"use client";
import { TaskComments } from "@/components/task-comments";
import { TaskActions, NewTask } from "@/components/task-actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ProjectSwitcher, ProjectCockpit, useProjects } from "@/components/projects";
import dynamic from "next/dynamic";
const PrdWorkspace = dynamic(() => import("@/components/prd-workspace"), { ssr: false });
const ProjectSettings = dynamic(() => import("@/components/project-settings"), { ssr: false });
import OwnerQuestions from "@/components/owner-questions";
import {
  ArrowUpRight,
  Circle,
  Clock3,
  Folder,
  LayoutGrid,
  ListChecks,
  RefreshCw,
  Search,
  ShieldCheck,
  Layers,
  ChevronRight,
  Link2,
  AlertCircle,
  Gauge,
  KanbanSquare,
  List,
  Milestone,
  Play,
  GitBranch,
  Tags,
  Braces,
  Flag,
  SlidersHorizontal,
  X,
  FileJson,
  AlignLeft,
  FlaskConical,
  Code2,
  Check,
  CheckCheck,
  PanelLeftClose,
  PanelLeftOpen,
  Activity,
  Sparkles,
  Info,
  Settings,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { FilterSelect } from "@/components/ui/select";
import { PriorityIcon, StatusIcon } from "@/components/task-icons";
import { isComplete, progress, type Task } from "@/lib/task-model";
import ActivityLog from "@/components/activity";
import type { ActivityFeed } from "@/lib/activity-model";
import TimingView, { TaskTime, TimeBadge } from "@/components/timing";
import ThemeToggle from "@/components/theme-toggle";
import Dashboard from "@/components/dashboard";
import { TaskViews } from "@/components/task-views";
import {
  flatten,
  filterTasks,
  dependencies,
  milestone,
  dependents,
  isReady,
} from "@/lib/views";
type Data = {
  activity?: ActivityFeed;
  currentTag: string | null;
  project: string;
  root: string;
  tasks: Task[];
  files: string[];
  warnings: string[];
  updatedAt: string | null;
};
const views = [
  { id: "cockpit", label: "All projects", icon: Folder },
  { id: "create", label: "New project", icon: Sparkles },
  { id: "dashboard", label: "Overview", icon: LayoutGrid },
  { id: "questions", label: "Agent Questions", icon: ListChecks },
  { id: "board", label: "Board", icon: KanbanSquare },
  { id: "list", label: "Tasks", icon: List },
  { id: "milestones", label: "Milestones", icon: Milestone },
  { id: "next", label: "Up next", icon: Play },
  { id: "progress", label: "Dependencies", icon: GitBranch },
  { id: "complexity", label: "Complexity", icon: Gauge },
  { id: "tags", label: "Tags", icon: Tags },
  { id: "timing", label: "Time & estimates", icon: Clock3 },
  { id: "activity", label: "Activity", icon: Activity },
  { id: "json", label: "Source", icon: Braces },
  { id: "settings", label: "Project settings", icon: Settings },
];
function Meter({ value }: { value: number }) {
  return (
    <div
      className="meter"
      data-complete={value === 100 || undefined}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Task progress"
    >
      <i style={{ width: `${value}%` }} />
    </div>
  );
}
function Disclosure({
  title,
  icon: Icon,
  count,
  children,
  open = false,
}: {
  title: string;
  icon: typeof List;
  count?: number;
  children: ReactNode;
  open?: boolean;
}) {
  return (
    <details className="drawer-disclosure" open={open || undefined}>
      <summary>
        <Icon size={16} />
        <span>{title}</span>
        {count !== undefined && <span className="count">{count}</span>}
        <ChevronRight size={14} className="disclosure-chevron" />
      </summary>
      <div className="disclosure-body">{children}</div>
    </details>
  );
}
function Subtasks({
  tasks,
  open,
}: {
  tasks: Task[];
  open: (key: string) => void;
}) {
  return (
    <div className="subtasks">
      {tasks.map((t) => (
        <div key={t.key} className="subtask">
          <Button className="subtask-top" onClick={() => open(t.key)}>
            <StatusIcon status={t.status} />
            <span className="task-id">#{t.id}</span>
            <strong>{t.title}</strong>
            <ArrowUpRight size={14} />
          </Button>
          <Meter value={progress(t)} />
          {!!t.subtasks.length && <Subtasks tasks={t.subtasks} open={open} />}
        </div>
      ))}
    </div>
  );
}
export default function Board() {
  const [collapsed, setCollapsed] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem("task-ui-sidebar") === "collapsed");
    } catch {}
  }, []);
  function toggleSidebar() {
    setCollapsed((value) => {
      try {
        localStorage.setItem(
          "task-ui-sidebar",
          value ? "expanded" : "collapsed",
        );
      } catch {}
      return !value;
    });
  }
  const [milestoneFilter, setMilestoneFilter] = useState("all"),
    [source, setSource] = useState("all"),
    [moreFilters, setMoreFilters] = useState(false);
  const [view, setView] = useState("dashboard"),
    [status, setStatus] = useState("all"),
    [readiness, setReadiness] = useState("all"),
    [showSubtasks, setShowSubtasks] = useState(false),
    [compact, setCompact] = useState(true),
    [watch, setWatch] = useState(true);
  const [navigationReady, setNavigationReady] = useState(false);
  useEffect(() => {
    const restore = () => {
      const params = new URL(window.location.href).searchParams;
      const requested = params.get("view");
      setView(views.some(item => item.id === requested) ? requested! : "dashboard");
      const linkedProject = params.get("project");
      if (linkedProject) setProjectId(linkedProject);
      setSelectedState(params.get("task"));
    };
    restore(); setNavigationReady(true); window.addEventListener("popstate", restore);
    return () => window.removeEventListener("popstate", restore);
  }, []);
  useEffect(() => {
    if (!navigationReady) return;
    const url = new URL(window.location.href);
    if ((url.searchParams.get("view") || "dashboard") === view) return;
    url.searchParams.set("view", view); window.history.pushState({}, "", url);
  }, [view, navigationReady]);
  const projects = useProjects(watch && !["settings", "create", "questions"].includes(view), view === "cockpit");
  const [visitedCreate, setVisitedCreate] = useState(false);
  const [setupProject, setSetupProject] = useState<{ id: string; root: string } | null>(null);
  useEffect(() => { if (view === "create") setVisitedCreate(true); }, [view]);
  const editingDocuments = ["settings", "create", "questions", "cockpit"].includes(view);
  const [projectId, setProjectId] = useState("");
  const [questionCount, setQuestionCount] = useState<number | null>(null);
  useEffect(() => {
    setQuestionCount(null);
    if (!projectId) return;
    const abort = new AbortController();
    async function poll() {
      try { const response = await fetch(`/api/questions?project=${encodeURIComponent(projectId)}`, { cache: "no-store", signal: abort.signal }); const data = await response.json(); if (response.ok && !abort.signal.aborted) setQuestionCount(data.questions.filter((q: { status: string }) => q.status === "pending").length); } catch {}
    }
    void poll(); const timer = watch ? setInterval(() => { if (document.visibilityState === "visible") void poll(); }, 10000) : undefined;
    return () => { abort.abort(); clearInterval(timer); };
  }, [projectId, watch, view]);
  const requestVersion = useRef(0);
  const taskRequest = useRef<AbortController | null>(null);
  const pendingTask = useRef<string | null>(null);
  useEffect(() => {
    if (!projects.items.length || projectId) return;
    let saved = "";
    try { saved = localStorage.getItem("vibeboard-project") || ""; } catch {}
    const linked = new URL(window.location.href).searchParams.get("project");
    setProjectId(linked || (projects.items.some(p => p.id === saved) ? saved : projects.items[0].id));
  }, [projects.items, projectId]);
  const [data, setData] = useState<Data | null>(null),
    [error, setError] = useState(""),
    [query, setQuery] = useState(""),
    [tag, setTag] = useState("current"),
    [priority, setPriority] = useState("all"),
    [selected, setSelectedState] = useState<string | null>(null),
    [refreshing, setRefreshing] = useState(false),
    [lastSync, setLastSync] = useState("");
  function setSelected(key: string | null) {
    setSelectedState(key);
    const url = new URL(window.location.href);
    if (projectId) url.searchParams.set("project", projectId);
    if (key) {
      url.searchParams.set("task", key);
      url.searchParams.set("ticket", flatten(data?.tasks || []).find(r => r.task.key === key)?.id || key.split(":").at(-1)!);
    } else {
      url.searchParams.delete("task");
      url.searchParams.delete("ticket");
    }
    if (url.href !== window.location.href) window.history.pushState({}, "", url);
  }
  async function refresh() {
    if (!projectId || taskRequest.current) return;
    const controller = new AbortController(); taskRequest.current = controller;
    const version = ++requestVersion.current;
    setRefreshing(true);
    try {
      const response = await fetch(`/api/tasks?project=${encodeURIComponent(projectId)}${["dashboard", "activity"].includes(view) ? "&history=full" : ""}`, { cache: "no-store", signal: controller.signal });
      const value = await response.json();
      if (version !== requestVersion.current) return;
      if (!response.ok) throw Error(value.error);
      setData(value);
      if (pendingTask.current) { setSelected(pendingTask.current); pendingTask.current = null; }
      setError("");
      setLastSync(new Date().toLocaleTimeString());
    } catch (e) {
      if (version !== requestVersion.current) return;
      setError(e instanceof Error ? e.message : "Unable to refresh");
    } finally {
      if (taskRequest.current === controller) taskRequest.current = null;
      if (version === requestVersion.current) setRefreshing(false);
    }
  }
  useEffect(() => {
    if (editingDocuments) return;
    void refresh();
    const timer = watch ? setInterval(() => { if (document.visibilityState === "visible") void refresh(); }, 3000) : undefined;
    return () => { clearInterval(timer); requestVersion.current++; taskRequest.current?.abort(); taskRequest.current = null; setRefreshing(false); };
  }, [watch, projectId, editingDocuments, view]);
  function chooseProject(id: string, taskKey?: string) {
    if (id === projectId) { setView("dashboard"); if (taskKey) setSelected(taskKey); return; }
    pendingTask.current = taskKey || null;
    requestVersion.current++;
    setProjectId(id); setData(null); setError(""); setSelectedState(null);
    const url = new URL(window.location.href);
    url.searchParams.set("project", id);
    url.searchParams.delete("task"); url.searchParams.delete("ticket");
    window.history.pushState({}, "", url);
    setTag("current"); clear(); setView("dashboard"); setLastSync("");
    try {
      localStorage.setItem("vibeboard-project", id);
      const previous: string[] = JSON.parse(localStorage.getItem("vibeboard-recent") || "[]");
      localStorage.setItem("vibeboard-recent", JSON.stringify([id, ...previous.filter(p => p !== id)].slice(0, 10)));
    } catch {}
  }
  const tasks = data?.tasks || [],
    tags = [...new Set(tasks.map((t) => t.tag))],
    rows = flatten(tasks);
  const visible = filterTasks(
    tasks,
    {
      tag: tag === "current" ? data?.currentTag || tags[0] || "all" : tag,
      priority,
      status,
      readiness,
      query,
      milestone: milestoneFilter,
      source,
    },
    rows,
  );
  const row = rows.find((r) => r.task.key === selected),
    task = row?.task,
    currentView = views.find((v) => v.id === view)!;
  const statuses = [
    ...new Set([
      "pending",
      "in-progress",
      "review",
      "done",
      "blocked",
      "deferred",
      "cancelled",
      ...tasks.map((t) => t.status),
    ]),
  ];
  const options = (values: string[]) =>
    values.map((value) => ({ value, label: value }));
  const filterCount = [
    status !== "all",
    priority !== "all",
    readiness !== "all",
    milestoneFilter !== "all",
    source !== "all",
    !!query,
  ].filter(Boolean).length;
  function clear() {
    setStatus("all");
    setPriority("all");
    setReadiness("all");
    setMilestoneFilter("all");
    setSource("all");
    setQuery("");
  }
  return (
    <div className={`shell ${collapsed ? "sidebar-collapsed" : ""}`}>
      <aside>
        <div
          className="brand"
          title="SoloTask — See what your agents are building."
        >
          <span className="brand-icon">
            <CheckCheck size={20} />
          </span>
          <span className="brand-label">
            <span className="brand-name">SoloTask</span>
            <span className="brand-tagline">
              See what your agents are building.
            </span>
          </span>
        </div>
        <ProjectSwitcher items={projects.items} active={projectId} choose={chooseProject} cockpit={() => setView("cockpit")} create={() => setView("create")} refresh={projects.refresh} pin={projects.pin} />
        <div className="workspace-label">WORKSPACE</div>
        <nav aria-label="Views">
          {views.map(({ id, label, icon: Icon }) => (
            <Button
              key={id}
              className={`nav ${view === id ? "active" : ""}`}
              title={label}
              aria-label={label}
              onClick={() => { if (id === "create") setSetupProject(null); setView(id); }}
              aria-current={view === id ? "page" : undefined}
            >
              <Icon size={17} />
              <span>{label}</span>
              {id === "questions" && questionCount !== null && <span className="nav-count" aria-label={`${questionCount} unanswered questions`}>{questionCount}</span>}
              {id === "list" && (
                <span className="nav-count">{tasks.length}</span>
              )}
            </Button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <a href="/about" title="About SoloTask"><Info size={15} /><span>About SoloTask</span></a>
        </div>
      </aside>
      <main>
        <header>
          <div className="breadcrumbs">
            <Button
              className="icon-button sidebar-toggle"
              onClick={toggleSidebar}
              aria-expanded={!collapsed}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {collapsed ? (
                <PanelLeftOpen size={18} />
              ) : (
                <PanelLeftClose size={18} />
              )}
            </Button>
            <Folder size={14} />
            <span>{data?.project || "Workspace"}</span>
            <ChevronRight size={13} />
            <strong>{currentView.label}</strong>
          </div>
          <div className="header-actions">
            <ThemeToggle />
            <Button
              className={`live watch-toggle ${watch ? "" : "paused"}`}
              onClick={() => setWatch(!watch)}
              aria-pressed={watch}
              title={watch ? "Pause live updates" : "Resume live updates"}
            >
              <i />
              {watch ? "Live" : "Paused"}
            </Button>
            <Button
              className="icon-button"
              aria-label="Refresh tasks"
              title="Refresh tasks"
              onClick={() => { refresh(); projects.refresh(); }}
              disabled={refreshing}
            >
              <RefreshCw size={16} className={refreshing ? "spin" : ""} />
            </Button>
          </div>
        </header>
        <div className="content">
          <div className="page-heading">
            <h1>
              <currentView.icon size={23} />
              {currentView.label}
              {!["create", "questions", "settings"].includes(view) && <span className="count">{view === "cockpit" ? projects.items.length : visible.length}</span>}
            </h1>
            {!["cockpit", "create", "questions", "settings"].includes(view) && <div className="heading-actions">
              <NewTask tasks={tasks} projectId={projectId} onSaved={() => { void refresh(); projects.refresh(); }} />
              <FilterSelect
                label="Tag"
                icon={Tags}
                value={tag}
                onValueChange={setTag}
                options={[
                  {
                    value: "current",
                    label: data?.currentTag || tags[0] || "Current tag",
                  },
                  { value: "all", label: "All tags" },
                  ...options(tags),
                ]}
              />
            </div>}
          </div>
          {(error || (!projectId && projects.error)) && (
            <div className="notice" role="alert">
              <AlertCircle size={16} />
              {error || projects.error}
            </div>
          )}
          {data?.warnings.map((w) => (
            <div className="notice" key={w}>
              <AlertCircle size={16} />
              {w}
            </div>
          ))}
          {!["cockpit", "create", "questions", "settings"].includes(view) && <div className="toolbar">
            <label className="search">
              <Search size={16} />
              <Input
                type="search"
                id="vibeboard-task-filter-v2" name="vibeboard-task-filter-v2"
                autoComplete="off"
                data-1p-ignore
                data-lpignore="true" data-bwignore="true" data-form-type="other"
                aria-label="Search tasks"
                placeholder="Search tasks…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
              {query && (
                <Button
                  className="icon-button"
                  aria-label="Clear search"
                  onClick={() => setQuery("")}
                >
                  <X size={13} />
                </Button>
              )}
            </label>
            <div
              className={`filters ${view === "activity" ? "activity-task-filters" : ""}`}
            >
              <FilterSelect
                label="Status"
                icon={Circle}
                value={status}
                onValueChange={setStatus}
                options={[
                  { value: "all", label: "Status" },
                  ...options(statuses),
                ]}
              />
              <FilterSelect
                label="Priority"
                icon={Flag}
                value={priority}
                onValueChange={setPriority}
                options={[
                  { value: "all", label: "Priority" },
                  ...options(["critical", "high", "medium", "low"]),
                ]}
              />
              <Button
                className={`filter-button ${moreFilters ? "active" : ""}`}
                onClick={() => setMoreFilters(!moreFilters)}
                aria-expanded={moreFilters}
                aria-controls="advanced-filters"
              >
                <SlidersHorizontal size={15} />
                <span>Filters</span>
                {filterCount > 0 && (
                  <span className="count">{filterCount}</span>
                )}
              </Button>
              {filterCount > 0 && (
                <Button
                  className="icon-button"
                  title="Reset filters"
                  aria-label="Reset filters"
                  onClick={clear}
                >
                  <X size={15} />
                </Button>
              )}
            </div>
          </div>}
          {moreFilters && !["cockpit", "create", "questions", "settings"].includes(view) && (
            <div id="advanced-filters" className="advanced-filters">
              <FilterSelect
                label="Milestone"
                icon={Milestone}
                value={milestoneFilter}
                onValueChange={setMilestoneFilter}
                options={[
                  { value: "all", label: "All milestones" },
                  ...options([...new Set(tasks.map(milestone))]),
                ]}
              />
              <FilterSelect
                label="Source file"
                icon={FileJson}
                value={source}
                onValueChange={setSource}
                options={[
                  { value: "all", label: "All files" },
                  ...options([...new Set(tasks.map((t) => t.source))]),
                ]}
              />
              <FilterSelect
                label="Dependencies"
                icon={GitBranch}
                value={readiness}
                onValueChange={setReadiness}
                options={[
                  { value: "all", label: "All dependencies" },
                  { value: "ready", label: "Ready" },
                  { value: "blocked", label: "Blocked" },
                  { value: "blocking", label: "Blocking others" },
                ]}
              />
              <Button
                className="text-button"
                onClick={() => {
                  clear();
                  setTag("all");
                }}
              >
                Reset all
              </Button>
            </div>
          )}
          {[
            "board",
            "list",
            "milestones",
            "complexity",
            "tags",
            "progress",
          ].includes(view) && (
            <div className="display-options">
              <Button
                aria-pressed={showSubtasks}
                className={showSubtasks ? "selected" : ""}
                onClick={() => setShowSubtasks(!showSubtasks)}
              >
                <ListChecks size={14} />
                <span>Subtasks</span>
                {showSubtasks && <Check size={12} />}
              </Button>
              {view !== "board" && (
                <Button
                  aria-pressed={compact}
                  className={compact ? "selected" : ""}
                  onClick={() => setCompact(!compact)}
                >
                  <AlignLeft size={14} />
                  <span>Compact</span>
                </Button>
              )}
              <span>{visible.length} tasks</span>
            </div>
          )}
          {data && !data.tasks.length && !["create", "cockpit", "settings", "questions"].includes(view) && <section className="project-setup-callout"><h2>This project has no task plan yet</h2><p>Review or import a PRD, then generate tasks for this folder. Your existing project files stay in place.</p><Button className="primary-button" onClick={() => { setSetupProject({ id: projectId, root: data.root }); setView("create"); }}>Set up Task Master & generate tasks</Button></section>}
          <div hidden={view !== "create"}>{visitedCreate && <PrdWorkspace initialProject={setupProject} onBack={() => setView("cockpit")} active={view === "create"} onOpen={(id) => { projects.refresh(); chooseProject(id); }} />}</div>
          {view === "create" ? null : view === "cockpit" ? (
            <ProjectCockpit onActivity={id => { chooseProject(id); setView("activity"); }} items={projects.items} error={projects.error} choose={chooseProject} pin={projects.pin} create={() => setView("create")} />
          ) : view === "settings" ? (
            <ProjectSettings key={projectId} projectId={projectId} />
          ) : view === "questions" ? (
            <OwnerQuestions key={projectId} projectId={projectId} onPendingChange={setQuestionCount} />
          ) : !data && !error ? (
            <div className="empty">
              <RefreshCw className="spin" size={22} />
              Loading tasks
            </div>
          ) : view === "activity" ? (
            <ActivityLog
              feed={data?.activity}
              tag={
                tag === "current" ? data?.currentTag || tags[0] || "all" : tag
              }
              query={query}
              currentKeys={new Set(rows.map((r) => r.task.key))}
              open={setSelected}
            />
          ) : tasks.length === 0 ? (
            <div className="empty">
              <Layers size={28} />
              <h2>No tasks yet</h2>
              <code>.taskmaster/tasks/tasks.json</code>
            </div>
          ) : view === "timing" ? (
            <TimingView tasks={visible} open={setSelected} />
          ) : view === "dashboard" ? (
            <Dashboard
              tasks={visible}
              allTasks={tasks}
              files={data?.files || []}
              activity={data?.activity}
              activityTag={tag === "current" ? data?.currentTag || tags[0] || "all" : tag}
              activityQuery={query}
              viewActivity={() => setView("activity")}
              open={setSelected}
            />
          ) : view !== "board" ? (
            <TaskViews
              view={view}
              tasks={visible}
              allTasks={tasks}
              subtasks={showSubtasks}
              compact={compact}
              open={setSelected}
            />
          ) : (
            <div className="kanban">
              {statuses
                .filter(
                  (s) =>
                    ["pending", "in-progress", "review", "done"].includes(s) ||
                    visible.some((t) => t.status === s),
                )
                .map((s) => (
                  <section className="column" key={s}>
                    <div className="column-heading">
                      <StatusIcon status={s} />
                      <h2>
                        {s === "pending"
                          ? "To do"
                          : s === "in-progress"
                            ? "In progress"
                            : s.charAt(0).toUpperCase() + s.slice(1)}
                      </h2>
                      <span className="count">
                        {visible.filter((t) => t.status === s).length}
                      </span>
                    </div>
                    <div className="cards">
                      {visible
                        .filter((t) => t.status === s)
                        .map((t) => {
                          const r = rows.find((r) => r.task.key === t.key)!,
                            blocked = dependencies(r, rows).filter(
                              (d) => !d.satisfied,
                            ).length;
                          return (
                            <div className="card-wrapper" key={t.key}>
                              <Button
                                className="task-card"
                                onClick={() => setSelected(t.key)}
                              >
                                <div className="card-top">
                                  <span className="task-id">#{t.id}</span>
                                  <span
                                    className={`priority ${t.priority}`}
                                    title={`${t.priority} priority`}
                                  >
                                    <PriorityIcon priority={t.priority} />
                                  </span>
                                </div>
                                <h3>{t.title}</h3>
                                <div className="card-badges">
                                  <TimeBadge task={t} />
                                  <span className="tag">
                                    <Tags size={11} />
                                    {t.tag}
                                  </span>
                                  {t.complexity !== null && (
                                    <span
                                      className="compact-metric"
                                      title="Complexity"
                                    >
                                      <Gauge size={13} />
                                      {t.complexity}
                                    </span>
                                  )}
                                </div>
                                {!!t.subtasks.length && (
                                  <Meter value={progress(t)} />
                                )}
                                <div className="card-footer">
                                  <span title="Completed subtasks">
                                    <ListChecks size={13} />
                                    {
                                      t.subtasks.filter((s) =>
                                        isComplete(s.status),
                                      ).length
                                    }
                                    /{t.subtasks.length}
                                  </span>
                                  <span
                                    title={
                                      blocked
                                        ? "Unfinished dependencies"
                                        : "Ready"
                                    }
                                  >
                                    {blocked ? (
                                      <>
                                        <Link2 size={13} />
                                        {blocked}
                                      </>
                                    ) : isReady(r, rows) ? (
                                      <Play size={12} />
                                    ) : (
                                      <StatusIcon status={t.status} size={13} />
                                    )}
                                  </span>
                                  <ArrowUpRight size={14} />
                                </div>
                              </Button>
                              {showSubtasks && !!t.subtasks.length && (
                                <div className="card-children">
                                  <Subtasks
                                    tasks={t.subtasks}
                                    open={setSelected}
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      {!visible.some((t) => t.status === s) && (
                        <div className="lane-empty">No tasks</div>
                      )}
                    </div>
                  </section>
                ))}
            </div>
          )}
          <footer>
            <span>
              <FileJson size={12} />
              {data?.files.length || 0} files
              <ShieldCheck size={12} />
              {view === "create" ? "Local project setup" : view === "settings" ? "Project Markdown files" : view === "questions" ? "Replies saved locally" : "Local task files"}
            </span>
            <span>{lastSync && <>Updated {lastSync}</>}</span>
          </footer>
        </div>
      </main>
      <Sheet
        open={!!task}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent>
          {task && row && (
            <>
              <div className="drawer-eyebrow">
                <StatusIcon status={task.status} />
                <span>#{row.id}</span>
                <span className="tag">{task.tag}</span>
              </div>
              <SheetTitle className="drawer-title">{task.title}</SheetTitle>
              <SheetDescription className="sr-only">
                Task details, dependencies, subtasks, and source fields.
              </SheetDescription>
              <TaskActions key={task.key} task={task} projectId={projectId} onSaved={() => { void refresh(); }} onDeleted={() => { setSelected(null); void refresh(); projects.refresh(); }} />
              <div className="drawer-meta">
                <span className="status-badge">
                  <StatusIcon status={task.status} />
                  {task.status}
                </span>
                <span className={`priority ${task.priority}`}>
                  <PriorityIcon priority={task.priority} />
                  {task.priority}
                </span>
                <span className="compact-metric" title="Complexity">
                  <Gauge size={15} />
                  {task.complexity === null ? "—" : `${task.complexity}/10`}
                </span>
              </div>
              <div className="drawer-progress">
                <span>
                  <ListChecks size={14} />
                  Progress<strong>{progress(task)}%</strong>
                </span>
                <Meter value={progress(task)} />
              </div>
              <TaskTime task={task} />
              <TaskComments key={`comments:${task.key}`} projectId={projectId} taskKey={task.key} />
              <Disclosure
                title="Subtasks"
                icon={ListChecks}
                count={task.subtasks.length}
                open
              >
                <Subtasks tasks={task.subtasks} open={setSelected} />
                {!task.subtasks.length && <p className="muted">No subtasks</p>}
              </Disclosure>
              <Disclosure
                title="Dependencies"
                icon={GitBranch}
                count={task.dependencies.length}
                open={!!task.dependencies.length}
              >
                {dependencies(row, rows).map((d) => (
                  <Button
                    className="dependency"
                    key={d.id}
                    onClick={() => d.target && setSelected(d.target.task.key)}
                    disabled={!d.target}
                  >
                    {d.target ? (
                      <StatusIcon status={d.target.task.status} />
                    ) : (
                      <AlertCircle size={15} />
                    )}
                    <span>
                      <small>#{d.id}</small>
                      {d.target?.task.title || "Missing task"}
                    </span>
                    <ArrowUpRight size={14} />
                  </Button>
                ))}
              </Disclosure>
              <Disclosure
                title="Blocks"
                icon={Link2}
                count={dependents(row, rows).length}
              >
                {dependents(row, rows).map((r) => (
                  <Button
                    className="dependency"
                    key={r.task.key}
                    onClick={() => setSelected(r.task.key)}
                  >
                    <StatusIcon status={r.task.status} />
                    <span>
                      <small>#{r.id}</small>
                      {r.task.title}
                    </span>
                    <ArrowUpRight size={14} />
                  </Button>
                ))}
              </Disclosure>
              {task.description && (
                <Disclosure title="Description" icon={AlignLeft}>
                  <p>{task.description}</p>
                </Disclosure>
              )}
              {task.details && (
                <Disclosure title="Implementation" icon={Code2}>
                  <p>{task.details}</p>
                </Disclosure>
              )}
              {task.testStrategy && (
                <Disclosure title="Test strategy" icon={FlaskConical}>
                  <p>{task.testStrategy}</p>
                </Disclosure>
              )}
              {task.complexityReport && (
                <Disclosure title="Complexity report" icon={Gauge}>
                  <pre>{JSON.stringify(task.complexityReport, null, 2)}</pre>
                </Disclosure>
              )}
              <Disclosure title="All fields" icon={Braces}>
                <pre>{JSON.stringify(task.raw, null, 2)}</pre>
              </Disclosure>
              <div className="source">
                <FileJson size={12} />
                {task.source}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
