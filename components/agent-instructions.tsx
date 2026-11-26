"use client";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import RefinableDocument from "./refinable-document";
import { DEFAULT_AGENTS } from "@/lib/agents-template";
export default function AgentInstructions({ projectId, file = "AGENTS.md", active = true, apiKey, model }: { projectId: string; file?: string; active?: boolean; apiKey?: string; model?: string }) {
  const [content, setContent] = useState(""), [revision, setRevision] = useState<string | null>(null), [loaded, setLoaded] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState("");
  const endpoint = `/api/agent-instructions?project=${encodeURIComponent(projectId)}&file=${encodeURIComponent(file)}`;
  async function load() {
    setBusy(true); setError(""); setMessage("");
    try { const response = await fetch(endpoint, { cache: "no-store" }); const data = await response.json(); if (!response.ok) throw Error(data.error); setContent(data.exists ? data.content : file === "AGENTS.md" ? DEFAULT_AGENTS : ""); setRevision(data.revision); setLoaded(true); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not load instructions."); }
    finally { setBusy(false); }
  }
  useEffect(() => { if (active && !loaded && !busy && !error) void load(); }, [active, loaded, busy, error]);
  return <section className="project-file-editor">
    <h3>{file === "AGENTS.md" ? "AGENTS.md · Agent Smartness" : file}</h3>
    <p>Edit this project document. Saving updates the Markdown file in the selected project folder.</p>
    {loaded && <><RefinableDocument label={file} active={active} apiKey={apiKey} model={model} value={content} disabled={busy} onChange={text => { setContent(text); setMessage(""); }} />
    <Button className="filter-button" disabled={busy} onClick={async () => { setBusy(true); setError(""); setMessage(""); try { const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ content, revision }) }); const data = await response.json(); if (!response.ok) throw Error(data.error); setRevision(data.revision); setMessage(`Saved to ${file}`); } catch (error) { setError(error instanceof Error ? error.message : "Could not save."); } finally { setBusy(false); } }}>Save file</Button></>}
    <Button className="text-button" disabled={busy} onClick={() => void load()}>Reload from disk</Button>
    {busy && <p role="status">Working…</p>}{message && <p role="status">{message}</p>}{error && <p role="alert">{error} Your editor text has been kept.</p>}
  </section>;
}
