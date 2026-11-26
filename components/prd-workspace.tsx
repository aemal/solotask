"use client";
import { Card } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@heroui/react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState } from "react";
import { FileText, Upload, Mic, Square, Sparkles, ArrowRight, Check, Download, Undo2, Folder, Loader2, X, CheckCircle2, AlertCircle, ChevronDown } from "lucide-react";
import { DEFAULT_AGENTS } from "@/lib/agents-template";
import RefinableDocument from "@/components/refinable-document";
import DocumentWorkspace, { DocumentPanel } from "@/components/document-workspace";
import StackPicker from "./stack-picker";
import VoiceInput from "@/components/voice-input";
import type { GenerationJob } from "@/lib/prd/generation";
// Enable only after the platform-aware wizard selects an explicit web project type.
const WEB_STACK_SETUP_READY = false;
type Capabilities = { whisper: boolean; ffmpeg: boolean; taskMaster: boolean; whisperModel: string };
async function requestJson(url: string, body: unknown) {
  const response = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  const data = await response.json(); if (!response.ok) throw Error(data.error || "Request failed."); return data;
}
export default function PrdWorkspace({ onOpen, active, onBack, initialProject }: { active: boolean; onOpen: (projectId: string) => void; onBack: () => void; initialProject?: { id: string; root: string } | null }) {
  const [brief, setBrief] = useState(""), [document, setDocument] = useState(""), [apiKey, setApiKey] = useState(""), [model, setModel] = useState("gpt-4o"), [taskModel, setTaskModel] = useState("gpt-4o");
  const [root, setRoot] = useState(""), [count, setCount] = useState(10), [approved, setApproved] = useState(false), [loaded, setLoaded] = useState(false);
  const [capabilities, setCapabilities] = useState<Capabilities | null>(null), [error, setError] = useState(""), [busy, setBusy] = useState(""), [history, setHistory] = useState<string[]>([]), [job, setJob] = useState<GenerationJob | null>(null), [jobId, setJobId] = useState("");
  const [agents, setAgents] = useState(DEFAULT_AGENTS);
  const [aiSettingsOpen, setAiSettingsOpen] = useState(true);
  const [uiStack, setUiStack] = useState("shadcn");
  const [autoContinue, setAutoContinue] = useState(true);
  const [existing, setExisting] = useState(false);
  const [activeFile, setActiveFile] = useState("prd.md"), [refining, setRefining] = useState(false);
  const draftSnapshot = useRef({ brief, document, root, jobId: "", agents, uiStack: "shadcn", loaded: false });
  draftSnapshot.current = { brief, document, root, jobId, agents, uiStack, loaded };
  useEffect(() => () => { const { loaded: ready, ...draft } = draftSnapshot.current; if (ready) try { localStorage.setItem("vibeboard-prd-draft", JSON.stringify(draft)); } catch {} }, []);
  const launchedJob = useRef("");
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem("vibeboard-prd-draft") || "{}"); if (typeof saved.uiStack === "string" && ["shadcn","tailwind","mui","chakra","mantine","antd","daisyui","bootstrap","heroui","radix","bulma","css-modules"].includes(saved.uiStack)) setUiStack(saved.uiStack); if (typeof saved.agents === "string") setAgents(saved.agents); if (typeof saved.brief === "string") setBrief(saved.brief); if (typeof saved.document === "string") setDocument(saved.document); if (typeof saved.root === "string") setRoot(saved.root); if (typeof saved.jobId === "string") setJobId(saved.jobId); } catch {}
    setLoaded(true);
    fetch("/api/capabilities").then(r => r.json()).then(setCapabilities).catch(() => setError("Could not check local tools. Refresh the page to retry."));
  }, []);
  useEffect(() => {
    if (!loaded) return;
    const save = () => { try { localStorage.setItem("vibeboard-prd-draft", JSON.stringify({ brief, document, root, jobId, agents, uiStack })); } catch { setError("Browser storage is full or unavailable. Download your PRD to keep a copy."); } };
    const timer = setTimeout(save, 400); window.addEventListener("pagehide", save);
    return () => { clearTimeout(timer); window.removeEventListener("pagehide", save); };
  }, [brief, document, root, jobId, agents, uiStack, loaded]);
  useEffect(() => {
    if (!jobId || (!active && job?.status !== "running") || (job && job.id === jobId && job.status !== "running")) return;
    let alive = true;
    async function poll() {
      try { const response = await fetch(`/api/generation/${jobId}`, { cache: "no-store" }); const data = await response.json();
        if (!alive) return;
        if (!response.ok) { setError(data.error); setJobId(""); return; }
        setJob(data);
      } catch { if (alive) setError("Run status is temporarily unavailable. Checking again…"); }
    }
    poll(); const timer = setInterval(poll, 1500); return () => { alive = false; clearInterval(timer); };
  }, [jobId, active, job?.status]);
  useEffect(() => {
    if (!initialProject) return;
    setRoot(initialProject.root); setExisting(true); setApproved(false); setJob(null); setJobId(""); setDocument(""); setAgents(DEFAULT_AGENTS);
    const abort = new AbortController();
    async function preload() {
      for (const file of [".taskmaster/docs/prd.md", "prd.md", "PRD.md"]) {
        try { const response = await fetch(`/api/agent-instructions?project=${encodeURIComponent(initialProject!.id)}&file=${encodeURIComponent(file)}`, { signal: abort.signal }); const data = await response.json(); if (response.ok && data.exists && !abort.signal.aborted) { setDocument(data.content); break; } } catch { if (abort.signal.aborted) return; }
      }
      try { const response = await fetch(`/api/agent-instructions?project=${encodeURIComponent(initialProject!.id)}`, { signal: abort.signal }); const data = await response.json(); if (response.ok && data.exists && !abort.signal.aborted) setAgents(data.content); } catch {}
    }
    void preload(); return () => abort.abort();
  }, [initialProject?.id]);
  useEffect(() => { if (active && job?.status === "complete" && job.projectId && launchedJob.current === job.id) { launchedJob.current = ""; onOpen(job.projectId); } }, [active, job?.status, job?.projectId]);
  const voiceAvailable = !!capabilities?.whisper;
  const running = job?.status === "running";
  function updateDocument(value: string) { setDocument(value); setApproved(false); }
  function replaceDocument(value: string) { setHistory(items => [...items, document].slice(-20)); updateDocument(value); }
  const editable = !busy && !running;
  async function draft() {
    setBusy("draft"); setError("");
    try { const result = await requestJson("/api/prd", { action: "draft", apiKey, model, instruction: brief }); replaceDocument(result.text); }
    catch (e) { setError(e instanceof Error ? e.message : "Draft generation failed."); } finally { setBusy(""); }
  }
  function download() {
    const url = URL.createObjectURL(new Blob([document], { type: "text/markdown;charset=utf-8" })); const anchor = window.document.createElement("a"); anchor.href = url; anchor.download = "prd.md"; anchor.click(); URL.revokeObjectURL(url);
  }
  return <div className="prd-workspace">
    <div className="project-create-navigation"><Button type="button" className="filter-button" onClick={onBack}>← Back to projects</Button><span>{existing ? "Set up an existing project" : "Create a project"}</span></div>
    <div className="prd-intro"><span className="prd-step"><FileText size={15} />1. Capture</span><ArrowRight size={13} /><span className="prd-step">2. Review & refine</span><ArrowRight size={13} /><span className="prd-step">3. Generate tasks</span></div>
    {error && <div className="notice" role="alert"><AlertCircle size={15} />{error}<Button className="icon-button" aria-label="Dismiss message" onClick={() => setError("")}><X size={14} /></Button></div>}
    <details className="prd-settings-disclosure" open={aiSettingsOpen} onToggle={event => setAiSettingsOpen(event.currentTarget.open)}>
      <summary><Sparkles size={16} /><div className="ai-setup-title"><strong>AI assistance</strong><small>Draft and refine your project documents</small></div><span className="ai-key-status">{apiKey.trim() ? "Key added" : "API key needed"}</span><ChevronDown className="ai-setup-chevron" size={16} /></summary>
      <div className="ai-setup-body"><p>Add your OpenAI API key to turn an idea into a PRD or refine selected text. You can write and import documents without it.</p>
        <div className="ai-key-row"><label htmlFor="prd-api-key">OpenAI API key<Input id="prd-api-key" type="password" autoComplete="off" placeholder="Paste your API key" value={apiKey} onChange={e => setApiKey(e.target.value)} /></label><Button type="button" className="filter-button" onClick={() => setApiKey("")} disabled={!apiKey}>Remove key</Button></div>
        <small>Your key stays in memory for this session. Generating or refining sends text to OpenAI and may incur API charges.</small>
        <details className="ai-model-settings"><summary>Model settings</summary><label htmlFor="prd-model">Document model<Input id="prd-model" value={model} onChange={e => setModel(e.target.value)} placeholder="gpt-4o" /></label></details>
      </div>
    </details>
    <div className="prd-single-page">
      <details className="prd-capture-disclosure"><summary><Sparkles size={15} />Draft from an idea<span>Type or dictate</span></summary><div className="prd-capture"><p>Type or dictate what you want to build, or import an existing PRD.</p>
        <label className="sr-only" htmlFor="prd-brief">Project idea</label><Textarea id="prd-brief" value={brief} onChange={e => setBrief(e.target.value)} disabled={!editable} placeholder="What are we building, who is it for, and what should it do?" maxLength={100000} rows={9} />
        <div className="prd-actions"><VoiceInput available={voiceAvailable} disabled={!editable || !active} onError={setError} onText={text => setBrief(previous => `${previous}${previous ? "\n" : ""}${text}`)} /><Button className="primary-button" disabled={!editable || !brief.trim() || !apiKey.trim()} onClick={draft}>{busy === "draft" ? <Loader2 className="spin" size={15} /> : <Sparkles size={15} />}{document ? "Generate a new draft" : "Generate PRD"}</Button></div>
        <div className="prd-import"><Input ref={fileInput} type="file" accept=".md,.markdown,.txt,text/markdown,text/plain" hidden onChange={async e => {
          const file = e.target.files?.[0]; e.target.value = ""; if (!file) return;
          if (!/\.(md|markdown|txt)$/i.test(file.name) || file.size > 100000) { setError("Choose a Markdown or text PRD under 100 KB."); return; }
          try { const text = await file.text(); if (!text.trim() || text.includes("\0")) throw Error("Choose a non-empty text document."); replaceDocument(text); setError(""); } catch (e) { setError(e instanceof Error ? e.message : "Could not read that file."); }
        }} /><Button className="filter-button" disabled={!editable} onClick={() => fileInput.current?.click()}><Upload size={14} />Import prd.md</Button><Button className="text-button" disabled={!editable || !brief.trim()} onClick={() => replaceDocument(brief)}>Use my text as the PRD</Button></div>
        <div className="prd-tool-status"><span className={voiceAvailable ? "tool-ready" : ""}><Mic size={13} />Whisper {capabilities ? voiceAvailable ? `installed · ${capabilities.whisperModel}` : "not available" : "checking…"}</span><span className={capabilities?.taskMaster ? "tool-ready" : ""}><Check size={13} />Task Master {capabilities ? capabilities.taskMaster ? "installed" : "not available" : "checking…"}</span></div>
        {!voiceAvailable && capabilities && <p className="metric-caption">Live dictation requires Whisper and its Python dependencies on the server computer. See README setup instructions. Typing and import work without them.</p>}
      </div></details>
      <section className="prd-editor-panel"><div className="overview-heading"><h2><FileText size={16} />Project documents</h2><div className="prd-actions"><Button className="icon-button" title="Undo last replacement" aria-label="Undo PRD replacement" disabled={!editable || !history.length} onClick={() => { const previous = history[history.length - 1]; setHistory(history.slice(0, -1)); updateDocument(previous); }}><Undo2 size={15} /></Button><Button className="filter-button" disabled={!editable} onClick={() => fileInput.current?.click()}><Upload size={14} />Import</Button><Button className="filter-button" disabled={!document.trim()} onClick={download}><Download size={14} />Download</Button></div></div>
        <DocumentWorkspace files={["prd.md", "AGENTS.md"]} openFiles={["prd.md", "AGENTS.md"]} active={activeFile} onOpen={file => { if (!refining) setActiveFile(file); }}>
          <DocumentPanel file="prd.md" active={activeFile === "prd.md"}><RefinableDocument label="PRD" value={document} onChange={updateDocument} disabled={!editable} active={active && activeFile === "prd.md"} apiKey={apiKey} model={model} onBusyChange={setRefining} /></DocumentPanel>
          <DocumentPanel file="AGENTS.md" active={activeFile === "AGENTS.md"}><RefinableDocument label="Agent instructions" value={agents} onChange={setAgents} disabled={!editable} active={active && activeFile === "AGENTS.md"} apiKey={apiKey} model={model} onBusyChange={setRefining} maxLength={80000} /></DocumentPanel>
        </DocumentWorkspace>
        <div className="prd-document-footer"><span>{document.length.toLocaleString()} PRD characters · draft saved in this browser</span></div>
      </section>
    </div>
    {WEB_STACK_SETUP_READY && !existing && <StackPicker value={uiStack} onChange={setUiStack} disabled={!editable} />}
    <Card className="overview-panel prd-launch"><div><h2><Folder size={17} />Generate the project task plan</h2><p>Task Master generates a task plan using OpenAI. This creates planning files; it does not implement the application.</p></div><Checkbox className="prd-approval" isSelected={existing} isDisabled={!!running} onChange={checked => { setExisting(checked); setApproved(false); }}><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Content>Use an existing project folder</Checkbox.Content></Checkbox><div className="prd-launch-fields"><label>Project folder<Input value={root} onChange={e => setRoot(e.target.value)} disabled={!!running} placeholder="/Users/you/projects/my-new-app" /></label><label>Task Master model<Input value={taskModel} onChange={e => setTaskModel(e.target.value)} disabled={!!running} /></label><label>Top-level tasks<Input type="number" min={1} max={50} value={count} onChange={e => setCount(Number(e.target.value))} disabled={!!running} /></label></div><p className="metric-caption">{existing ? "Your existing files are preserved. This adds an initial .taskmaster plan and keeps any existing AGENTS.md. Folders with an existing task plan cannot be regenerated here." : "Choose a new or empty folder on this computer. The approved PRD and tasks are saved under .taskmaster."} The project opens in your cockpit when generation finishes.</p>
      <Checkbox className="prd-approval" isSelected={autoContinue} isDisabled={!!running} onChange={checked => setAutoContinue(checked)}><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Content>Prepare agent continuation until the approved backlog is complete. Activate the Stop hook in Codex after setup.</Checkbox.Content></Checkbox><Checkbox className="prd-approval" isSelected={approved} isDisabled={!document.trim() || !editable || refining} onChange={checked => setApproved(checked)}><Checkbox.Control><Checkbox.Indicator /></Checkbox.Control><Checkbox.Content>I reviewed this PRD and approve sending it to OpenAI through Task Master.</Checkbox.Content></Checkbox>
      <Button className="primary-button" disabled={!editable || !approved || !apiKey.trim() || !root.trim() || !capabilities?.taskMaster || refining} onClick={async () => {
        setBusy("tasks"); setError("");
        try { const data = await requestJson("/api/generation", { uiStack: WEB_STACK_SETUP_READY && !existing ? uiStack : undefined, autoContinue, root, existing, prd: document, agents, apiKey, model: taskModel, count, approved }); launchedJob.current = data.id; setJob(data); setJobId(data.id); }
        catch (e) { setError(e instanceof Error ? e.message : "Could not start Task Master."); } finally { setBusy(""); }
      }}>{busy === "tasks" ? <Loader2 className="spin" size={15} /> : <ArrowRight size={15} />}Generate project tasks</Button>
    </Card>
    {job && <Card className="overview-panel prd-run" aria-live="polite"><div className="overview-heading"><h2>{running ? <Loader2 className="spin" size={16} /> : job.status === "complete" ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}{job.stage}</h2>{running && <Button className="filter-button" onClick={async () => { try { const response = await fetch(`/api/generation/${job.id}`, { method: "DELETE" }); if (!response.ok) throw Error(); } catch { setError("Could not cancel. Check the run status."); } }}>Cancel run</Button>}</div><p className="project-path">{job.root}</p>{job.error && <p className="notice">{job.error}</p>}<pre className="prd-run-log">{job.logs.join("\n") || "Starting local Task Master…"}</pre>{job.status === "complete" && job.projectId && <Button className="primary-button" onClick={() => onOpen(job.projectId!)}>Open project · {job.taskCount} tasks<ArrowRight size={15} /></Button>}</Card>}
  </div>;
}
