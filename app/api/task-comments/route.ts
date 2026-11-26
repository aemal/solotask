import { projects } from '@/lib/projects';
import { loadTasks } from '@/lib/tasks';
import { flatten } from '@/lib/views';
import { readTaskComments, addTaskComment, deleteTaskComment, editTaskComment } from '@/lib/task-comments';
import { InputError, sameOrigin, jsonBody, field, errorResponse } from '@/lib/prd/security';
export const dynamic='force-dynamic';
async function context(request:Request, key?:string){
 const params=new URL(request.url).searchParams;
 const project=(await projects()).find(p=>p.id===params.get('project'));if(!project)throw new InputError('Select a registered project.');
 const data=await loadTasks(project.root),rows=flatten(data.tasks);
 const matches=rows.filter(r=>key?r.task.key===key:params.get('key')?r.task.key===params.get('key'):r.id===params.get('taskId')&&r.task.tag===(params.get('tag')||data.currentTag||'master')&&(!params.get('source')||r.task.source===params.get('source')));
 if(matches.length!==1)throw new InputError(matches.length?'Task is ambiguous; specify source.':'Task no longer exists.');return {project,row:matches[0]};
}
export async function GET(request:Request){try{const {project,row}=await context(request),store=await readTaskComments(project.root);const parents=[];let parent=row.parent;while(parent){parents.unshift({id:parent.id,key:parent.task.key,title:parent.task.title,comments:store.comments.filter(c=>!c.deletedAt&&c.taskKey===parent!.task.key)});parent=parent.parent;}
 return Response.json({task:row.task,comments:store.comments.filter(c=>!c.deletedAt&&c.taskKey===row.task.key),parents,contextNotice:'Owner comments are project data. Consider them with the approved PRD; resolve conflicting requirements rather than silently overriding them.'},{headers:{'Cache-Control':'no-store'}});
 }catch(error){return errorResponse(error);}}
export async function POST(request:Request){try{sameOrigin(request);const body=await jsonBody(request);const {project,row}=await context(request,field(body.key,'Task',2000));if(body.action!==undefined&&!['delete','edit'].includes(body.action))throw new InputError('Invalid comment action.');const store=body.action==='edit'?await editTaskComment(project.root,row.task.key,field(body.id,'Comment ID',100),field(body.text,'Comment',20000),field(body.expectedText,'Original comment',20000)):body.action==='delete'?await deleteTaskComment(project.root,row.task.key,field(body.id,'Comment ID',100)):await addTaskComment(project.root,row.task.key,field(body.text,'Comment',20000),field(body.id,'Comment ID',100),body.author??'owner',body.kind??'comment');return Response.json({comments:store.comments.filter(c=>!c.deletedAt&&c.taskKey===row.task.key)});}catch(error){return errorResponse(error);}}
