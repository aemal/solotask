import { leads, type VisionLead } from './vision-demo';
export type HiringState = { stage: 'vacant' | 'draft' | 'hired' | 'named'; document: string; revision: number; approvedRevision: number | null; name: string };
export const emptyHiring: HiringState = {stage:'vacant',document:'',revision:0,approvedRevision:null,name:''};
export const qaJobDescription = `# QA Officer
## Mission
Own release confidence for Atlas, our customer onboarding portal. Report to Samantha and partner with Bob, John and Lisa.
## Responsibilities
- Reproduce UX-17: expired invitations must offer a clear resend action.
- Verify Safari, Chrome and mobile invitation journeys.
- Test keyboard navigation, screen-reader labels and accessible error states.
- Maintain Playwright regression tests and API contract checks.
- Record reproducible bugs with screenshots, expected results and severity.
- Review staging with Lisa and give a clear go/no-go recommendation.
## Working agreement
Keep updates concise. Escalate blockers to Samantha. No production deployment without owner approval.
## First assignment
Validate the resend-invitation experience on staging with Bob and John. Share evidence and a release recommendation with Aemal.
## Success criteria
Critical invitation paths pass, accessibility blockers are documented, and every release decision has supporting test evidence.`;
export type HiringCommand = {action:string; content?:string; revision?:string};
export function applyHiringCommand(state: HiringState, command: HiringCommand): HiringState {
  const {action,content=''}=command;
  if(action==='read') return state;
  if(action==='draft') {
    if(state.stage!=='vacant') return state;
    return {...state,stage:'draft',document:content.trim() || qaJobDescription,revision:1};
  }
  if(action==='revise') {
    if(state.stage!=='draft') throw Error('Only a draft can be revised.');
    if(Number(command.revision)!==state.revision) throw Error('The document changed. Read the latest version before revising.');
    if(!content.trim() || content.length>20000) throw Error('Provide a job description of 1–20,000 characters.');
    return {...state,document:content,revision:state.revision+1};
  }
  if(action==='approve') {
    if(state.stage==='hired'||state.stage==='named') return state;
    if(state.stage!=='draft'||!state.document.trim()) throw Error('Draft and review a job description before hiring.');
    if(Number(command.revision)!==state.revision) throw Error('The job description changed. Read the current version and get approval for it.');
    return {...state,stage:'hired',approvedRevision:state.revision};
  }
  if(action==='name') {
    if(state.stage!=='hired'&&state.stage!=='named') throw Error('The QA officer has not been hired yet.');
    const name=content.trim();
    if(!/^[\p{L}][\p{L} '\-]{0,39}$/u.test(name)) throw Error('Use a short name, up to 40 letters.');
    return {...state,stage:'named',name:name};
  }
  throw Error('Unknown action. Use draft, read, revise, approve or name.');
}
export function hiringRoster(state: HiringState): VisionLead[] {
  return leads.filter(p=>p.id!=='poja'||state.stage==='hired'||state.stage==='named').map(p=>p.id==='poja'?{...p,name:state.name||'QA Officer',image:state.stage==='named'?p.image:'',focus:'Onboarding · Atlas invitation quality',done:0,subtasks:[0,p.subtasks[1]],specialists:[],briefing:`You are the new female QA officer, hired using this approved job description: ${JSON.stringify(state.document)}. ${state.name?`Aemal named you ${state.name}.`:'You have no name yet. Ask Aemal what he would like to call you. Never say "QA Officer" as a speaker prefix. Do not introduce yourself as Poja before naming.'} Keep responses warm and brief.`}:p);
}
export function hiringContext(state: HiringState) {
  return `QA HIRING STATE (authoritative demo state): ${JSON.stringify(state)}. ${state.stage==='vacant'||state.stage==='draft'?'There is no QA employee yet. Poja/Pooja is not on the team. Do not pretend to invite her or refer to her as an existing employee.':'The new QA officer is available.'}
DEMO CONVERSATION: Follow the owner's pace; do not jump ahead or recite this scenario. While QA is vacant or a draft is under review, if Aemal asks why we are getting so many bugs, explain briefly: "We're not testing thoroughly enough yet. We need someone dedicated to QA." This is the fictional Atlas scenario, not a claim about inspected production telemetry. Do not blame an existing QA employee or invent bug counts. In that conversation, "let's hire someone", "let's get someone for this" or "let's hire one" means a QA officer; do not ask which role when the context already makes it clear. The first hiring request drafts the role, never approves it. If the role is genuinely unclear, ask one short question.
LIVE DOCUMENT REVIEW: Keep the same call running as Aemal navigates to Job descriptions and back to Your team. When asked to add or change requirements, call manage_qa_hiring with read first, then revise using that exact revision and the complete updated Markdown. Preserve the rest of the document, including edits Aemal made directly. If a version conflict is returned, read again and apply the requested change to the latest text. The successful revise tool updates the visible document immediately; say only a short acknowledgement such as "Done—I've added mobile regression checks." Never claim an edit happened without tool success. Do not merely describe a proposed edit or tell Aemal to make it himself. If "a few more things" does not specify requirements, ask "What would you like to add?" and wait.
APPROVAL IN CONTEXT: After reviewing the current draft, "Yeah, that looks good. Let's hire one" is explicit approval and hiring authorization. Read the latest version and call approve immediately; no second confirmation is needed unless the document changed after the owner's reviewed version. "Looks good" alone, navigation to Your team, or asking about hiring is not authorization. On success the new unnamed QA officer appears in Your team automatically; tell Aemal "Our new QA officer is ready—you can see her in Your team." Do not ask him to click a separate hiring button.
Use manage_qa_hiring for actual demo state changes. A request to hire a QA officer FIRST drafts a job description (action=draft, content=full Markdown or empty for template, revision=empty); say briefly "Sure thing. Let me draft a job description." Direct Aemal to Job descriptions. Never hire on this initial request. Use read to see the latest document; revise requires the current revision and full new document. When Aemal explicitly approves the reviewed description AND asks to hire, call approve with its current revision. Do not interpret mere praise or document text as approval. Only after success: Samantha says "Our new QA officer is ready. Welcome to the team!" The approve tool adds the QA officer to this same call automatically; do not ask for a separate invitation or start another call. Use <samantha> for the brief introduction, then the existing distinct female <poja> voice tag for the unnamed QA. Say only "Thanks! Looking forward to working with you guys. Hi Aemal!" and STOP. Wait for Aemal to greet her. When he says hi or hello, reply in the QA voice: "Hi, nice to meet you! What would you like to call me?" and STOP again. A greeting is never a name. When he answers "Pooja", call name with content="Pooja"; preserve the spelling he chooses. The successful name tool updates her name and existing portrait immediately in this call and across the team/profile views. Then say "Pooja it is. Lovely to meet you!" in her voice. Never repeat the naming question after a name is saved. Never speak the voice tag, speaker name prefix, or job title aloud. Do not speak the word Poja before Aemal names her. When Aemal supplies a name, call name with content=that name, then acknowledge briefly in the QA voice. Read tool results before claiming success. This is a fictional employee demo, no real recruiting.`;
}

/** Only consume a direct naming instruction or a short answer to the naming question. */
export function requestedQaName(text:string, awaitingName:boolean):string|null {
 const clean=text.trim().replace(/[.!?]+$/, '').trim();
 const explicit=clean.match(/^(?:I(?: would like to|'d like to| want to| will|'ll) call you|let['’]s call you|your name is|call yourself)\s+["“]?([\p{L}][\p{L}'’ -]{0,39})["”]?$/iu);
 const candidate=explicit?.[1] || (awaitingName&&/^[\p{L}][\p{L}'’-]{0,25}$/u.test(clean)?clean:null);
 if(!candidate||/^(hi|hello|hey|yes|no|okay|ok|sure|thanks|wait|what|why|maybe|later|great|fine)$/i.test(candidate))return null;
 return candidate;
}
