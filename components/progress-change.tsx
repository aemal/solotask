import { progressDelta, PROGRESS_WINDOWS, type ProgressSample } from "@/lib/progress-history";
export function ProgressChange({ history, tag = "all", depth = 0, filtered = false, interrupted = false }: { history?: ProgressSample[]; tag?: string; depth?: number; filtered?: boolean; interrupted?: boolean }) {
  const now = Date.now();
  const rows = PROGRESS_WINDOWS.map(window => ({ ...window, delta: filtered || interrupted ? null : progressDelta(history, tag, depth, now, window.ms) }));
  const countChanged = rows.some(row => row.delta?.totalChanged);
  return <div className="progress-change" title="Change in completed share, in percentage points. Based on observations sampled every 30 seconds; task activity can continue without a completion.">
    <table className="progress-change-table" aria-label={`${depth === 1 ? "Subtask" : "Task"} completion changes`}>
      <thead><tr><th scope="col">Period</th><th scope="col">Δ pp</th><th scope="col" title="Net change in completed count">Δ done</th></tr></thead>
      <tbody>{rows.map(({ label, ms, delta }) => {
        const points = delta ? Math.round(delta.points * 10) / 10 : 0;
        return <tr key={ms}>
          <th scope="row">{label}</th>
          {!delta ? <td colSpan={2}>{filtered ? "Clear filters" : interrupted ? "Interrupted" : "Collecting…"}</td> : <>
            <td className={points > 0 ? "positive" : undefined}><strong>{points > 0 ? "+" : ""}{points.toFixed(1)}</strong></td>
            <td title={delta.totalChanged ? "Task count changed during this period" : "Net change in completed count"}>{delta.completed > 0 ? "+" : ""}{delta.completed}{delta.totalChanged && <sup aria-label="Task count changed">*</sup>}</td>
          </>}
        </tr>;
      })}</tbody>
    </table>
    <small className="progress-change-note">pp = percentage points{countChanged && " · * task count changed"}</small>
  </div>;
}
