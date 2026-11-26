"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useEffect, useState } from "react";
import DocumentWorkspace, { DocumentPanel } from "./document-workspace";
import SkillManager from "./skill-manager";
import ContinuationSettings from "./continuation-settings";
import AgentInstructions from "./agent-instructions";
export default function ProjectSettings({ projectId }: { projectId: string }) {
  const [skillsVersion, setSkillsVersion] = useState(0);
  const [files, setFiles] = useState<string[]>([]), [error, setError] = useState("");
  const [activeFile, setActiveFile] = useState("AGENTS.md"), [openFiles, setOpenFiles] = useState(["AGENTS.md"]), [apiKey, setApiKey] = useState(""), [model, setModel] = useState("gpt-4o");
  useEffect(() => {
    if (!projectId) return;
    const abort = new AbortController();
    fetch(`/api/project-documents?project=${encodeURIComponent(projectId)}`, { cache: "no-store", signal: abort.signal }).then(async response => { const data = await response.json(); if (!response.ok) throw Error(data.error); if (!abort.signal.aborted) setFiles(data.files); }).catch(error => { if (!abort.signal.aborted) setError(error.message); });
    return () => abort.abort();
  }, [projectId, skillsVersion]);
  function open(file: string) { setActiveFile(file); setOpenFiles(previous => previous.includes(file) ? previous : [...previous, file]); }
  return <section className="project-documents prd-workspace"><ContinuationSettings key={projectId} projectId={projectId} /><SkillManager key={`skills:${projectId}`} projectId={projectId} onInstalled={() => setSkillsVersion(v => v+1)} onOpen={open} /><h2>Project documents</h2><p>Click a document to edit it. Select a passage and type or dictate a change for AI to suggest.</p><details className="prd-settings-disclosure"><summary>AI assistance · refine selected text</summary><p>Your key stays in memory. Documents are sent to OpenAI only when you request a revision.</p><label>OpenAI API key<Input type="password" autoComplete="off" value={apiKey} onChange={e => setApiKey(e.target.value)} /></label><label>Model<Input value={model} onChange={e => setModel(e.target.value)} /></label><Button type="button" className="filter-button" onClick={() => setApiKey("")}>Remove key</Button></details>{error && <p role="alert">{error}</p>}{!error && !files.length && <p>Loading project documents…</p>}{files.length > 0 && <DocumentWorkspace files={files} openFiles={openFiles} active={activeFile} onOpen={open}>{openFiles.map(file => <DocumentPanel key={file} file={file} active={activeFile === file}><AgentInstructions projectId={projectId} file={file} active={activeFile === file} apiKey={apiKey} model={model} /></DocumentPanel>)}</DocumentWorkspace>}</section>;
}
