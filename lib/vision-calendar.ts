export type MeetingMessage = { person: string; second: number; text: string; image?: "invitation" | "release"; caption?: string };
export type VisionMeeting = { id: string; title: string; purpose: string; people: string[]; lane: number; minute: number; outcome: string; messages: MeetingMessage[] };
export const visionMeetings: VisionMeeting[] = [
  {id:"team-parallel",title:"Whole team · launch alignment",purpose:"The whole team aligns on launch readiness while specialist conversations continue in parallel. Simulated concurrent agent sessions.",people:["samantha","bob","lisa","john","poja"],lane:2,minute:0,outcome:"Continue the design and staging reviews in parallel. Samantha coordinates dependencies and the owner update.",messages:[
    {person:"samantha",second:0,text:"Quick alignment while the design and staging reviews continue: what needs attention?"},
    {person:"bob",second:10,text:"I am reviewing the resend implementation with John in parallel. The endpoint and UI contract are aligned."},
    {person:"john",second:20,text:"The recovery design is ready. I am checking keyboard focus in our design-to-code session."},
    {person:"lisa",second:30,text:"I am validating the Terraform staging plan and keeping the release gate closed until QA signs off.",image:"release",caption:"Shared staging readiness snapshot"},
    {person:"poja",second:42,text:"I am checking Safari and the regression checklist in the staging review. I will share evidence before release."},
    {person:"samantha",second:55,text:"Thanks. Keep those reviews moving. I will update Aemal when the staging candidate is ready."}]},
  { id:"ux-handoff",title:"Invitation flow · design to code",purpose:"Bob and John align the approved recovery flow with its implementation.",people:["bob","john"],lane:0,minute:0,outcome:"Use the approved resend action, keep the email visible, and announce success to screen readers. Bob owns the implementation.",messages:[
    {person:"john",second:0,text:"The expired-invite screen still strands people. Here is the approved recovery state.",image:"invitation",caption:"John shared the proposed invitation recovery screen"},
    {person:"bob",second:14,text:"I can wire Resend invitation to the existing endpoint. Should the user stay on this screen after sending?"},
    {person:"john",second:26,text:"Yes. Keep their email visible and replace the action with a confirmation. Preserve the back-to-sign-in link."},
    {person:"bob",second:42,text:"Agreed. I will add loading, rate-limit and failure states too, then hand the preview to Poja."},
    {person:"john",second:58,text:"Decision recorded: inline confirmation, keyboard focus preserved, and an accessible success announcement."}]},
  {id:"release-gate",title:"Staging release · QA gate",purpose:"Lisa and Poja compare deployment health with the release test checklist.",people:["lisa","poja"],lane:1,minute:0,outcome:"Keep the release gate closed until Safari and keyboard checks pass. Lisa prepares staging; Poja signs off the checks.",messages:[
    {person:"lisa",second:0,text:"The demo staging candidate is ready for review. Here is the release checklist.",image:"release",caption:"Lisa shared the simulated staging release checklist"},
    {person:"poja",second:12,text:"API checks look good. Safari and keyboard recovery remain open, so I am not signing off yet."},
    {person:"lisa",second:29,text:"I will keep the gate closed and preserve the previous artifact for rollback."},
    {person:"poja",second:47,text:"I will run the recovery flow on Safari and check focus after resend. We can release only after both pass."},
    {person:"lisa",second:59,text:"Agreed: staging review first, no production promotion in this demo."}]},
  {id:"scope-review",title:"UX-17 · scope and acceptance",purpose:"Samantha and John settle what is required for the invitation fix.",people:["samantha","john"],lane:2,minute:1,outcome:"Scope stays focused on invite recovery. A broader onboarding redesign moves to a later sprint.",messages:[
    {person:"samantha",second:0,text:"Aemal wants the invitation bug addressed. What is the smallest complete fix?"},
    {person:"john",second:11,text:"Resend, clear confirmation, and a way back to sign-in. The recovery design already covers all three.",image:"invitation",caption:"John shared the agreed recovery scope"},
    {person:"samantha",second:31,text:"Keep the broader onboarding redesign out of this change. What should QA use as acceptance criteria?"},
    {person:"john",second:49,text:"An expired invite can be recovered without support, with keyboard and screen-reader access. No duplicate sends."},
    {person:"samantha",second:58,text:"Agreed. Bob owns code, John owns the states, and Poja owns acceptance."}]},
  {id:"qa-handoff",title:"Recovery endpoint · test handoff",purpose:"Bob and Poja agree edge cases before the implementation review.",people:["bob","poja"],lane:0,minute:2,outcome:"Test expired tokens, duplicate clicks, rate limits, and keyboard focus. Poja will return any failures to Bob.",messages:[
    {person:"bob",second:0,text:"The planned resend handler needs coverage for expired tokens and repeated clicks."},
    {person:"poja",second:16,text:"I will add a throttled connection and a rate-limit response. Does the action disable while sending?"},
    {person:"bob",second:30,text:"Yes, and errors stay inline. Retrying should not lose the email or keyboard focus."},
    {person:"poja",second:46,text:"I have the matrix: expiry, duplicates, rate limit, network failure and accessible confirmation."},
    {person:"bob",second:58,text:"That covers the handoff. Flag failures against UX-17 and I will pick them up."}]},
  {id:"deployment-handoff",title:"Release plan · staging handoff",purpose:"Samantha and Lisa align staging availability and owner communication.",people:["samantha","lisa"],lane:1,minute:3,outcome:"Share a staging preview after QA approval. Samantha owns the owner update; Lisa owns deployment readiness.",messages:[
    {person:"samantha",second:0,text:"When can Aemal review the recovery flow on staging?"},
    {person:"lisa",second:13,text:"After Poja clears the two remaining checks. Here is the dependency snapshot.",image:"release",caption:"Lisa shared release dependencies"},
    {person:"samantha",second:32,text:"Good. Keep the update specific: what changed, where to review it, and what is still pending."},
    {person:"lisa",second:45,text:"I will attach the preview and rollback note. Nothing goes to production as part of this demo."},
    {person:"samantha",second:59,text:"Agreed. I will handle the requested phone follow-up with the task context."}]},
];
export function calendarTime(minute: number, human: boolean, overnight: boolean) {
  const total=(overnight?2:9)*60+minute*(human?30:1);
  return `${String(Math.floor(total/60)).padStart(2,"0")}:${String(total%60).padStart(2,"0")}`;
}
