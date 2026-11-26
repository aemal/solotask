import {
  Circle,
  CircleCheck,
  CircleDashed,
  Clock3,
  Eye,
  Ban,
  PauseCircle,
  OctagonAlert,
  Flag,
  ArrowUp,
  ArrowDown,
  Minus,
  ChevronsUp,
} from "lucide-react";
export function StatusIcon({
  status,
  size = 15,
}: {
  status: string;
  size?: number;
}) {
  const Icon =
    (
      {
        done: CircleCheck,
        completed: CircleCheck,
        pending: CircleDashed,
        "in-progress": Clock3,
        review: Eye,
        blocked: OctagonAlert,
        deferred: PauseCircle,
        cancelled: Ban,
      } as const
    )[status as "done"] || Circle;
  return (
    <Icon
      size={size}
      aria-hidden="true"
      className={`status-icon status-${status}`}
    />
  );
}
export function PriorityIcon({
  priority,
  size = 14,
}: {
  priority: string;
  size?: number;
}) {
  const Icon =
    (
      {
        critical: ChevronsUp,
        high: ArrowUp,
        medium: Minus,
        low: ArrowDown,
      } as const
    )[priority as "high"] || Flag;
  return <Icon size={size} aria-hidden="true" />;
}
