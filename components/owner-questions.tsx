"use client";
import { Card } from "@heroui/react";
import { Button } from "@/components/ui/button";
import { useEffect, useRef, useState } from "react";
import { ArrowUp, Loader2, Bot, RefreshCw, Copy, Inbox, CheckCheck } from "lucide-react";
import { Textarea } from "./ui/textarea";
import { QuestionTimeline } from "./question-timeline";
import VoiceInput from "./voice-input";
import type { OwnerQuestion, QuestionInbox } from "@/lib/questions";
function Question({ question, available, save }: { question: OwnerQuestion; available: boolean; save: (id: string, answer: string) => Promise<void> }) {
  const [answer, setAnswer] = useState(question.answer || ""), [error, setError] = useState(""), [busy, setBusy] = useState(false);
  const [dictating, setDictating] = useState(false);
  const [preview, setPreview] = useState("");
  const displayedAnswer = preview ? `${answer}${answer ? "\n" : ""}${preview}` : answer;
  const answerField = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { const field = answerField.current; if (field) { field.style.height = "auto"; field.style.height = `${Math.min(220, Math.max(72, field.scrollHeight))}px`; } }, [displayedAnswer]);
  async function send() {
    if (busy || dictating || !answer.trim()) return;
    setBusy(true); setError("");
    try { await save(question.id, answer); } catch (error) { setError(error instanceof Error ? error.message : "Could not save."); } finally { setBusy(false); }
  }
  const pending = question.status === "pending";
  return <Card className="overview-panel owner-question-card">
    <div className="question-card-heading"><span className="question-agent-avatar"><Bot size={17}/></span><div><span className="question-eyebrow">{question.id.startsWith("voice-trial-") ? "VOICE TEST · AGENT QUESTION" : "AGENT QUESTION"}</span><h3>{question.question}</h3></div></div><p className="question-context">{question.context}</p>{question.taskIds?.length > 0 && <div className="question-task-links">{question.taskIds.map(id => <span key={id}>Task #{id}</span>)}</div>}{question.options && <ul>{question.options.map((option, index) => <li key={index}>{option}</li>)}</ul>}
    <div className="question-status-note"><span className={`question-state ${question.blocking ? "blocking" : ""}`}>{pending ? question.blocking ? "Blocking decision" : "Work can continue" : question.status === "answered" ? "Answer saved · awaiting agent" : "Reviewed"}</span></div>
    <QuestionTimeline question={question} />
    {pending ? <div className="answer-composer">
      <Textarea readOnly={dictating} ref={answerField} aria-label={`Answer: ${question.question}`} placeholder="Write your answer, or use the microphone…" rows={3} value={displayedAnswer} disabled={busy} onChange={event => setAnswer(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey && !event.nativeEvent.isComposing) { event.preventDefault(); void send(); } }} maxLength={20000} />
      <div className="answer-composer-tools"><span className="answer-composer-hint">Enter to send · Shift+Enter for a new line</span><VoiceInput compact available={available} disabled={busy} onBusyChange={setDictating} onPreview={setPreview} onError={setError} onText={text => setAnswer(previous => previous ? `${previous}\n${text}` : text)} /><Button className="composer-send" type="button" aria-label="Send answer" title="Send answer (Enter; Shift+Enter for a new line)" disabled={busy || dictating || !answer.trim()} onClick={() => void send()}>{busy ? <Loader2 className="spin" size={18} /> : <ArrowUp size={19} />}</Button></div>
    </div> : <p className="owner-saved-answer">{question.answer}</p>}
    {error && <p role="alert">{error}</p>}
  </Card>;
}
export default function OwnerQuestions({ projectId, onPendingChange }: { projectId: string; onPendingChange?: (count: number) => void }) {
  const [inbox, setInbox] = useState<QuestionInbox | null>(null), [error, setError] = useState(""), [voice, setVoice] = useState(false);
  const [refresh, setRefresh] = useState(0);
  const [copied, setCopied] = useState("");
  useEffect(() => { if (inbox) onPendingChange?.(inbox.questions.filter(q => q.status === "pending").length); }, [inbox, onPendingChange]);
  const endpoint = `/api/questions?project=${encodeURIComponent(projectId)}`;
  useEffect(() => {
    const abort = new AbortController();
    setInbox(null); setError("");
    fetch(endpoint, { signal: abort.signal, cache: "no-store" }).then(async r => { const data = await r.json(); if (!r.ok) throw Error(data.error); setInbox(data); }).catch(e => { if (!abort.signal.aborted) setError(e.message); });
    fetch("/api/capabilities", { signal: abort.signal }).then(r => r.json()).then(data => setVoice(!!data.whisper)).catch(() => {});
    return () => abort.abort();
  }, [endpoint, refresh]);
  useEffect(() => {
    const abort = new AbortController(); let fetching = false;
    const timer = setInterval(async () => {
      if (fetching || document.visibilityState !== "visible") return;
      fetching = true;
      try { const response = await fetch(endpoint, { signal: abort.signal, cache: "no-store" }); if (response.ok) { const data = await response.json(); if (!abort.signal.aborted) setInbox(data); } } catch {} finally { fetching = false; }
    }, 15000);
    return () => { clearInterval(timer); abort.abort(); };
  }, [endpoint]);
  async function save(id: string, answer: string) {
    const response = await fetch(endpoint, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id, answer }) });
    const data = await response.json(); if (!response.ok) throw Error(data.error); setInbox(data);
  }
  return <section className="owner-questions"><div className="questions-intro"><div><h2>Decisions for you</h2><p>Reply by typing or speaking. Your agent can pick up saved answers at its next checkpoint.</p></div><Button className="filter-button" onClick={() => setRefresh(value => value + 1)}><RefreshCw size={15}/>Refresh</Button></div>
    {error && <p role="alert">{error}</p>}
    {!inbox && !error && <p>Loading questions…</p>}
    {inbox && <><div className="questions-section-title"><h3><Inbox size={16}/>Needs your attention</h3><span>{inbox.questions.filter(q => q.status === "pending").length}</span></div>
      {!inbox.questions.some(q => q.status === "pending") && <div className="questions-empty"><CheckCheck size={24}/><strong>You’re all caught up</strong><p>New agent questions will appear here.</p></div>}
      {inbox.questions.filter(q => q.status === "pending").map(q => <Question key={`${projectId}:${q.id}`} question={q} available={voice} save={save} />)}
      <section className="question-history"><div className="questions-section-title"><h3><CheckCheck size={16}/>Answered · awaiting agent</h3><span>{inbox.questions.filter(q => q.status === "answered").length}</span></div><p className="questions-section-note">Saved for your agent. You can also copy these answers into the project chat.</p><Button className="filter-button" disabled={!inbox.questions.some(q => q.status === "answered")} onClick={async () => { const text = `Owner answers for SoloTask project ${projectId}\nApply these decisions to the linked tasks, then acknowledge them in SoloTask.\n\n` + inbox.questions.filter(q => q.status === "answered").map(q => `Question ID: ${q.id}\nTasks: ${q.taskIds?.join(", ")}\nQuestion: ${q.question}\nContext: ${q.context}\nOwner answer: ${q.answer}`).join("\n\n"); try { await navigator.clipboard.writeText(text); setCopied("Answer batch copied. Paste it into the relevant project chat."); } catch { setCopied("Clipboard unavailable. Copy the saved answers below manually."); } }}><Copy size={15}/>Copy answer batch</Button>{copied && <p role="status">{copied}</p>}{!inbox.questions.some(q => q.status === "answered") && <p>No answers awaiting review.</p>}{inbox.questions.filter(q => q.status === "answered").map(q => <Question key={`${projectId}:${q.id}`} question={q} available={voice} save={save} />)}</section>
      <details className="question-history"><summary>Resolved history · {inbox.questions.filter(q => q.status === "resolved").length}</summary>{inbox.questions.filter(q => q.status === "resolved").map(q => <Question key={`${projectId}:${q.id}`} question={q} available={voice} save={save} />)}</details>
    </>}
  </section>;
}
