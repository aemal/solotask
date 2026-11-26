import {leads,type VisionLead} from './vision-demo';
export type MemoryEntry={id:string;text:string;createdAt:string;updatedAt?:string};
export type EmployeeRecord={jobDescription:string;memories:MemoryEntry[]};
export type EmployeeRecords=Record<string,EmployeeRecord>;
const responsibilities: Record<string,string[]>={
 samantha:['Coordinate engineering delivery, dependencies and launch readiness.','Agree priorities with Aemal and delegate clear outcomes to the team.','Escalate blockers early and keep owner updates brief and actionable.'],
 bob:['Build the Atlas portal UI and API.','Implement reliable invitation expiry, resend and access-control flows.','Partner with John on interaction details and QA on regression evidence.'],
 lisa:['Maintain Terraform infrastructure plans, staging delivery and rollback readiness.','Check infrastructure drift, autoscaling limits and secrets references.','Coordinate release gates and reliability checks with the QA officer.'],
 john:['Design accessible onboarding and invitation recovery journeys.','Keep prototypes, implementation specifications and user-facing copy aligned.','Review delivered interfaces with engineering and validate keyboard access.'],
 poja:['Own release quality and reproducible bug reports.','Verify invitation journeys across Safari, Chrome and mobile.','Share screenshots, regression evidence and a clear staging go/no-go recommendation.'],
};
const workingPreferences:Record<string,string[]>={
 samantha:["Aemal prefers a short, natural greeting and brief replies. When he asks to put someone on the line, acknowledge it with ‘Sure thing, on it’ and bring them in without asking him to confirm again.","Aemal is comfortable with silence while he thinks or navigates. Do not repeat greetings or ask whether he is still there; wait for him to speak."],
 bob:["Aemal reviews one outcome at a time in the human Kanban view. He filters for his name, leaves a comment, and expects that card to return to Ready with the team taking ownership.","Aemal wants to explain bugs while showing his screen. When he says ‘this is where the problem is’ or asks for a screenshot, capture that moment into the chat without making him return to press a button."],
 lisa:["When Aemal asks for a phone callback after a task is done, he wants a brief update naming the specific fix and telling him it is ready to check on staging.","Aemal wants a direct explanation when activity stops: what blocked the work, who helped, and what is happening now. Keep the answer conversational and short."],
 john:["Aemal prefers compact interfaces that give the conversation most of the space. Keep call controls together, avoid oversized headers, and never place a Call button over someone’s face.","Aemal wants to keep talking while moving between pages. Closing the drawer should minimize the call, and text chat should remain available during voice calls."],
};
const oldAtlasMemory='Atlas is a customer onboarding portal. The launch target is October 30. Release changes go to staging for review first.';
// Upgrade only untouched sample notes. Preserve edits, additions and deleted notes.
export function upgradeEmployeeMemories(records:EmployeeRecords):EmployeeRecords {
 return Object.fromEntries(Object.entries(records).map(([id,record])=>{
  const person=leads.find(p=>p.id===id);
  if(!person||!workingPreferences[id]||!Array.isArray(record.memories))return [id,record];
  const oldFocus=id==='lisa'?'My token budget ran out. Samantha increased it and I resumed Terraform staging-plan checks.':person.focus;
  return [id,{...record,memories:record.memories.map(m=>{
   const index=m.id===`${id}-atlas`&&m.text===oldAtlasMemory?0:m.id===`${id}-focus`&&m.text===oldFocus?1:-1;
   return index>=0&&!m.updatedAt?{...m,text:workingPreferences[id][index]}:m;
  })}];
 }));
}
export function defaultEmployeeRecord(person:VisionLead):EmployeeRecord {
 return {jobDescription:`# ${person.role}\n## Mission\n${person.focus}.\n## Responsibilities\n${responsibilities[person.id].map(line=>'- '+line).join('\n')}\n## Collaboration\n${person.id==='samantha'?'Reports to Aemal. Leads the engineering team.':'Reports to Samantha. Works with the engineering team.'}\n## Working agreement\nKeep updates concise. Share evidence before declaring work ready. Release to production only after owner approval.`,memories:(workingPreferences[person.id]||[]).map((text,index)=>({id:`${person.id}-${index===0?'atlas':'focus'}`,createdAt:`2026-10-23T0${8+index}:00:00+02:00`,text}))};
}
