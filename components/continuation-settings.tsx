"use client";
import { Card } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@heroui/react";
import { useEffect, useState } from "react";
import { Textarea } from "./ui/textarea";
type Settings = { enabled: boolean; reason: string; maxUnchangedStops: number };
type Data = { settings: Settings; revision: string | null; hookConfiguration: unknown; lastInvocation: { at: string; outcome: string } | null };
export default function ContinuationSettings({ projectId }: { projectId: string }) {
  const [data, setData] = useState<Data | null>(null), [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false);
  const endpoint = `/api/continuation?project=${encodeURIComponent(projectId)}`;
  useEffect(() => { const abort = new AbortController(); setData(null); fetch(endpoint, { signal: abort.signal, cache: "no-store" }).then(async r => { const value = await r.json(); if (!r.ok) throw Error(value.error); setData(value); }).catch(e => { if (!abort.signal.aborted) setError(e.message); }); return () => abort.abort(); }, [endpoint]);
  function update(change: Partial<Settings>) { setData(previous => previous ? { ...previous, settings: { ...previous.settings, ...change } } : previous); setMessage(""); }
  async function save() { if (!data) return; setBusy(true); setError(""); try { const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ settings: data.settings, revision: data.revision }) }); const value = await response.json(); if (!response.ok) throw Error(value.error); setData(value); setMessage("Saved. Hook files are prepared; Codex must load and trust the hook before it can run."); } catch (e) { setError(e instanceof Error ? e.message : "Could not save settings."); } finally { setBusy(false); } }
  return <Card className="overview-panel continuation-settings"><h2>Agent continuation</h2><p>Continue through the approved Task Master backlog when the agent finishes a turn.</p>
    {error && <p role="alert">{error}</p>}{!data ? <p>Loading continuation settings…</p> : <>
      <label className="continuation-toggle"><span><strong>Continue Task Master work on stop</strong><small>Keep taking ready tasks until complete or blocked.</small></span><Switch aria-label="Continue Task Master work on stop" isSelected={data.settings.enabled} isDisabled={busy} onChange={enabled => update({ enabled })}><Switch.Control><Switch.Thumb /></Switch.Control></Switch></label>
      <label>Reason sent back to the agent<Textarea rows={5} maxLength={4000} value={data.settings.reason} disabled={busy} onChange={e => update({ reason: e.target.value })} /></label>
      <label>Pause after repeated stops without Task Master progress<Input type="number" min={1} max={20} value={data.settings.maxUnchangedStops} disabled={busy} onChange={e => update({ maxUnchangedStops: Number(e.target.value) })} /></label>
      <p className="metric-caption">Progress resets this limit. Turning this off prevents future hook continuations; use Stop in Codex to interrupt a running turn.</p>
      <div className="settings-actions"><Button type="button" className="primary-button" disabled={busy} onClick={save}>{busy ? "Saving…" : "Save settings"}</Button></div>{message && <p role="status">{message}</p>}
      <div className="continuation-connection"><strong>{data.lastInvocation ? "Hook has reported" : "Hook not verified"}</strong><p>{data.lastInvocation ? `${new Date(data.lastInvocation.at).toLocaleString()} · ${data.lastInvocation.outcome}` : "Saving prepares .vibeboard/stop-hook.mjs and hooks.json. Merge the Stop entry into your project's .codex/hooks.json, preserve existing hooks, then review and trust it in Codex. Reload the session if required."}</p><p>The Stop hook continues a normal turn ending. It cannot reopen a closed app, recover a crashed process, override your Stop button, or bypass approvals and usage limits.</p></div>
      <details><summary>Hook configuration</summary><pre>{JSON.stringify(data.hookConfiguration, null, 2)}</pre><Button type="button" className="filter-button" onClick={async () => { try { await navigator.clipboard.writeText(JSON.stringify(data.hookConfiguration, null, 2)); setMessage("Hook configuration copied. Merge it with existing Codex hooks."); } catch { setError("Clipboard unavailable. Select and copy the configuration."); } }}>Copy hook configuration</Button></details>
    </>}
  </Card>;
}
