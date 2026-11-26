"use client";
import { VisionSidebar } from "./sidebar";
import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, Modal } from "@heroui/react";
import {
  Activity,
  ArrowUpRight,
  Check,
  ChevronRight,
  CircleHelp,
  GitBranch,
  Phone,
  Sparkles,
  Users,
  X,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  milestones,
  type VisionLead,
  type Specialist,
} from "@/lib/vision-demo";
import { useVision } from "./session";
import "./vision.css";
export function Avatar({
  lead,
  small = false,
}: {
  lead: VisionLead;
  small?: boolean;
}) {
  if (!lead.image) return <span className={`vision-avatar vision-avatar-unassigned ${small ? "small" : ""}`} aria-label="New QA officer, awaiting a name"><UserRound size={small ? 22 : 42}/></span>;
  return (
    <Image
      className={`vision-avatar ${small ? "small" : ""}`}
      src={lead.image}
      alt={`${lead.name}, ${lead.role}`}
      width={small ? 46 : 106}
      height={small ? 46 : 106}
      sizes={small ? "46px" : "106px"}
    />
  );
}
export function Pulse({
  seed = 0,
  large = false,
  recentlyResumed = false,
}: {
  seed?: number;
  large?: boolean;
  recentlyResumed?: boolean;
}) {
  return (
    <span
      className={`vision-pulse ${large ? "large" : ""}`}
      aria-label={recentlyResumed ? "Simulated agent pulse: inactive for the first 80%, recently resumed working" : "Simulated agent pulse"}
    >
      {Array.from({ length: large ? 64 : 23 }, (_, i) => (
        <i
          key={i}
          // CSSOM rounds long fractions; keep SSR and hydrated styles identical.
          style={{
            height: recentlyResumed && i < Math.floor((large ? 64 : 23) * 0.8) ? "1px" : `${Math.round(18 + (Math.abs(Math.sin((i + 1) * 127.1 + seed * 311.7) * 43758.5453) % 1) * 78)}%`,
            animationDelay: `${(i * -13) / 100}s`,
          }}
        />
      ))}
    </span>
  );
}
function Progress({ value }: { value: number }) {
  return (
    <div
      className="vision-progress"
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label="Simulated completion"
    >
      <span style={{ width: `${value}%` }} />
    </div>
  );
}
export function VisionWorkspace({ view }: { view: "team" | "dashboard" }) {
  const {roster: leads, openCall: open} = useVision();
  const [info, setInfo] = useState(false),
    [worker, setWorker] = useState<{
      worker: Specialist;
      lead: VisionLead;
    } | null>(null);
  return (
    <div className="vision-shell vision-app">
      <VisionSidebar active={view} onBrief={() => setInfo(true)} />
      <main className="vision-main">
        <div className="vision-page-heading">
          <div>
            <div className="vision-eyebrow">
              <span className="vision-dot" /> ATLAS / SPRINT 03
            </div>
            <h1>
              {view === "team"
                ? "Great work starts with a great team."
                : "The big picture. Every moving part."}
            </h1>
            <p>
              {view === "team"
                ? `One shared mission. ${leads.length} teammates to talk to. A whole team behind them.`
                : "A clear view of your team, their work, and what comes next."}
            </p>
          </div>
          <Button className="vision-brief-button" onClick={() => setInfo(true)}>
            <CircleHelp size={16} />
            Project brief
            <ArrowUpRight size={14} />
          </Button>
        </div>
        {view === "team" ? (
          <>
            <div className="vision-chart-heading">
              <span>
                <Users size={15} /> YOUR ENGINEERING TEAM
              </span>
              <span>
                <span className="vision-dot" /> {leads.length} voice-enabled teammates <b>·</b> {leads.reduce((n,p)=>n+p.specialists.length,0)} specialist subagents
              </span>
            </div>
            <section
              className="vision-org"
              aria-label="Engineering team organization chart"
            >
              <div className="vision-boss">
                <LeadNode lead={leads[0]} open={open} />
              </div>
              <div className="vision-branches" style={{gridTemplateColumns:`repeat(${leads.length-1}, minmax(0, 1fr))`}}>
                {leads.slice(1).map((person) => (
                  <div className="vision-branch" key={person.id}>
                    <LeadNode lead={person} open={open} />
                    <div className="vision-workers">
                      {person.specialists.map((w) => (
                        <Button
                          key={w.id}
                          className="vision-worker"
                          onClick={() => setWorker({ worker: w, lead: person })}
                        >
                          <span className="vision-worker-icon">
                            <GitBranch size={15} />
                          </span>
                          <span>
                            <strong>{w.name}</strong>
                            <small>{w.role}</small>
                          </span>
                          <span
                            className={`vision-worker-state ${w.state.toLowerCase()}`}
                            title={w.state}
                          />
                          <ChevronRight size={13} />
                        </Button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </section>
            <div className="vision-chart-footer">
              <span>
                <Phone size={14} /> Talk to any lead. Explore specialist
                activity.
              </span>
              <span>Simulated activity · Real AI conversations</span>
            </div>

          </>
        ) : (
          <Dashboard
            open={open}
            inspect={(w, l) => setWorker({ worker: w, lead: l })}
          />
        )}
        <footer className="vision-footer">
          <span>
            SoloTask Vision <span>·</span> Your team, within reach.
          </span>
          <span>Fictional Atlas project · No live project integration</span>
        </footer>
      </main>
      <Modal.Backdrop isOpen={info} onOpenChange={setInfo}>
        <Modal.Container>
          <Modal.Dialog className="vision-brief-modal">
            <Modal.CloseTrigger
              className="vision-modal-close"
              aria-label="Close project briefing"
            >
              <X size={20} />
            </Modal.CloseTrigger>
            <span className="vision-eyebrow">YOUR DEMO CHEAT SHEET</span>
            <Modal.Heading>Meet Project Atlas.</Modal.Heading>
            <p>
              A customer onboarding portal for a 20-person design agency. One
              place for invitations, client workspaces and project handoffs.
            </p>
            <div className="vision-brief-facts">
              <div>
                <small>LAUNCH TARGET</small>
                <strong>October 30</strong>
              </div>
              <div>
                <small>SPRINT</small>
                <strong>03 · Private beta</strong>
              </div>
              <div>
                <small>PROGRESS</small>
                <strong>34 / 48 tasks</strong>
              </div>
            </div>
            <h3>The story so far</h3>
            <p>
              Design and foundations are complete. The team is preparing a
              private beta. An intermittent Safari invitation-expiry bug is the
              main release risk.
            </p>
            <h3>Your reported bug · UX-17</h3>
            <p>
              You reported that an expired invitation leaves you stuck. John
              designed a <strong>Resend invitation</strong> action, but it is
              still in the prototype. Bob needs to connect the endpoint, and
              Poja needs to verify it. That is why you haven’t seen the fix.
            </p>
            <p>
              <a
                href="/vision/demo"
                target="_blank"
                rel="noreferrer"
                style={{ color: "var(--accent)" }}
              >
                Open the reported invitation screen ↗
              </a>
            </p>
            <h3>Try asking</h3>
            <ul>
              <li>Samantha: “Are we on track for launch?”</li>
              <li>
                “I reported the invite-screen UX bug. Why isn’t it fixed?”
              </li>
              <li>“Please put John in this call.”</li>
              <li>John: “What exactly will change for the user?”</li>
              <li>Poja: “What needs to pass before we ship?”</li>
            </ul>
            <p className="vision-fine-print">
              All project activity is fictional. Voice and text are processed by
              ElevenLabs. Calls do not change tasks or deploy software.
            </p>
            <Button className="primary-button" onClick={() => setInfo(false)}>
              Got it
            </Button>
          </Modal.Dialog>
        </Modal.Container>
      </Modal.Backdrop>
      <Sheet
        open={!!worker}
        onOpenChange={(v) => {
          if (!v) setWorker(null);
        }}
      >
        <SheetContent className="vision-worker-drawer">
          <span className="vision-eyebrow">
            SPECIALIST ACTIVITY / SIMULATED
          </span>
          <SheetTitle>{worker?.worker.name}</SheetTitle>
          <p>
            {worker?.worker.role} · Reports to {worker?.lead.name}
          </p>
          <div className="vision-worker-task">
            <span className="vision-status">
              <span className="vision-dot" />
              {worker?.worker.state}
            </span>
            <h3>{worker?.worker.task}</h3>
            <Pulse large seed={worker ? [...worker.worker.id].reduce((sum, char) => sum + char.charCodeAt(0), 0) : 0} />
          </div>
          <h3>Activity trail</h3>
          <ol className="vision-trail">
            <li>
              <small>Just now</small>Reviewing the current implementation and
              acceptance criteria.
            </li>
            <li>
              <small>4 minutes ago</small>Shared a checkpoint with{" "}
              {worker?.lead.name}.
            </li>
            <li>
              <small>12 minutes ago</small>Picked up the next scoped work item.
            </li>
          </ol>
          <div className="vision-worker-note">
            <GitBranch size={18} />
            <p>
              This specialist works through {worker?.lead.name}. Discuss
              priorities and decisions with their lead.
            </p>
          </div>
          <Button
            onClick={() => {
              if (worker) open(worker.lead);
              setWorker(null);
            }}
          >
            <Phone size={16} />
            Talk to {worker?.lead.name}
          </Button>
        </SheetContent>
      </Sheet>
    </div>
  );
}
function LeadNode({
  lead,
  open,
}: {
  lead: VisionLead;
  open: (lead: VisionLead) => void;
}) {
  return (
    <div className={`vision-person ${lead.id === "samantha" ? "manager" : ""}`}>
      <div className="vision-portrait">
        <Avatar lead={lead} />

      </div>
      <h2>{lead.name}</h2>
      <p>{lead.role}</p>
        <Button
          className="vision-person-call"
          aria-label={`Call ${lead.name}`}
          onClick={() => open(lead)}
        >
          <Phone size={17} />
          <span>Call</span>
        </Button>
      <div className="vision-mini-activity">
        <span className="vision-dot" />
        <span>{lead.id === "samantha" ? "Coordinating" : "Working"}</span>
        <Pulse recentlyResumed={lead.id === "lisa"} seed={[...lead.id].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 0)} />
      </div>
      <small className="vision-person-focus">{lead.focus}</small>
    </div>
  );
}
function Stats({ lead }: { lead: VisionLead }) {
  return (
    <div className="vision-stats">
      {[
        ["Tasks", `${lead.done}`, `/ ${lead.total}`],
        ["Subtasks", `${lead.subtasks[0]}`, `/ ${lead.subtasks[1]}`],
        ["Dependencies", `${lead.dependencies}`, "open"],
        ["Priorities", `${lead.priorities}`, "high"],
      ].map(([label, value, extra]) => (
        <div key={label}>
          <small>{label}</small>
          <strong>
            {value} <em>{extra}</em>
          </strong>
        </div>
      ))}
    </div>
  );
}
function Dashboard({
  open,
  inspect,
}: {
  open: (l: VisionLead) => void;
  inspect: (w: Specialist, l: VisionLead) => void;
}) {
  const {roster: leads} = useVision();
  const specialists = leads.flatMap(p=>p.specialists);
  return (
    <div className="vision-dashboard">
      <Card className="vision-system">
        <div>
          <span className="vision-eyebrow">
            <Activity size={14} /> OVERALL SYSTEM PULSE
          </span>
          <h2>Moving forward, together.</h2>
          <p>{leads.length} teammates · {specialists.filter(p=>p.state!=="Queued").length} specialists active · {specialists.filter(p=>p.state==="Queued").length} queued</p>
        </div>
        <div className="vision-system-pulse">
          <Pulse large />
          <div>
            <span>60 minutes ago</span>
            <span>Simulated · now</span>
          </div>
        </div>
        <span className="vision-status">
          <span className="vision-dot" />
          Team active
        </span>
      </Card>
      <section className="vision-activity-strip">
        <span className="vision-eyebrow">AGENT ACTIVITY</span>
        <span>
          <i className="vision-dot" />
          Bob is fixing invite expiry
        </span>
        <span>
          <i className="vision-dot" />
          John is reviewing UX-17
        </span>
        <span>
          <i className="vision-dot" />
          {leads.some(p=>p.id==="poja") ? `${leads.find(p=>p.id==="poja")!.name} is onboarding` : "QA role is open"}
        </span>
      </section>
      <div className="vision-dashboard-cards">
        {leads.map((person) => (
          <Card
            key={person.id}
            className={`vision-lead-card ${person.id === "samantha" ? "vision-manager-card" : ""}`}
          >
            <div className="vision-lead-header">
              <Button
                className="vision-avatar-button"
                aria-label={`Call ${person.name}`}
                onClick={() => open(person)}
              >
                <Avatar lead={person} small />
              </Button>
              <div>
                <h2>
                  {person.name}
                  <span>{person.id === "samantha" ? "TEAM LEAD" : ""}</span>
                </h2>
                <p>{person.role}</p>
              </div>
              <Button
                className="vision-card-call"
                aria-label={`Call ${person.name}`}
                onClick={() => open(person)}
              >
                <Phone size={16} />
                <span>Call</span>
              </Button>
            </div>
            <div className="vision-card-focus">
              <span className="vision-dot" />
              {person.focus}
              <Pulse recentlyResumed={person.id === "lisa"} seed={[...person.id].reduce((sum, char) => sum * 31 + char.charCodeAt(0), 0)} />
            </div>
            <Stats lead={person} />
            <div className="vision-completion">
              <span>
                {person.id === "samantha"
                  ? "Overall project progress"
                  : "Workstream progress"}
              </span>
              <strong>{Math.round((person.done / person.total) * 100)}%</strong>
            </div>
            <Progress value={Math.round((person.done / person.total) * 100)} />
            <div className="vision-card-team">
              <small>
                {person.id === "samantha" ? "DIRECT REPORTS" : "SPECIALISTS"}
              </small>
              <div>
                {person.id === "samantha"
                  ? leads.slice(1).map((l) => (
                      <Button
                        key={l.id}
                        onClick={() => open(l)}
                        className="vision-team-chip"
                      >
                        <Avatar lead={l} small />
                        {l.name}
                        <Phone size={11} />
                      </Button>
                    ))
                  : person.specialists.map((w) => (
                      <Button
                        className="vision-team-chip specialist"
                        key={w.id}
                        onClick={() => inspect(w, person)}
                      >
                        <span className="vision-initial-avatar">
                          {w.name.slice(0, 1)}
                        </span>
                        <span>
                          {w.name}
                          <small>{w.state}</small>
                        </span>
                        <ChevronRight size={12} />
                      </Button>
                    ))}
              </div>
            </div>
          </Card>
        ))}
      </div>
      <section className="vision-milestones">
        <div className="vision-section-heading">
          <h2>Milestones at a glance</h2>
          <span>Next up: private beta · October 26</span>
        </div>
        <div>
          {milestones.map((m, i) => (
            <Card className="vision-milestone" key={m.name}>
              <span
                className={`vision-milestone-icon ${m.progress === 100 ? "done" : ""}`}
              >
                {m.progress === 100 ? (
                  <Check size={17} />
                ) : (
                  String(i + 1).padStart(2, "0")
                )}
              </span>
              <small>{m.date}</small>
              <h3>{m.name}</h3>
              <Progress value={m.progress} />
              <p>
                {m.progress === 100 ? "Complete" : `${m.progress}% complete`}
              </p>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
