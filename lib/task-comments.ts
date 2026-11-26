import { mkdir, lstat, readFile, open, writeFile, rename, rm } from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { InputError } from './prd/security';
export type TaskComment = { id: string; taskKey: string; author: 'owner' | 'agent'; kind?: 'comment' | 'summary'; deletedAt?: string; editedAt?: string; text: string; createdAt: string };
type Store = { version: 1; comments: TaskComment[] };
async function location(root: string, create = false) {
 const directory=path.join(root,'.vibeboard');
 if(create)await mkdir(directory,{recursive:true});
 const info=await lstat(directory);if(!info.isDirectory()||info.isSymbolicLink())throw new InputError('Comments folder must be a regular project directory.');
 return path.join(directory,'task-comments.json');
}
export async function readTaskComments(root:string):Promise<Store>{
 try{const file=await location(root),info=await lstat(file);if(!info.isFile()||info.isSymbolicLink()||info.size>2_000_000)throw new InputError('Invalid comments file.');const value=JSON.parse(await readFile(file,'utf8'));if(value.version!==1||!Array.isArray(value.comments)||value.comments.length>1000||value.comments.some((c:TaskComment)=>!c||typeof c.id!=='string'||typeof c.taskKey!=='string'||typeof c.text!=='string'||!['owner','agent'].includes(c.author)||!Number.isFinite(Date.parse(c.createdAt))))throw new InputError('Invalid comments data.');return value;}
 catch(error){if((error as NodeJS.ErrnoException).code==='ENOENT')return {version:1,comments:[]};throw error;}
}
export async function addTaskComment(root:string,taskKey:string,text:string,id:string, author:'owner'|'agent'='owner', kind:'comment'|'summary'='comment'){
 if(!['owner','agent'].includes(author)||!['comment','summary'].includes(kind))throw new InputError('Invalid comment author or kind.');
 if(!text.trim()||text.length>20000)throw new InputError('Enter a comment under 20,000 characters.');
 if(!/^[a-zA-Z0-9_-]{1,100}$/.test(id))throw new InputError('Invalid comment identifier.');
 const file=await location(root,true),lock=file+'.lock',temp=file+'.'+randomUUID()+'.tmp';let handle;
 try{handle=await open(lock,'wx',0o600);}catch{throw new InputError('Comments are being updated. Retry shortly.');}
 try{const before=await readFile(file,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});const data=await readTaskComments(root);const previous=data.comments.find(c=>c.id===id);if(previous){if(previous.taskKey!==taskKey||previous.text!==text.trim()||previous.author!==author||(previous.kind||'comment')!==kind)throw new InputError('Comment identifier already used.');return data;}
 data.comments.push({id,taskKey,author,kind,text:text.trim(),createdAt:new Date().toISOString()});const content=JSON.stringify(data,null,2)+'\n';if(data.comments.length>1000||Buffer.byteLength(content)>2_000_000)throw new InputError('Comment history is full.');await writeFile(temp,content,{mode:0o600});const current=await readFile(file,'utf8').catch(e=>{if(e.code==='ENOENT')return null;throw e;});if(current!==before)throw new InputError('Comments changed while saving. Retry shortly.');await rename(temp,file);return data;
 }finally{await rm(temp,{force:true});await handle.close();await rm(lock,{force:true});}
}

async function changeTaskComment(root:string,taskKey:string,id:string,text?:string,expected?:string){
 const file=await location(root),lock=file+'.lock',temp=file+'.'+randomUUID()+'.tmp';let handle;
 try{handle=await open(lock,'wx',0o600);}catch{throw new InputError('Comments are being updated. Retry shortly.');}
 try{const before=await readFile(file,'utf8'),store=await readTaskComments(root);const comment=store.comments.find(c=>c.id===id&&c.taskKey===taskKey);if(!comment)throw new InputError('Comment no longer exists.');if(text!==undefined){if(comment.deletedAt)throw new InputError('Deleted comments cannot be edited.');if(!text.trim()||text.length>20000)throw new InputError('Enter a comment under 20,000 characters.');if(comment.text!==expected)throw new InputError('This comment changed. Reload before editing.');comment.text=text.trim();comment.editedAt=new Date().toISOString();}else comment.deletedAt??=new Date().toISOString();if(Buffer.byteLength(JSON.stringify(store))>2_000_000)throw new InputError('Comment history is full.');await writeFile(temp,JSON.stringify(store,null,2)+'\n',{mode:0o600});if(await readFile(file,'utf8')!==before)throw new InputError('Comments changed while deleting. Retry shortly.');await rename(temp,file);return store;
 }finally{await rm(temp,{force:true});await handle.close();await rm(lock,{force:true});}
}

export const deleteTaskComment=(root:string,taskKey:string,id:string)=>changeTaskComment(root,taskKey,id);
export const editTaskComment=(root:string,taskKey:string,id:string,text:string,expected:string)=>changeTaskComment(root,taskKey,id,text,expected);
