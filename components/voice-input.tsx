"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState } from "react";
import { Mic, Square, Loader2, Check, X, RotateCw } from "lucide-react";
import { mergeTranscript } from "@/lib/prd/transcript";
type Window = { id: number; pcm: Int16Array; final: boolean };
function DictationWaveform({ levels, recording }: { levels: number[]; recording: boolean }) {
  const container = useRef<HTMLDivElement>(null);
  const [bars, setBars] = useState(32);
  useEffect(() => {
    const element = container.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => setBars(Math.max(1, Math.min(600, Math.floor(entry.contentRect.width / 5)))));
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={container} className="dictation-meter-inline" aria-hidden="true">{Array.from({ length: bars }, (_, index) => {
    const position = index / Math.max(1, bars - 1) * (levels.length - 1);
    const left = Math.floor(position), offset = position - left;
    const fraction = offset * offset * (3 - 2 * offset);
    const level = levels[left] * (1 - fraction) + levels[Math.min(left + 1, levels.length - 1)] * fraction;
    return <i key={index} style={{ height: "32px", transform: `scaleY(${(3 + Math.pow(Math.min(1, Math.max(0, (level - .04) * 2.5)), 1.15) * 29) / 32})`, opacity: recording ? 1 : .4 }} />;
  })}</div>;
}
let voiceInUse = false;
export default function VoiceInput({ onText, disabled, available, onError, compact = false, onBusyChange, onPreview }: { compact?: boolean; onPreview?: (text: string) => void; onBusyChange?: (busy: boolean) => void; onText: (text: string) => void; disabled?: boolean; available: boolean; onError: (message: string) => void }) {
  const [phase, setPhase] = useState<"idle" | "starting" | "recording" | "finishing" | "review" | "error">("idle");
  const [transcript, setTranscript] = useState(""), [backlog, setBacklog] = useState(0), [elapsed, setElapsed] = useState(0);
  const mounted = useRef(true), session = useRef(0), resources = useRef<{ context: AudioContext; node: AudioWorkletNode; stream: MediaStream; source: MediaStreamAudioSourceNode } | null>(null);
  const openingContext = useRef<AudioContext | null>(null);
  const [levels, setLevels] = useState<number[]>(Array(32).fill(.04));
  const transcriptValue = useRef("");
  const waveMotion = useRef({ lastPaint: 0, peak: 0 });
  const chunks = useRef<Int16Array[]>([]), samples = useRef(0), silence = useRef(0), voiced = useRef(false), lastPreview = useRef(0), segment = useRef(0);
  const queue = useRef<Window[]>([]), inFlight = useRef(false), texts = useRef(new Map<number, string>()), stopped = useRef(true), failed = useRef(false);
  const abort = useRef<AbortController | null>(null), startedAt = useRef(0), clock = useRef<ReturnType<typeof setInterval> | null>(null), ownsVoice = useRef(false);
  const callbacks = useRef({ onText, onError }); callbacks.current = { onText, onError };
  function cleanup() {
    const preparing = openingContext.current; openingContext.current = null; if (preparing && preparing.state !== "closed") void preparing.close();
    const current = resources.current; resources.current = null;
    current?.node?.disconnect(); current?.source.disconnect(); current?.stream.getTracks().forEach(track => track.stop()); void current?.context.close();
    if (clock.current) clearInterval(clock.current);
    if (ownsVoice.current) { ownsVoice.current = false; voiceInUse = false; }
  }
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; session.current++; abort.current?.abort(); cleanup(); }; }, []);
  function snapshot(final: boolean) {
    if (!samples.current || !voiced.current) { if (final) { chunks.current = []; samples.current = 0; silence.current = 0; } return; }
    const pcm = new Int16Array(samples.current); let offset = 0;
    for (const chunk of chunks.current) { pcm.set(chunk, offset); offset += chunk.length; }
    const window = { id: segment.current, pcm, final };
    const pending = queue.current.findIndex(item => item.id === window.id);
    if (pending >= 0) queue.current[pending] = window; else queue.current.push(window);
    lastPreview.current = samples.current;
    if (final) {
      // Retain context across a forced boundary, but not across an actual pause.
      const overlap = silence.current < 8000 ? pcm.slice(-9600) : new Int16Array();
      chunks.current = overlap.length ? [overlap] : []; samples.current = overlap.length;
      voiced.current = false; silence.current = 0; lastPreview.current = 0; segment.current++;
    }
    setBacklog(queue.current.length); void pump();
  }
  async function pump() {
    if (inFlight.current || failed.current || !mounted.current) return;
    const item = queue.current.shift();
    if (!item) {
      if (stopped.current) {
        if (compact) { const text = transcriptValue.current; if (text.trim()) callbacks.current.onText(text); else callbacks.current.onError("No speech was detected. Try again or type your answer."); setPhase("idle"); setTranscript(""); }
        else setPhase("review");
      }
      return;
    }
    inFlight.current = true; const token = session.current; abort.current = new AbortController();
    try {
      const response = await fetch("/api/voice", { method: "POST", headers: { "Content-Type": "application/octet-stream" }, body: new Blob([item.pcm as Int16Array<ArrayBuffer>]), signal: abort.current.signal });
      const result = await response.json(); if (!response.ok) throw Error(result.error || "Local transcription failed.");
      if (mounted.current && token === session.current) {
        texts.current.set(item.id, result.text);
        transcriptValue.current = mergeTranscript([...texts.current.entries()].sort(([a], [b]) => a - b).map(([, text]) => text));
        setTranscript(transcriptValue.current);
      }
    } catch (error) {
      if (mounted.current && token === session.current) {
        // Keep the newer final snapshot if one superseded this in-flight preview.
        if (!queue.current.some(pending => pending.id === item.id)) queue.current.unshift(item);
        failed.current = true; stopped.current = true; snapshot(true); cleanup(); setPhase("error");
        callbacks.current.onError(error instanceof Error ? error.message : "Local transcription failed. Your completed transcript is preserved.");
      }
    } finally {
      if (token === session.current) { inFlight.current = false; setBacklog(queue.current.length); if (!failed.current) void pump(); }
    }
  }
  function finish() {
    if (stopped.current) return;
    stopped.current = true; setPhase("finishing");
    const current = resources.current;
    if (current) {
      current.node.port.postMessage("flush");
      // A suspended/disconnected audio graph must not hold microphone access indefinitely.
      setTimeout(() => { if (resources.current === current) { snapshot(true); cleanup(); void pump(); } }, 500);
    } else { snapshot(true); cleanup(); void pump(); }
  }
  useEffect(() => { if (disabled && phase === "recording") finish(); }, [disabled, phase]);
  async function start() {
    if (voiceInUse) { callbacks.current.onError("Finish the other dictation session first."); return; }
    voiceInUse = true; ownsVoice.current = true; setPhase("starting"); callbacks.current.onError("");
    const token = ++session.current;
    try {
      if (!navigator.mediaDevices?.getUserMedia || !window.AudioWorkletNode) throw Error("Live dictation needs a browser with AudioWorklet and microphone access on localhost or HTTPS.");
      const context = new AudioContext(); openingContext.current = context;
      // Unlock audio inside the click gesture for mobile Safari.
      void context.resume().catch(() => {});
      abort.current = new AbortController();
      const ready = await fetch("/api/voice", { cache: "no-store", signal: abort.current.signal });
      const readiness = await ready.json(); if (!ready.ok) throw Error(readiness.error || "Local transcription is not ready.");
      if (!mounted.current || token !== session.current) return;
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true } });
      if (!mounted.current || token !== session.current) { stream.getTracks().forEach(track => track.stop()); return; }
      const source = context.createMediaStreamSource(stream);
      openingContext.current = null;
      resources.current = { context, source, stream, node: null as unknown as AudioWorkletNode };
      await context.audioWorklet.addModule("/audio-capture.js");
      if (!mounted.current || token !== session.current) { cleanup(); return; }
      const capture = new AudioWorkletNode(context, "vibeboard-voice"); resources.current.node = capture;
      chunks.current = []; samples.current = 0; silence.current = 0; voiced.current = false; lastPreview.current = 0; segment.current = 0;
      queue.current = []; texts.current.clear(); failed.current = false; stopped.current = false; inFlight.current = false;
      waveMotion.current = { lastPaint: 0, peak: 0 };
      transcriptValue.current = ""; setTranscript(""); setLevels(Array(32).fill(.04)); setElapsed(0); setBacklog(0); startedAt.current = Date.now();
      capture.port.onmessage = event => {
        if (!mounted.current || token !== session.current) return;
        if (event.data === "flushed") { snapshot(true); cleanup(); void pump(); return; }
        const pcm = event.data as Int16Array;
        chunks.current.push(pcm); samples.current += pcm.length;
        let power = 0; for (const value of pcm) power += (value / 32768) ** 2;
        const volume = Math.min(1, Math.sqrt(power / pcm.length) * 8);
        // Smooth and throttle visual feedback only; audio capture/transcription stay unchanged.
        const now = performance.now(), motion = waveMotion.current;
        // Retain short speech peaks rather than averaging them into a flat band.
        motion.peak = Math.max(motion.peak, volume);
        if (now - motion.lastPaint >= 200) {
          motion.lastPaint = now;
          const level = motion.peak;
          motion.peak = 0;
          setLevels(previous => {
            const last = previous[previous.length - 1] ?? .04;
            const blend = level > last ? .8 : .45;
            return [...previous.slice(1), last + (level - last) * blend];
          });
        }
        if (Math.sqrt(power / pcm.length) > .008) { voiced.current = true; silence.current = 0; } else silence.current += pcm.length;
        if (!stopped.current && samples.current >= 48000 && ((voiced.current && silence.current >= 16000) || samples.current >= 240000)) snapshot(true);
        else if (!stopped.current && voiced.current && samples.current - lastPreview.current >= 48000) snapshot(false);
        else if (!voiced.current && samples.current > 48000) { chunks.current = chunks.current.slice(-10); samples.current = chunks.current.reduce((sum, part) => sum + part.length, 0); }
        if (queue.current.filter(item => item.final).length >= 4 && !stopped.current) { callbacks.current.onError("Whisper is falling behind. Recording stopped so it can finish your queued speech; no queued passages were dropped."); finish(); }
      };
      source.connect(capture); capture.connect(context.destination); await context.resume();
      setPhase("recording"); clock.current = setInterval(() => setElapsed(Math.floor((Date.now() - startedAt.current) / 1000)), 1000);
    } catch (error) { if (token !== session.current) return; cleanup(); if (mounted.current) { setPhase("idle"); callbacks.current.onError(error instanceof Error ? error.message : "Microphone access failed."); } }
  }
  useEffect(() => { onBusyChange?.(phase !== "idle"); }, [phase, onBusyChange]);
  useEffect(() => { if (compact) onPreview?.(phase === "idle" ? "" : transcript); }, [compact, phase, transcript, onPreview]);
  const active = phase === "starting" || phase === "recording" || phase === "finishing";
  function discard() { session.current++; abort.current?.abort(); queue.current = []; chunks.current = []; texts.current.clear(); transcriptValue.current = ""; failed.current = false; stopped.current = true; inFlight.current = false; cleanup(); setPhase("idle"); setTranscript(""); callbacks.current.onError(""); }
  if (compact && phase !== "idle") return <div className="composer-dictation-inline" role="group" aria-label="Answer dictation">
    <DictationWaveform levels={levels} recording={phase === "recording"} />
    <Button type="button" className="composer-microphone recording" aria-label={phase === "recording" ? "Finish dictation" : phase === "error" ? "Retry transcription" : "Processing dictation"} title={phase === "recording" ? "Stop recording and insert transcript" : phase === "error" ? "Retry saved audio" : "Processing dictation"} disabled={phase === "starting" || phase === "finishing"} onClick={() => { if (phase === "recording") finish(); else if (phase === "error") { failed.current = false; setPhase("finishing"); callbacks.current.onError(""); void pump(); } }}>{phase === "starting" || phase === "finishing" ? <Loader2 className="spin" size={19} /> : phase === "error" ? <RotateCw size={19} /> : <Mic size={19} />}</Button>
    <Button type="button" className="dictation-cancel-inline" aria-label="Cancel dictation" title="Cancel dictation" onClick={discard}><X size={14} /></Button>
    <span className="sr-only" role="status">{phase === "recording" ? "Listening. Press microphone to finish." : phase === "error" ? "Transcription failed. Audio kept for retry." : "Processing dictation"}</span>
  </div>;
  return <div className={`live-voice ${compact ? "voice-input-compact" : ""} ${phase !== "idle" ? "voice-input-expanded" : ""}`}>
    {(phase === "idle") ? <Button type="button" className={compact ? "composer-microphone" : "filter-button"} aria-label={compact ? "Dictate answer" : "Dictate live"} title={!available ? "Local Whisper is not available" : "Dictate with your microphone"} disabled={disabled || !available} onClick={start}><Mic size={compact ? 19 : 14} />{!compact && "Dictate live"}</Button> : <>
      <div className="prd-actions"><span className={phase === "recording" ? "voice-recording-label" : ""}>{phase === "recording" ? <Mic size={14} /> : active ? <Loader2 size={14} className="spin" /> : null}{phase === "starting" ? "Opening microphone…" : phase === "recording" ? `Listening · ${Math.floor(elapsed / 60)}:${String(elapsed % 60).padStart(2, "0")}` : phase === "finishing" ? "Finishing queued speech…" : phase === "error" ? "Transcription paused" : "Review your transcript"}</span>{phase === "recording" && <Button className="filter-button" type="button" onClick={finish}><Square size={13} />Stop & review</Button>}</div>
      <Textarea aria-label="Live voice transcript" value={transcript} readOnly={active || phase === "error"} onChange={event => setTranscript(event.target.value)} placeholder="Your words will appear here. The latest passage may change as context arrives…" rows={5} />
      <small aria-live="polite">{backlog ? `${backlog} audio ${backlog === 1 ? "window" : "windows"} waiting` : phase === "recording" ? "Local Whisper · updates after a few seconds · pauses finalize passages" : "Review and edit before using this text. Audio is transcribed on the computer running SoloTask."}</small>
      <div className="prd-actions">{phase === "review" && <Button className="filter-button" type="button" disabled={!transcript.trim() || disabled} onClick={() => { callbacks.current.onText(transcript); setPhase("idle"); setTranscript(""); }}><Check size={14} />Use transcript</Button>}{phase === "error" && <Button className="filter-button" type="button" onClick={() => { failed.current = false; setPhase("finishing"); callbacks.current.onError(""); void pump(); }}><RotateCw size={14} />Retry remaining audio</Button>}{!active && <Button className="text-button" type="button" onClick={() => { session.current++; abort.current?.abort(); queue.current = []; chunks.current = []; texts.current.clear(); cleanup(); setPhase("idle"); setTranscript(""); }}><X size={13} />Discard recording</Button>}</div>
    </>}
  </div>;
}
