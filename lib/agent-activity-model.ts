export const agentStates = ["working", "waiting", "idle", "completed"] as const;
export type AgentState = typeof agentStates[number];
export type AgentSignal = { sessionId: string; status: AgentState; detail: string; at: string };
export type AgentActivity = { signals: AgentSignal[]; warning?: string };
export function currentAgents(activity: AgentActivity | undefined, now = Date.now()) {
  const latest = new Map<string, AgentSignal>();
  for (const signal of activity?.signals || []) {
    if (!latest.has(signal.sessionId) || Date.parse(signal.at) > Date.parse(latest.get(signal.sessionId)!.at)) latest.set(signal.sessionId, signal);
  }
  return [...latest.values()].map(signal => ({ ...signal, stale: !!activity?.warning || !Number.isFinite(Date.parse(signal.at)) || now - Date.parse(signal.at) > 120000 || Date.parse(signal.at) > now }));
}
