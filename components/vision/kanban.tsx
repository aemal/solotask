"use client";
import { VisionSidebar } from "./sidebar";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { Card, Tabs } from "@heroui/react";
import {
  Columns3,
  Users,
  Flag,
  Search,
  ArrowUpRight,
  GitBranch,
  CheckCircle2,
  Tag,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { TaskComments } from "@/components/task-comments";
import {
  Select,
  SelectTrigger,
  SelectContent,
  SelectItem,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { useVision } from "./session";
import {
  demoTasks,
  releaseOwnerDecision,
  statusLabels,
  kanbanColumns,
  completedDemoStep,
  type DemoTask,
} from "@/lib/vision-kanban";
import "./vision.css";
import "./feedback.css";
import {useFeedbackData,selectFeedbackRound} from "./feedback-data";
import type {FeedbackTicket} from "@/lib/vision-feedback-types";
const ticketNumber=(id:string)=>id.startsWith("FB-")?`FB-${id.slice(3,11).toUpperCase()}`:id;
export function VisionKanban() {
  const {roster} = useVision();
  const feedback=useFeedbackData();
  const [roundFilter,setRoundFilter]=useState("all");
  useEffect(()=>{const round=new URLSearchParams(window.location.search).get("round");if(round){setRoundFilter(round);selectFeedbackRound(round);}},[]);
  const filterRound=(id:string)=>{setRoundFilter(id);selectFeedbackRound(id==="all"?"":id);};
  const people = [{id:'aemal',name:'Aemal',role:'Your decisions',image:'/vision/aemal.png'}, ...roster.map(p=>({...p,image:p.image||'/vision/unassigned.svg'}))];
  const [released,setReleased]=useState<string[]>([]),[handoff,setHandoff]=useState<DemoTask|null>(null);
  const board=useRef<HTMLDivElement>(null);
  useEffect(()=>{try{const value=JSON.parse(localStorage.getItem('vision-released-decisions-v1')||'[]');if(Array.isArray(value))setReleased(value.filter(id=>typeof id==='string'));}catch{}},[]);
  const tasks: (DemoTask|FeedbackTicket)[]=[...demoTasks.map(t=>released.includes(t.id)?releaseOwnerDecision(t):t),...feedback.tickets];
  const [mode, setMode] = useState("human"),
    [person, setPerson] = useState("all"),
    [priority, setPriority] = useState("all"),
    [query, setQuery] = useState(""),
    [selection, setSelected] = useState<DemoTask | null>(null);
  const selected=tasks.find(t=>t.id===selection?.id)||selection;
  const selectedFeedback=selected&&"roundId" in selected?selected as FeedbackTicket:null;
  const visible = tasks.filter(
    (t) =>
      people.some(p=>p.id===t.owner) &&
      (roundFilter==="all" || ("roundId" in t && t.roundId===roundFilter)) &&
      (person === "all" || t.owner === person) &&
      (priority === "all" || t.priority === priority) &&
      `${t.title} ${t.summary} ${t.id}`
        .toLowerCase()
        .includes(query.toLowerCase()),
  );
  const owner = people.find((p) => p.id === selected?.owner) || people.find(p=>p.id==='samantha')!;
  return (
    <div className="vision-shell vision-app">
      <VisionSidebar active={"kanban"} />
      <main className="vision-main vision-board-main">
        <div className="vision-page-heading">
          <div>
            <div className="vision-eyebrow">
              <span className="vision-dot" /> ATLAS / SPRINT 03
            </div>
            <h1>Clear outcomes. Shared ownership.</h1>
            <p>Your decisions and your team’s work, connected in one place.</p>
          </div>
          <span className="vision-preview">SIMULATED PROJECT DATA</span>
        </div>
        {handoff && <div className="vision-handoff-notice" role="status"><CheckCircle2 size={18}/><span>{handoff.id} moved to Ready · assigned to {people.find(p=>p.id===handoff.owner)?.name}.</span><Button className="text-button" onClick={()=>{setPerson('all');setPriority('all');setQuery(handoff.id);setSelected(null);board.current?.scrollTo({left:0,behavior:'smooth'});}}>View card</Button></div>}
        <div className="vision-board-toolbar">
          <Tabs
            selectedKey={mode}
            onSelectionChange={(key) => setMode(String(key))}
          >
            <Tabs.ListContainer>
              <Tabs.List aria-label="Task detail level">
                <Tabs.Tab id="human">
                  Human view
                  <Tabs.Indicator />
                </Tabs.Tab>
                <Tabs.Tab id="agent">
                  Agent view
                  <Tabs.Indicator />
                </Tabs.Tab>
              </Tabs.List>
            </Tabs.ListContainer>
          </Tabs>
          <div className="vision-board-filters">
            {feedback.rounds.length>0&&<Select value={roundFilter} onValueChange={filterRound}><SelectTrigger className="feedback-round-filter" aria-label="Filter feedback round"><Tag size={16}/>{feedback.rounds.find(r=>r.id===roundFilter)?.name||'All feedback rounds'}</SelectTrigger><SelectContent><SelectItem value="all">All feedback rounds</SelectItem>{feedback.rounds.map(r=><SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}</SelectContent></Select>}

            <label className="vision-board-search">
              <Search size={16} />
              <input
                aria-label="Search demo tasks"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Find an outcome…"
              />
            </label>
            <Select value={person} onValueChange={setPerson}>
              <SelectTrigger aria-label="Filter by person">
                <span className="vision-person-option">
                  {person === "all" ? (
                    <Users size={18} />
                  ) : (
                    <Image
                      src={people.find((p) => p.id === person)!.image}
                      alt=""
                      width={24}
                      height={24}
                    />
                  )}
                  <span>
                    {person === "all"
                      ? "Everyone"
                      : people.find((p) => p.id === person)!.name}
                  </span>
                </span>
              </SelectTrigger>
              <SelectContent className="vision-filter-menu">
                <SelectItem value="all" textValue="Everyone">
                  <span className="vision-person-option">
                    <Users size={24} />
                    <span>Everyone</span>
                  </span>
                </SelectItem>
                {people.map((p) => (
                  <SelectItem key={p.id} value={p.id} textValue={p.name}>
                    <span className="vision-person-option">
                      <Image src={p.image} alt="" width={28} height={28} />
                      <span>{p.name}</span>
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger aria-label="Filter by priority">
                <span className={`vision-priority ${priority}`}>
                  <Flag size={15} />
                  {priority === "all"
                    ? "All priorities"
                    : `${priority[0].toUpperCase()}${priority.slice(1)} priority`}
                </span>
              </SelectTrigger>
              <SelectContent className="vision-filter-menu">
                {["all", "high", "medium", "low"].map((value) => (
                  <SelectItem
                    key={value}
                    value={value}
                    textValue={
                      value === "all" ? "All priorities" : `${value} priority`
                    }
                  >
                    <span className={`vision-priority ${value}`}>
                      <Flag size={15} />
                      {value === "all"
                        ? "All priorities"
                        : `${value[0].toUpperCase()}${value.slice(1)} priority`}
                    </span>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="vision-board-note">
          <span>
            {mode === "human"
              ? "One card is one outcome. Open it for the story, progress and decisions."
              : "One outcome expands into implementation tasks and subtasks. Open any card for the full specification."}
          </span>
          <strong>
            {visible.length} outcomes ·{" "}
            {visible.reduce((n, t) => n + t.steps.length, 0)} implementation
            tasks
          </strong>
        </div>
        {feedback.error&&<p role="alert">{feedback.error}</p>}
        {feedback.tickets.length>0&&<div className="feedback-concurrency" aria-label="Parallel feedback workers">{roster.filter(p=>p.id!=='samantha').map(p=>{const active=feedback.tickets.filter(t=>t.owner===p.id&&t.status==='in-progress');return <div className="feedback-capacity" key={p.id}><Image src={p.image||'/vision/unassigned.svg'} alt="" width={26} height={26}/><span>{p.name} · {active.length}/3 feedback workers</span><span className="feedback-capacity-slots" aria-hidden="true">{[0,1,2].map(i=><i className={i<active.length?'active':''} key={i}/>)}</span></div>;})}<span className="feedback-awaiting">Simulated parallel execution · three slots per teammate</span></div>}
        <div className="vision-kanban" ref={board} aria-label={`${mode} work board`}>
          {kanbanColumns.map((column) => {
            const tasks = visible.filter((t) => t.status === column.id);
            return (
              <section
                className={`vision-lane ${column.id === "pending-aemal" ? "owner-lane" : ""}`}
                key={column.id}
              >
                <header>
                  {column.id === "pending-aemal" ? (
                    <Image
                      src="/vision/aemal.png"
                      alt="Aemal"
                      width={42}
                      height={42}
                    />
                  ) : (
                    <span className="vision-column-mark">
                      <Columns3 size={18} />
                    </span>
                  )}
                  <div>
                    <div className="vision-lane-title">
                      <h2>{statusLabels[column.id]}</h2>
                      <span
                        className="vision-lane-count"
                        aria-label={`${tasks.length} outcomes`}
                      >
                        {tasks.length}
                      </span>
                    </div>
                    <p>{column.description}</p>
                  </div>
                </header>
                <div className="vision-lane-cards">
                  {tasks.length === 0 ? (
                    <p className="vision-empty">
                      No matching outcomes.
                      <br />
                      Try another filter.
                    </p>
                  ) : (
                    tasks.map((task) => (
                      <Card key={task.id} className="vision-task-card">
                        <button
                          onClick={() => {setSelected(task);if("roundId" in task)selectFeedbackRound(task.roundId);}}
                          aria-label={`Open ${task.title}`}
                        >
                          <div className="vision-task-meta">
                            <span
                              className={`vision-priority ${task.priority}`}
                            >
                              <Flag size={11} />
                              {task.priority}
                            </span>
                            <span aria-label={`Ticket ${task.id}`}>
                              {ticketNumber(task.id)}
                            </span>
                          </div>
                          <h3>{task.title}</h3>
                          {"roundName" in task&&<span className="feedback-round-tag"><Tag size={12}/>{task.roundName}</span>}
                          <div className="vision-card-assignee">
                            <Image
                              src={
                                people.find((p) => p.id === task.owner)!.image
                              }
                              alt=""
                              width={24}
                              height={24}
                            />
                            <span>
                              {people.find((p) => p.id === task.owner)!.name}
                            </span>
                          </div>
                          {mode === "human" ? (
                            <p>{task.summary}</p>
                          ) : (
                            <div className="vision-implementation-list">
                              {task.steps.length===0&&<p className="feedback-awaiting">Awaiting Samantha’s implementation brief.</p>}
                              {task.steps.map((step, i) => (
                                <div key={step}>
                                  <span>
                                    {ticketNumber(task.id)}.{i + 1}
                                  </span>
                                  {step}
                                  <small>
                                    {completedDemoStep(task, i)
                                      ? "2 / 2"
                                      : "0 / 2"}{" "}
                                    subtasks
                                  </small>
                                </div>
                              ))}
                            </div>
                          )}
                          <footer>
                            <span>
                              {task.owner === "aemal"
                                ? "Your input needed"
                                : `${task.steps.length} connected tasks`}
                            </span>
                            <ArrowUpRight size={15} />
                          </footer>
                        </button>
                      </Card>
                    ))
                  )}
                </div>
              </section>
            );
          })}
        </div>
        <p className="vision-board-footnote">
          Demo board. Feedback screenshots and notes are saved locally. Team assignment and progress are simulated; no coding runs are started.
        </p>
      </main>
      <Sheet
        open={!!selected}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      >
        <SheetContent
          className="vision-task-detail"
          closeLabel="Close task details"
        >
          {selected && (
            <>
              <div className="vision-eyebrow">
                {mode === "human" ? "OUTCOME BRIEF" : "AGENT SPECIFICATION"} ·{" "}
                {ticketNumber(selected.id)}
              </div>
              <SheetTitle>{selected.title}</SheetTitle>
              <p className="vision-detail-summary">{selected.summary}</p>
              <div className="vision-detail-owner">
                <Image
                  src={owner!.image}
                  alt={owner!.name}
                  width={38}
                  height={38}
                />
                <div>
                  <strong>{owner!.name}</strong>
                  <p>{owner!.role}</p>
                </div>
                <span>{statusLabels[selected.status]}</span>
              </div>
              <div className="vision-detail-facts">
                <div>
                  <small>Priority</small>
                  <strong>{selected.priority}</strong>
                </div>
                <div>
                  <small>Milestone</small>
                  <strong>{selected.milestone}</strong>
                </div>
                <div>
                  <small>Source</small>
                  <strong>{selectedFeedback?selectedFeedback.roundName:"Demo fixture"}</strong>
                </div>
              </div>
              {selectedFeedback&&<section><h3>Your feedback</h3><figure className="feedback-ticket-image"><a href={selectedFeedback.imageUrl} target="_blank" rel="noreferrer"><img src={selectedFeedback.imageUrl} alt={selectedFeedback.title}/></a><figcaption>Permanent annotated screenshot · Open for full size</figcaption></figure><p className="feedback-detail-note">{selectedFeedback.ownerNotes}</p>{selectedFeedback.clarification?.map((text,i)=><p key={i} className="feedback-detail-note">{text}</p>)}<Link href={`/vision/feedback?round=${encodeURIComponent(selectedFeedback.roundId)}`}>Review feedback round</Link></section>}
              {selectedFeedback?.questions?.length ? <section><h3>Questions to clarify</h3><ul>{selectedFeedback.questions.map(q=><li key={q}>{q}</li>)}</ul></section>:null}
              {selected.decision && (
                <section className="vision-decision">
                  <h3>Your decision</h3>
                  <p>{selected.decision}</p>
                </section>
              )}
              <section>
                <h3>
                  {mode === "human"
                    ? "What happens next"
                    : "Implementation details"}
                </h3>
                <p>
                  {selectedFeedback&&!selectedFeedback.enriched?"Your review is ready. Discuss it with Samantha, then ask her to hand it to the team.":selectedFeedback?.technicalDetails|| (mode === "human"
                    ? "The owner coordinates this work with their specialists. You can discuss the outcome with them."
                    : "Implement against the Atlas staging fixture. Preserve existing behavior, handle loading and failure states, and document the outcome. All IDs and progress below are simulated.")}
                </p>
              </section>
              <section>
                <h3>
                  <GitBranch size={16} />{" "}
                  {mode === "human" ? "Connected work" : "Tasks and subtasks"}
                </h3>
                {selected.steps.length===0&&<p className="feedback-awaiting">Samantha will add the implementation tasks after your handoff. Keep this ticket open to see the brief expand.</p>}
                {selected.steps.map((step, i) => (
                  <div className="vision-detail-step" key={step}>
                    <strong>
                      <span>
                        {mode === "agent"
                          ? `${ticketNumber(selected.id)}.${i + 1}`
                          : String(i + 1).padStart(2, "0")}
                      </span>
                      {step}
                    </strong>
                    {mode === "agent" && (
                      <>
                        <p>
                          <b>Status:</b>{" "}
                          {completedDemoStep(selected, i) ? "done" : "pending"}{" "}
                          · <b>Priority:</b> {selected.priority} · <b>Owner:</b>{" "}
                          {owner!.name}
                        </p>
                        <ul>
                          <li>
                            {ticketNumber(selected.id)}.{i + 1}.1 · Define acceptance criteria
                            and edge cases
                          </li>
                          <li>
                            {ticketNumber(selected.id)}.{i + 1}.2 · Implement, verify and
                            record evidence
                          </li>
                        </ul>
                        <p>
                          <b>Details:</b> {step} for the Atlas private beta;
                          cover empty, error and success states and preserve
                          accessibility.
                        </p>
                        <p>
                          <b>Test strategy:</b> Verify the expected path,
                          failure recovery and keyboard operation; record the
                          result before marking complete.
                        </p>
                      </>
                    )}
                  </div>
                ))}
              </section>
              <section>
                <h3>Dependencies</h3>
                {selected.dependencies.length ? (
                  selected.dependencies.map((id) => {
                    const related = tasks.find((t) => t.id === id);
                    return (
                      <Button
                        key={id}
                        onClick={() => related && setSelected(related)}
                        className="vision-dependency-link"
                      >
                        {id} · {related?.title}
                        <ArrowUpRight size={14} />
                      </Button>
                    );
                  })
                ) : (
                  <p>No upstream blockers.</p>
                )}
              </section>
              <section>
                <h3>
                  <CheckCircle2 size={16} /> Acceptance criteria
                </h3>
                {selectedFeedback?selectedFeedback.acceptanceCriteria?.length?<ul>{selectedFeedback.acceptanceCriteria.map(c=><li key={c}>{c}</li>)}</ul>:<p>To be clarified with Samantha.</p>:<p>The outcome works for the intended user, handles failures clearly, passes the owner’s review and has verification evidence.</p>}
              </section>
              {mode === "agent" && (
                <>
                  <section>
                    <h3>Test strategy</h3>
                    <p>
                      Exercise the success path and invalid inputs. Check
                      keyboard access and responsive layout. Run focused unit
                      and integration checks, then ask Poja to verify the user
                      journey.
                    </p>
                  </section>
                  <section>
                    <h3>Simulated activity</h3>
                    <p>
                      <b>Samantha:</b> Keep the scope focused on the beta
                      outcome. Surface blockers before implementation.
                    </p>
                    <p>
                      <b>Demo agent:</b> Specification reviewed. Awaiting
                      dependent work where applicable.
                    </p>
                    <small>
                      Simulated comments · no live logs or Task Master
                      connection.
                    </small>
                  </section>
                </>
              )}
              <TaskComments
                key={ticketNumber(selected.id)}
                projectId="vision-demo"
                mentionPeople={roster}
                taskKey={ticketNumber(selected.id)}
                endpointOverride={`/api/vision-comments?key=${encodeURIComponent(selected.id)}`}
                hint={selected.status==='pending-aemal'?"Post your feedback to return this card to Ready for the responsible teammate. Type or dictate, then post.":"Saved for this demo ticket only. Type or dictate, then post. Real project tickets are unchanged."}
                onCommentPosted={()=>{
                  if(selected.status!=='pending-aemal')return;
                  const next=releaseOwnerDecision(selected);
                  setReleased(old=>{const ids=[...new Set([...old,selected.id])];try{localStorage.setItem('vision-released-decisions-v1',JSON.stringify(ids));}catch{}return ids;});
                  setSelected(next);setHandoff(next);
                }}
              />
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}
