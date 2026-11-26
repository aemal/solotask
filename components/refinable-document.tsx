"use client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useState } from "react";
import VoiceInput from "./voice-input";
import DocumentEditor from "./document-editor";
type Selection = { document: string; start: number; end: number };
export default function RefinableDocument({ value, onChange, disabled = false, label, apiKey: suppliedKey, model: suppliedModel = "gpt-4o", maxLength = 100000, active = true, onBusyChange }: { value: string; onChange: (value: string) => void; disabled?: boolean; label: string; apiKey?: string; model?: string; maxLength?: number; active?: boolean; onBusyChange?: (busy: boolean) => void }) {
  const [selection, setSelection] = useState<Selection | null>(null), [instruction, setInstruction] = useState(""), [key, setKey] = useState(""), [model, setModel] = useState("gpt-4o"), [busy, setBusy] = useState(false), [error, setError] = useState(""), [suggestion, setSuggestion] = useState<{ selection: Selection; text: string } | null>(null);
  const [voice, setVoice] = useState(false);
  useEffect(() => { if (!active) return; const abort = new AbortController(); fetch("/api/capabilities", { signal: abort.signal }).then(r => r.json()).then(data => { if (!abort.signal.aborted) setVoice(!!data.whisper); }).catch(() => {}); return () => abort.abort(); }, [active]);
  useEffect(() => { onBusyChange?.(busy); }, [busy, onBusyChange]);
  const apiKey = suppliedKey ?? key;
  const valid = selection?.document === value ? selection : null;
  return <div>
    <DocumentEditor label={label} value={value} disabled={disabled || busy || !active} maxLength={maxLength} onChange={text => { if (text.length > maxLength) { setError(`Keep this document under ${maxLength.toLocaleString()} characters.`); return; } onChange(text); setSelection(null); setSuggestion(null); }} onSelection={setSelection} />
    <details className="prd-revision" open={!!valid || !!suggestion || undefined}><summary>Refine selected text with AI · {valid ? `${valid.end - valid.start} characters selected` : "Select a passage"}</summary>
      <div className="prd-revision-body">
        {suppliedKey === undefined && <><p>The selected document and your instructions are sent to OpenAI when you request a suggestion. Your key stays in memory.</p><label>OpenAI API key<Input type="password" autoComplete="off" value={key} onChange={e => setKey(e.target.value)} /></label><label>Model<Input value={model} onChange={e => setModel(e.target.value)} /></label><Button className="text-button" onClick={() => setKey("")} disabled={!key}>Forget key</Button></>}
        <label>Revision instructions<Textarea aria-label={`Revision instructions for ${label}`} rows={3} value={instruction} disabled={disabled || busy || !active} onChange={e => setInstruction(e.target.value)} placeholder="Describe how to improve this passage…" /></label>
        <VoiceInput available={voice} disabled={disabled || busy || !active} onError={setError} onText={text => setInstruction(previous => previous ? `${previous}\n${text}` : text)} />
        {valid && <blockquote style={{ whiteSpace: "pre-wrap" }}>{value.slice(valid.start, valid.end)}</blockquote>}
        <Button className="filter-button" disabled={disabled || busy || !active || !valid || !instruction.trim() || !apiKey.trim()} onClick={async () => {
          if (!valid) return;
          const snapshot = valid; setBusy(true); setError(""); setSuggestion(null);
          try {
            const response = await fetch("/api/prd", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "revise", apiKey, model: suppliedKey === undefined ? model : suppliedModel, instruction, document: snapshot.document, start: snapshot.start, end: snapshot.end }) });
            const result = await response.json(); if (!response.ok) throw Error(result.error || "Could not suggest a revision.");
            setSuggestion({ selection: snapshot, text: result.text });
          } catch (error) { setError(error instanceof Error ? error.message : "Could not suggest a revision."); } finally { setBusy(false); }
        }}>{busy ? "Suggesting…" : "Suggest revision"}</Button>
        {suppliedKey !== undefined && !apiKey && <p>Add your key in AI settings above to request a revision.</p>}
      </div>
    </details>
    {suggestion && <section className="prd-suggestion"><h3>Review suggested replacement</h3><pre style={{ whiteSpace: "pre-wrap" }}>{suggestion.text}</pre><Button className="filter-button" disabled={disabled || busy || value !== suggestion.selection.document} onClick={() => {
      if (value !== suggestion.selection.document) { setError("The document changed. Select the passage again."); return; }
      const { start, end } = suggestion.selection;
      const next = value.slice(0, start) + suggestion.text + value.slice(end);
      if (next.length > maxLength) { setError("The suggested document is too long. Request a shorter revision."); return; }
      onChange(next); setSuggestion(null); setSelection(null);
    }}>Apply revision</Button><Button className="text-button" onClick={() => setSuggestion(null)}>Discard suggestion</Button>{value !== suggestion.selection.document && <p>The document changed. Request a new revision.</p>}</section>}
    {error && <p role="alert">{error}</p>}
  </div>;
}
