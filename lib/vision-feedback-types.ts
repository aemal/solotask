import type { DemoTask } from './vision-kanban';
export type Annotation = { id: string; type: 'arrow'|'rectangle'|'ellipse'|'text'; x:number; y:number; width?:number; height?:number; endX?:number; endY?:number; text?:string; color?:string };
export type FeedbackRound = { id:string; submissionId:string; name:string; createdAt:string; status:'submitted'|'in-progress'; reportIds:string[]; startedAt?:string };
export type FeedbackTicket = DemoTask & { roundId:string; roundName:string; imageUrl:string; transcript:string; ownerNotes:string; annotations?:Annotation[]; enriched:boolean; startedAt?:string; scheduledAt?:string; acceptanceCriteria?:string[]; technicalDetails?:string; questions?:string[]; clarification?:string[] };
export type FeedbackData = { rounds:FeedbackRound[]; tickets:FeedbackTicket[] };
export type FeedbackSubmit = { submissionId:string; name:string; reports:{id:string; title:string; notes:string; transcript:string; imageDataUrl:string; annotations?:Annotation[]}[] };
