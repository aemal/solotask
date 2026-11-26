export type DemoTask = {
  id: string;
  owner: string;
  title: string;
  summary: string;
  priority: "high" | "medium" | "low";
  status:
    | "open"
    | "in-progress"
    | "deployed"
    | "qa"
    | "cancelled"
    | "completed"
    | "pending-aemal";
  milestone: string;
  decision?: string;
  steps: string[];
  dependencies: string[];
};
export const demoTasks: DemoTask[] = [
  {
    id: "ENG-48",
    owner: "bob",
    title: "Keep project drafts safe between visits",
    summary: "A separate implementation worker is adding draft recovery while Bob’s other worker handles live project updates. Simulated work.",
    priority: "medium",
    status: "in-progress",
    milestone: "Private beta",
    steps: ["Persist unsent project drafts locally", "Restore the latest draft after reopening", "Verify interrupted saves preserve owner changes"],
    dependencies: [],
  },
  {
    id: "OPS-18",
    owner: "lisa",
    title: "Automate staging database recovery checks",
    summary: "A second delivery worker is checking backup restoration independently of Lisa’s service health monitoring. Simulated work.",
    priority: "high",
    status: "in-progress",
    milestone: "Private beta",
    steps: ["Create an isolated restore target", "Verify restored records and access rules", "Document recovery time and rollback steps"],
    dependencies: [],
  },
  {
    id: "UX-25",
    owner: "john",
    title: "Make empty projects easy to get started with",
    summary: "A separate design worker is refining empty-state guidance while John’s other worker reviews invitation recovery. Simulated work.",
    priority: "medium",
    status: "in-progress",
    milestone: "Private beta",
    steps: ["Design a clear first-action empty state", "Write helpful guidance for new project owners", "Review contrast and keyboard focus"],
    dependencies: [],
  },
  {
    id: "UX-17",
    owner: "john",
    title: "Make expired invitations recoverable",
    summary:
      "People hit a dead end when an invitation expires. Give them a clear way back into Atlas.",
    priority: "high",
    status: "in-progress",
    milestone: "Private beta",
    steps: [
      "Design the expired invitation recovery state",
      "Specify resend confirmation and error states",
      "Review keyboard and screen-reader flow",
    ],
    dependencies: [],
  },
  {
    id: "UX-21",
    owner: "john",
    title: "Make the first five minutes feel effortless",
    summary:
      "Simplify onboarding so new teammates reach their first project without help.",
    priority: "medium",
    status: "qa",
    milestone: "Private beta",
    steps: [
      "Map first-run journey",
      "Prototype a shorter welcome flow",
      "Review usability findings",
    ],
    dependencies: ["UX-17"],
  },
  {
    id: "ENG-42",
    owner: "bob",
    title: "Ship the invitation recovery flow",
    summary:
      "Connect the approved recovery design to a safe resend action. This is proposed work, not shipped.",
    priority: "high",
    status: "open",
    milestone: "Private beta",
    steps: [
      "Add invitation status endpoint",
      "Implement resend action with rate limiting",
      "Connect recovery and confirmation screens",
      "Add integration coverage",
    ],
    dependencies: ["UX-17"],
  },
  {
    id: "ENG-45",
    owner: "bob",
    title: "Keep project updates in sync",
    summary:
      "Ensure teammates see the latest project state without refreshing the page.",
    priority: "medium",
    status: "in-progress",
    milestone: "Team collaboration",
    steps: [
      "Define update event contract",
      "Implement reconnect handling",
      "Test concurrent edits",
    ],
    dependencies: [],
  },
  {
    id: "OPS-12",
    owner: "lisa",
    title: "Keep the beta healthy",
    summary:
      "Watch service health and alert the team before an interruption affects customers.",
    priority: "high",
    status: "in-progress",
    milestone: "Private beta",
    steps: [
      "Configure service health probes",
      "Route actionable alerts",
      "Exercise incident runbook",
    ],
    dependencies: [],
  },
  {
    id: "OPS-14",
    owner: "lisa",
    title: "Make releases easy to roll back",
    summary: "Give every beta release a predictable, rehearsed rollback path.",
    priority: "medium",
    status: "qa",
    milestone: "Private beta",
    steps: [
      "Version deployment artifacts",
      "Test rollback in staging",
      "Document release checklist",
    ],
    dependencies: ["OPS-12"],
  },
  {
    id: "QA-31",
    owner: "poja",
    title: "Verify the invitation fix end to end",
    summary:
      "Reproduce the dead end, then verify the fix across browsers and accessibility tools.",
    priority: "high",
    status: "open",
    milestone: "Private beta",
    steps: [
      "Record UX-17 reproduction",
      "Cover expired, revoked and reused links",
      "Verify keyboard navigation",
      "Run browser regression suite",
    ],
    dependencies: ["ENG-42"],
  },
  {
    id: "QA-34",
    owner: "poja",
    title: "Protect the happy path",
    summary:
      "Check sign-in, project creation and team invitations before the next release.",
    priority: "medium",
    status: "in-progress",
    milestone: "Private beta",
    steps: [
      "Run core journey smoke tests",
      "Triage failures with Bob",
      "Publish release confidence report",
    ],
    dependencies: [],
  },
  {
    id: "EM-08",
    owner: "samantha",
    title: "Bring the beta across the finish line",
    summary:
      "Align owners, remove blockers and keep the launch focused on the essentials.",
    priority: "high",
    status: "in-progress",
    milestone: "Private beta",
    steps: [
      "Review critical dependencies",
      "Agree scope with Aemal",
      "Coordinate engineering handoff",
    ],
    dependencies: ["QA-31", "OPS-14"],
  },
  {
    id: "EM-10",
    owner: "samantha",
    title: "Turn feedback into the next sprint",
    summary: "Group beta feedback into a small, actionable set of outcomes.",
    priority: "low",
    status: "qa",
    milestone: "Team collaboration",
    steps: [
      "Cluster customer feedback",
      "Estimate candidate outcomes",
      "Draft next sprint proposal",
    ],
    dependencies: [],
  },
  {
    id: "OWN-01",
    owner: "aemal",
    title: "Approve the invitation recovery approach",
    summary:
      "John recommends a resend button, clear confirmation and a sign-in fallback.",
    priority: "high",
    status: "pending-aemal",
    milestone: "Private beta",
    decision:
      "Approve the proposed experience or tell John what should change. Posting your comment returns this demo card to Ready for John.",
    steps: [
      "Review recovery design",
      "Confirm the proposed user experience",
      "Hand decision to Samantha",
    ],
    dependencies: ["UX-17"],
  },
  {
    id: "OWN-02",
    owner: "aemal",
    title: "Choose the first beta cohort",
    summary:
      "The team needs your call on who receives the first round of invitations.",
    priority: "medium",
    status: "pending-aemal",
    milestone: "Private beta",
    decision:
      "Choose a small initial cohort so the team can respond quickly to feedback.",
    steps: [
      "Review proposed cohort criteria",
      "Confirm invitation scope",
      "Approve rollout timing",
    ],
    dependencies: ["EM-08"],
  },
  {
    id: "OWN-03",
    owner: "aemal",
    title: "Review next sprint priorities",
    summary: "Samantha has a proposal ready for your feedback.",
    priority: "low",
    status: "pending-aemal",
    milestone: "Team collaboration",
    decision:
      "Decide whether onboarding or collaboration improvements should come next.",
    steps: ["Review the proposed outcomes", "Confirm business priority"],
    dependencies: ["EM-10"],
  },
  {
    id: "ENG-38",
    owner: "bob",
    title: "Give every client a dedicated workspace",
    summary: "The new workspace home is available in the beta environment.",
    priority: "medium",
    status: "deployed",
    milestone: "Private beta",
    steps: [
      "Build workspace home",
      "Deploy to beta",
      "Verify deployment health",
    ],
    dependencies: [],
  },
  {
    id: "OPS-09",
    owner: "lisa",
    title: "Deploy service health monitoring",
    summary:
      "Health probes and alert routing are running in the beta environment.",
    priority: "high",
    status: "deployed",
    milestone: "Private beta",
    steps: ["Configure health probes", "Deploy alert routing"],
    dependencies: [],
  },
  {
    id: "UX-12",
    owner: "john",
    title: "Complete the onboarding design foundation",
    summary:
      "Core navigation and onboarding patterns are reviewed and approved.",
    priority: "medium",
    status: "completed",
    milestone: "Foundation",
    steps: ["Review navigation", "Approve core patterns"],
    dependencies: [],
  },
  {
    id: "QA-22",
    owner: "poja",
    title: "Verify secure sign-in",
    summary: "Sign-in and session-expiry checks passed the release checklist.",
    priority: "high",
    status: "completed",
    milestone: "Foundation",
    steps: ["Run session tests", "Review security checklist"],
    dependencies: [],
  },
  {
    id: "EM-04",
    owner: "samantha",
    title: "Add custom themes to the beta",
    summary:
      "Removed from beta scope so the team can focus on reliable onboarding.",
    priority: "low",
    status: "cancelled",
    milestone: "Private beta",
    steps: ["Evaluate theme scope", "Document scope decision"],
    dependencies: [],
  },
];
export const statusLabels = {
  open: "Ready",
  "in-progress": "In Progress",
  deployed: "Deployed",
  qa: "QA",
  cancelled: "Cancelled",
  completed: "Completed",
  "pending-aemal": "Pending for Aemal",
};
export const kanbanColumns = [
  { id: "open", description: "Ready to pick up" },
  { id: "in-progress", description: "Work underway" },
  { id: "deployed", description: "Available in beta" },
  { id: "qa", description: "Being verified" },
  { id: "cancelled", description: "Removed from scope" },
  { id: "completed", description: "Verified and finished" },
  { id: "pending-aemal", description: "Your decisions" },
] as const;
export function completedDemoStep(task: DemoTask, index: number) {
  return (
    task.status === "completed" ||
    task.status === "deployed" ||
    (index === 0 && ["in-progress", "qa"].includes(task.status))
  );
}

export function releaseOwnerDecision(task: DemoTask): DemoTask {
 if(task.status!=="pending-aemal"||task.owner!=="aemal") return task;
 return {...task,status:"open",owner:task.id==="OWN-01"?"john":"samantha",decision:"Aemal has left feedback. The responsible teammate can pick this up from Ready."};
}
