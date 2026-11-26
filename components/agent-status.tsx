"use client";
import { useEffect, useState } from "react";
import { Bot } from "lucide-react";
import { currentAgents, type AgentActivity } from "@/lib/agent-activity-model";
import { elapsedLabel } from "@/lib/question-time";
const labels = { working: "Working", waiting: "Waiting for you", idle: "Idle", completed: "Completed" };
export function AgentStatus({ activity }: { activity?: AgentActivity }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 10000); return () => clearInterval(timer); }, []);
  const agents = currentAgents(activity, now);
  const bins = Array.from({ length: 40 }, () => 0);
  for (const signal of activity?.signals || []) {
    const age = now - Date.parse(signal.at);
    if (age >= 0 && age < 3600000) bins[39 - Math.floor(age / 90000)]++;
  }
  return <section className="agent-status-strip" aria-label="Agent activity">
    <div className="agent-status-title"><Bot size={16} /><strong>Agent activity</strong><small>Explicit agent reports</small></div>
    {!agents.length ? <p>No agent reports received</p> : <div className="agent-status-list">{agents.map(agent => <div key={agent.sessionId} className={`agent-status-entry ${agent.stale ? "unknown" : agent.status}`}>
      <span className="agent-status-dot" /><strong>{agent.stale ? "Unknown · signal expired" : labels[agent.status]}</strong>
      <span title={agent.sessionId}>{agent.sessionId.length > 32 ? `${agent.sessionId.slice(0, 29)}…` : agent.sessionId}</span>
      <time dateTime={agent.at} title={new Date(agent.at).toLocaleString()}>Last report {elapsedLabel(agent.at, now) || "unknown"} ago</time>
      {agent.detail && <small>{agent.stale ? "Last activity: " : ""}{agent.detail}</small>}
    </div>)}</div>}
    {!agents.length && <p>Connect this project’s SoloTask MCP bridge and have the agent call report_agent_activity at checkpoints. A linked chat or a running task does not send reports automatically.</p>}
    {activity?.warning && <p>{activity.warning}</p>}
    <svg viewBox="0 0 400 12" preserveAspectRatio="none" role="img" aria-label="Agent reports over the last hour. Gaps mean no report, not necessarily a stopped agent.">{bins.map((count, i) => <rect key={i} x={i * 10} y="2" width="6" height="8" rx="2" fill={count ? "var(--accent)" : "var(--border)"}><title>{count} agent reports · {Math.round((40 - i) * 1.5)} min ago</title></rect>)}</svg>
    <small>Signals expire after 2 minutes. Gaps mean no report; they do not prove the agent stopped.</small>
  </section>;
}
