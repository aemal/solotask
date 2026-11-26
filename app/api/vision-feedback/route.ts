import { readFeedback, submitFeedback, clarifyFeedback, startFeedback } from '@/lib/vision-feedback';
import { feedbackBody, feedbackOrigin } from '@/lib/vision-feedback-http';
import { errorResponse, InputError } from '@/lib/prd/security';
export const dynamic='force-dynamic';
export const runtime='nodejs';
export async function GET(request:Request){try{feedbackOrigin(request,false);return Response.json(await readFeedback(process.cwd()),{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{feedbackOrigin(request);const body=await feedbackBody(request);const root=process.cwd();const result=body.action==='submit'?await submitFeedback(root,body):body.action==='clarify'?await clarifyFeedback(root,body):body.action==='start'?await startFeedback(root,body):null;if(!result)throw new InputError('Unknown feedback action.');return Response.json(result,{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
