import { feedbackMedia } from '@/lib/vision-feedback';
import { feedbackOrigin } from '@/lib/vision-feedback-http';
import { errorResponse } from '@/lib/prd/security';
export const runtime='nodejs';
export async function GET(request:Request,context:{params:Promise<{id:string}>}){try{feedbackOrigin(request,false);const {id}=await context.params;return new Response(new Uint8Array(await feedbackMedia(process.cwd(),id)),{headers:{'Content-Type':'image/png','X-Content-Type-Options':'nosniff','Cache-Control':'private, max-age=31536000, immutable','Cross-Origin-Resource-Policy':'same-origin'}});}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return Response.json({error:'Screenshot not found.'},{status:404});return errorResponse(e);}}
