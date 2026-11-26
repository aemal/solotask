import { projects } from "@/lib/projects";
import { skillCatalog } from "@/lib/skill-catalog";
import { readSkillManifest, downloadSkill, installSkill, parseSkillSource, type SkillPackage } from "@/lib/project-skills";
import { sameOrigin, jsonBody, errorResponse, InputError } from "@/lib/prd/security";
import { randomUUID } from "node:crypto";
export const dynamic="force-dynamic";
const shared=globalThis as typeof globalThis&{vbSkillPreviews?:Map<string,{root:string;expires:number;pkg:SkillPackage}>};const previews=shared.vbSkillPreviews ||=new Map();
async function root(request:Request){const id=new URL(request.url).searchParams.get('project');const project=(await projects()).find(p=>p.id===id);if(!project)throw new InputError('Select a registered project.');return project.root;}
export async function GET(request:Request){try{return Response.json(await readSkillManifest(await root(request)),{headers:{'Cache-Control':'no-store'}});}catch(e){return errorResponse(e);}}
export async function POST(request:Request){try{sameOrigin(request);const selected=await root(request),body=await jsonBody(request);
 if(body.action==='preview'){
  const source=typeof body.skillId==='string'?skillCatalog.find(s=>s.id===body.skillId):typeof body.url==='string'?parseSkillSource(body.url):undefined;if(!source)throw new InputError('Choose a skill or GitHub folder URL.');
  const pkg=await downloadSkill(source);for(const [id,item]of previews)if(item.expires<Date.now())previews.delete(id);if(previews.size>=8)throw new InputError('Too many open previews. Finish an installation or retry later.');
  const token=randomUUID();previews.set(token,{root:selected,expires:Date.now()+600000,pkg});
  const installed=(await readSkillManifest(selected)).skills.find(s=>s.id===source.id);
  return Response.json({token,source,commit:pkg.commit,skill:pkg.files['SKILL.md'],fileCount:Object.keys(pkg.files).length,files:Object.keys(pkg.files),upToDate:installed?.commit===pkg.commit});
 }
 if(body.action==='install'){
  const item=previews.get(body.token);if(!item||item.root!==selected||item.expires<Date.now())throw new InputError('Preview expired. Check the latest source again.');
  await installSkill(selected,item.pkg);previews.delete(body.token);return Response.json(await readSkillManifest(selected));
 }
 throw new InputError('Unknown skill action.');
}catch(e){return errorResponse(e);}}
