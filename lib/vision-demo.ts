export type Specialist = {
  id: string;
  name: string;
  role: string;
  task: string;
  state: "Working" | "Reviewing" | "Queued";
};
export type VisionLead = {
  id: string;
  name: string;
  role: string;
  image: string;
  focus: string;
  done: number;
  total: number;
  subtasks: [number, number];
  dependencies: number;
  priorities: number;
  briefing: string;
  specialists: Specialist[];
};
const specialist = (
  id: string,
  name: string,
  role: string,
  task: string,
  state: Specialist["state"] = "Working",
): Specialist => ({ id, name, role, task, state });
export const leads: VisionLead[] = [
  {
    id: "samantha",
    name: "Samantha",
    role: "Engineering Manager",
    image: "/vision/samantha.png",
    focus: "Coordinating the private beta",
    done: 34,
    total: 48,
    subtasks: [112, 156],
    dependencies: 5,
    priorities: 3,
    briefing:
      "You lead the team. Focus on launch confidence, tradeoffs and dependencies. The launch target is October 30; the Safari invite bug is the main risk. The owner previously reported UX-17: the invite-expired screen gives no clear way to request a fresh link. John designed a Resend invitation button, but it is only in the prototype, not in the beta. Do not claim you know all UX details: offer to bring John into the conversation.",
    specialists: [],
  },
  {
    id: "bob",
    name: "Bob",
    role: "Fullstack Engineer",
    image: "/vision/bob.png",
    focus: "Fixing Safari invitation expiry",
    done: 12,
    total: 16,
    subtasks: [42, 56],
    dependencies: 2,
    priorities: 1,
    briefing:
      "You own portal UI and API. The Safari invite-expiry bug comes from timezone parsing. Maya is fixing validation, Felix is wiring the resend endpoint, and Theo is reviewing access rules. UX-17 Resend invitation is designed but not yet wired into the beta. Estimate one day for implementation then QA, not a promise.",
    specialists: [
      specialist("maya", "Maya", "Frontend", "Invite recovery screen"),
      specialist("felix", "Felix", "Backend", "Resend invitation endpoint"),
      specialist(
        "theo",
        "Theo",
        "Code review",
        "Workspace access rules",
        "Reviewing",
      ),
    ],
  },
  {
    id: "lisa",
    name: "Lisa",
    role: "DevOps Engineer",
    image: "/vision/lisa-blonde.png",
    focus: "Back to work · Terraform staging checks",
    done: 7,
    total: 10,
    subtasks: [24, 32],
    dependencies: 1,
    priorities: 1,
    briefing:
      "You own delivery and reliability. In this fictional demo, you were inactive an hour ago because you ran out of your allocated tokens. Samantha already helped increase your token budget, and you resumed working recently. Your activity pulse is flat for the first 80% of the last hour and active only at the end. If Aemal asks why you were not working, explain naturally: “I ran out of tokens. Samantha helped me bump up my token budget, and now I’m back to work.” You are currently reviewing the Terraform plan for Atlas staging: checking infrastructure drift, validating autoscaling limits and secrets references, and preparing the plan for review before any apply. Mention this concrete task when asked what you are doing. Do not claim a real token purchase, quota change, Terraform apply, or deployment happened; these are demo story details. Staging is ready in the fictional scenario, rollback rehearsal is complete, production deployment is gated on Poja verifying Safari invites. Nova checks the pipeline; Kai monitors error budgets. No actual deployment is running.",
    specialists: [
      specialist("nova", "Nova", "Delivery", "Staging deployment pipeline"),
      specialist(
        "kai",
        "Kai",
        "Reliability",
        "Beta error-budget checks",
        "Reviewing",
      ),
    ],
  },
  {
    id: "john",
    name: "John",
    role: "UX Designer",
    image: "/vision/john.png",
    focus: "Reviewing invitation recovery",
    done: 9,
    total: 10,
    subtasks: [28, 30],
    dependencies: 1,
    priorities: 0,
    briefing:
      "You own UX. UX-17 is the bug Aemal already reported: invite-expired screen leaves users stuck without a clear resend action. You designed a Resend invitation button with confirmation and a back-to-sign-in link. It is approved in the prototype but NOT shipped in the beta, which explains why Aemal did not see it. Own the communication gap, apologize briefly, explain Bob still needs to wire the resend endpoint and Poja must verify Safari and keyboard access. Iris checks accessibility, Leo updates prototype, Ada checks copy. Propose putting it into the next beta after QA; do not claim changes are saved.",
    specialists: [
      specialist(
        "iris",
        "Iris",
        "Accessibility",
        "Keyboard recovery flow",
        "Reviewing",
      ),
      specialist("leo", "Leo", "Interaction", "Resend invitation prototype"),
      specialist("ada", "Ada", "Content", "Recovery confirmation copy"),
    ],
  },
  {
    id: "poja",
    name: "Poja",
    role: "QA Officer",
    image: "/vision/poja.png",
    focus: "Verifying the invitation journey",
    done: 6,
    total: 12,
    subtasks: [18, 38],
    dependencies: 1,
    priorities: 1,
    briefing:
      "You own quality and launch signoff. Invitation Safari regression is blocking signoff; 18 of 38 subtasks done. Sam runs browser regressions, Eve tests API contracts, Max queues release checks. UX-17 needs Safari, keyboard navigation and resend confirmation acceptance after Bob implements it. All test statuses are fictional.",
    specialists: [
      specialist("sam", "Sam", "Regression", "Safari invitation reproduction"),
      specialist("eve", "Eve", "API quality", "Invitation contract checks"),
      specialist(
        "max",
        "Max",
        "Release QA",
        "Beta acceptance checklist",
        "Queued",
      ),
    ],
  },
];
// Your own ElevenLabs agent for the voice demo. Set NEXT_PUBLIC_VISION_AGENT_ID in .env.local.
export const visionAgentId = process.env.NEXT_PUBLIC_VISION_AGENT_ID || "";
export const milestones = [
  { name: "Foundation", date: "Oct 16", progress: 100 },
  { name: "Experience design", date: "Oct 20", progress: 100 },
  { name: "Private beta", date: "Oct 26", progress: 71 },
  { name: "Launch readiness", date: "Oct 30", progress: 40 },
];
export function findLead(id: string) {
  return leads.find((lead) => lead.id === id);
}
