import { EnvHttpProxyAgent } from "undici";
import { readFile, writeFile, mkdir, lstat, readdir, rename, rm, open } from "node:fs/promises";
import { createHash, randomUUID } from "node:crypto";
import path from "node:path";
import { skillCatalog, skillsForStack, type SkillSource } from "./skill-catalog";
import { InputError } from "./prd/security";
export type InstalledSkill = { id: string; name: string; repo: string; directory: string; commit: string; installedAt: string; hashes: Record<string,string>; official: boolean; license: string };
type Manifest = { version: 1; skills: InstalledSkill[]; stack?: { id: string; name: string; lockedAt: string } };
export type SkillPackage = { source: SkillSource; commit: string; files: Record<string,string>; binaryFiles?: string[] };
const digest = (s:string|Buffer) => createHash("sha256").update(s).digest("hex");
const validPart = (s:string) => /^[A-Za-z0-9_.-]+$/.test(s) && s !== "." && s !== "..";
export function safeRelative(s:string) { return !!s && s.length < 240 && s.split("/").every(validPart); }
async function regularDirectory(root:string, relative:string, create=false) {
 let current=root;
 for(const part of relative.split("/")) { if(!validPart(part)) throw new InputError("Invalid skill path."); current=path.join(current,part); if(create) await mkdir(current).catch(e=>{if(e.code!=="EEXIST")throw e;}); const info=await lstat(current); if(!info.isDirectory()||info.isSymbolicLink())throw new InputError("Skill folders must be regular project directories."); }
 return current;
}
export async function readSkillManifest(root:string):Promise<Manifest> {
 try { await regularDirectory(root,".vibeboard");const file=path.join(root,".vibeboard/skills.json"),info=await lstat(file);if(!info.isFile()||info.isSymbolicLink()||info.size>2000000)throw new InputError("Invalid skill manifest.");const value=JSON.parse(await readFile(file,"utf8"));if(value.version!==1||!Array.isArray(value.skills)||value.skills.some((s:InstalledSkill)=>!validPart(s.id)||!s.hashes||Object.keys(s.hashes).some(f=>!safeRelative(f))))throw new InputError("Invalid skill manifest.");return value; }
 catch(e){if((e as NodeJS.ErrnoException).code==="ENOENT")return {version:1,skills:[]};throw e;}
}
const proxy = process.env.HTTPS_PROXY || process.env.HTTP_PROXY || process.env.https_proxy || process.env.http_proxy ? new EnvHttpProxyAgent() : undefined;
const sourceFetch:typeof fetch = (input, init) => fetch(input, proxy ? { ...init, dispatcher: proxy } as RequestInit : init);
async function body(response:Response,max:number,encoding:BufferEncoding="utf8") { if(!response.ok)throw new InputError(`Skill source returned HTTP ${response.status}. Retry later.`); const reader=response.body?.getReader();if(!reader)throw new InputError("Empty skill download.");let size=0;const chunks:Uint8Array[]=[];try{while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max)throw new InputError("Skill download is too large.");chunks.push(value);}}finally{reader.releaseLock();}return Buffer.concat(chunks).toString(encoding); }
export async function githubJson(endpoint:string,fetcher=sourceFetch) { const response=await fetcher(`https://api.github.com/${endpoint}`,{headers:{Accept:"application/vnd.github+json","User-Agent":"SoloTask"},signal:AbortSignal.timeout(15000),redirect:"error"});return JSON.parse(await body(response,8000000)); }
export function parseSkillSource(url:string):SkillSource {
 let u:URL;try{u=new URL(url);}catch{throw new InputError("Paste a public GitHub skill folder URL.");}
 if(u.protocol!=="https:"||u.hostname!=="github.com"||u.username||u.password||u.port)throw new InputError("Use a public https://github.com skill URL.");
 const parts=u.pathname.split("/").filter(Boolean).map(p=>decodeURIComponent(p));
 if(parts.length<2||!parts.slice(0,2).every(validPart))throw new InputError("Invalid GitHub repository.");
 const repo=parts.slice(0,2).join("/");
 if(parts.length===2){const known=skillCatalog.find(s=>s.repo.toLowerCase()===repo.toLowerCase());if(known)return known;throw new InputError("Include the skill folder: github.com/owner/repo/tree/main/path/to/skill.");}
 if(!["tree","blob"].includes(parts[2])||parts.length<5)throw new InputError("Include a GitHub skill folder or SKILL.md URL.");
 let directory=parts.slice(4).join("/");if(directory.endsWith("/SKILL.md"))directory=directory.slice(0,-9);
 if(!safeRelative(directory))throw new InputError("Invalid skill folder path.");
 const known=skillCatalog.find(s=>s.repo===repo&&s.directory===directory);if(known)return known;
 const id=`${parts[0]}-${parts[1]}-${directory.split('/').pop()}`.toLowerCase().replace(/[^a-z0-9-]/g,"-").slice(0,100);
 return {id,name:directory.split('/').pop()!,repo,directory,official:false,description:"Imported GitHub skill. Review its instructions before installing.",license:"See included upstream license"};
}
export async function downloadSkill(source:SkillSource,fetcher=sourceFetch):Promise<SkillPackage> {
 if(!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(source.repo)||!safeRelative(source.directory))throw new InputError("Invalid skill source.");
 const revision=await githubJson(`repos/${source.repo}/commits/HEAD`,fetcher),commit=revision.sha;
 if(!/^[a-f0-9]{40}$/.test(commit))throw new InputError("Could not resolve the latest upstream revision.");
 const tree=await githubJson(`repos/${source.repo}/git/trees/${commit}?recursive=1`,fetcher);
 if(tree.truncated||!Array.isArray(tree.tree))throw new InputError("Repository tree is incomplete; use a smaller skill repository.");
 const prefix=source.directory+"/";
 const entries=tree.tree.filter((e:{path:string;type:string;mode:string;size:number})=> e.type==="blob"&&(e.path.startsWith(prefix)||/^(LICENSE(?:\.[A-Za-z]+)?|NOTICE(?:\.[A-Za-z]+)?)$/i.test(e.path)));
 if(!entries.some((e:{path:string})=>e.path===prefix+"SKILL.md"))throw new InputError("No SKILL.md found in that folder on the latest default branch.");
 if(entries.length>500||entries.reduce((n:number,e:{size:number})=>n+(e.size||0),0)>8000000||entries.some((e:{path:string;mode:string;size:number})=>e.mode!=="100644"&&e.mode!=="100755"||e.size>2000000||!safeRelative(e.path.startsWith(prefix)?e.path.slice(prefix.length):e.path)))throw new InputError("Skill package contains unsupported paths, links, or oversized files.");
 const hasLicense=entries.some((e:{path:string})=>/LICENSE/i.test(e.path));
 if(!hasLicense && source.repo !== "vercel-labs/agent-skills")throw new InputError("No distributable license file found. Choose a source with an explicit license.");
 const files:Record<string,string>={},binaryFiles:string[]=[];let index=0;
 await Promise.all(Array.from({length:Math.min(6,entries.length)},async()=>{while(index<entries.length){const entry=entries[index++];const relative=entry.path.startsWith(prefix)?entry.path.slice(prefix.length):entry.path;const response=await fetcher(`https://raw.githubusercontent.com/${source.repo}/${commit}/${entry.path}`,{signal:AbortSignal.timeout(20000),redirect:"error"});const binary=/\.(png|jpe?g|gif|webp|woff2?|ico)$/i.test(relative);const text=await body(response,2000000,binary?"base64":"utf8");if(binary)binaryFiles.push(relative);if(!binary&&text.includes('\0'))throw new InputError("Only text skill packages are supported.");files[relative]=text;}}));
 if(!hasLicense){
   const readme=await body(await fetcher(`https://raw.githubusercontent.com/${source.repo}/${commit}/README.md`,{signal:AbortSignal.timeout(20000),redirect:"error"}),200000);
   if(!/## License\s+MIT\b/.test(readme))throw new InputError("Upstream license declaration changed; review before installing.");
   files['UPSTREAM-README.md']=readme;
   files['UPSTREAM-LICENSE.md']=`Upstream declares MIT in its README. No standalone license file was present in this revision.\n\nSource: https://github.com/${source.repo}/blob/${commit}/README.md\n\nOriginal skill files and their metadata are preserved unchanged.\n`;
 }
 if(!/^---\r?\n[\s\S]*?\bname:\s*\S+[\s\S]*?\bdescription:\s*\S+[\s\S]*?\r?\n---/.test(files['SKILL.md']))throw new InputError("SKILL.md needs valid name and description frontmatter.");
 return {source,commit,files,binaryFiles};
}
export async function installSkill(root:string,pkg:SkillPackage) {
 const {source,files}=pkg;if(!validPart(source.id)||Object.keys(files).some(f=>!safeRelative(f))||!files['SKILL.md'])throw new InputError("Invalid skill package.");
 const stateDir=await regularDirectory(root,'.vibeboard',true),base=await regularDirectory(root,'.agents/skills',true);
 const lock=await open(path.join(stateDir,'skills.lock'),'wx',0o600).catch(()=>{throw new InputError("Skills are being updated. Retry shortly.");});
 const stage=path.join(base,`staging-${randomUUID()}`),destination=path.join(base,source.id),backup=path.join(base,`backup-${randomUUID()}`);let moved=false,published=false;
 try{
  const manifest=await readSkillManifest(root),old=manifest.skills.find(s=>s.id===source.id);
  try{const info=await lstat(destination);if(info.isSymbolicLink()||!info.isDirectory()||!old)throw new InputError("A local skill already uses this name. It was preserved.");}catch(e){if((e as NodeJS.ErrnoException).code!=="ENOENT")throw e;}
  if(old){await regularDirectory(root,`.agents/skills/${source.id}`);const actual=await skillFiles(root,source.id);if(actual.length!==Object.keys(old.hashes).length)throw new InputError("Local skill edits detected. Preserve or revert edits before updating.");for(const file of actual){const text=await safeSkillRead(root,source.id,file);if(digest(text)!==old.hashes[file])throw new InputError("Local skill edits detected. Upstream update was not applied.");}}
  await mkdir(stage);
  for(const [relative,text]of Object.entries(files)){await mkdir(path.dirname(path.join(stage,relative)),{recursive:true});await writeFile(path.join(stage,relative),pkg.binaryFiles?.includes(relative)?Buffer.from(text,"base64"):text,{mode:0o600,flag:'wx'});}
  if(old){await rename(destination,backup);moved=true;}await rename(stage,destination);published=true;
  const record:InstalledSkill={id:source.id,name:source.name,repo:source.repo,directory:source.directory,official:source.official,license:source.license,commit:pkg.commit,installedAt:new Date().toISOString(),hashes:Object.fromEntries(Object.entries(files).map(([f,t])=>[f,digest(pkg.binaryFiles?.includes(f)?Buffer.from(t,"base64"):t)]))};
  manifest.skills=[...manifest.skills.filter(s=>s.id!==source.id),record];
  const temp=path.join(stateDir,`skills-${randomUUID()}.tmp`);try{await writeFile(temp,JSON.stringify(manifest,null,2)+'\n',{mode:0o600,flag:'wx'});await rename(temp,path.join(stateDir,'skills.json'));}finally{await rm(temp,{force:true});}
  if(moved)await rm(backup,{recursive:true,force:true}).catch(()=>{});return record;
 }catch(e){if(published)await rm(destination,{recursive:true,force:true});if(moved)await rename(backup,destination);throw e;}
 finally{await rm(stage,{recursive:true,force:true});await lock.close();await rm(path.join(stateDir,'skills.lock'),{force:true});}
}
async function safeSkillRead(root:string,id:string,file:string){await regularDirectory(root,`.agents/skills/${id}`);const parts=file.split('/');if(parts.length>1)await regularDirectory(root,`.agents/skills/${id}/${parts.slice(0,-1).join('/')}`);const target=path.join(root,'.agents/skills',id,file),info=await lstat(target);if(info.isSymbolicLink()||!info.isFile()||info.size>2000000)throw new InputError("Invalid skill file.");return readFile(target);}
async function skillFiles(root:string,id:string){const base=await regularDirectory(root,`.agents/skills/${id}`);const result:string[]=[];async function walk(dir:string,prefix=''){for(const item of await readdir(dir,{withFileTypes:true})){if(!validPart(item.name)||item.isSymbolicLink())throw new InputError("Invalid skill file.");if(item.isDirectory())await walk(path.join(dir,item.name),prefix+item.name+'/');else if(item.isFile())result.push(prefix+item.name);if(result.length>500)throw new InputError("Skill package is too large.");}}await walk(base);return result;}
export async function projectSkillFiles(root:string){const manifest=await readSkillManifest(root);const result:string[]=[];for(const skill of manifest.skills){for(const file of await skillFiles(root,skill.id))if(/\.md$/i.test(file))result.push(`.agents/skills/${skill.id}/${file}`);}return result;}
export async function prepareProjectSkills(root:string,stackId:string,extraIds:string[]=[],loader=downloadSkill){const {stack,sources}=skillsForStack(stackId);const current=await readSkillManifest(root);if(current.stack)throw new InputError("The UI/CSS stack is locked for this project.");const extra=extraIds.map(id=>{const source=skillCatalog.find(s=>s.id===id);if(!source)throw new InputError("Unknown skill.");return source;});for(const source of [...new Map([...sources,...extra].map(s=>[s.id,s])).values()])await installSkill(root,await loader(source));const dir=await regularDirectory(root,'.vibeboard',true),manifest=await readSkillManifest(root);manifest.stack={id:stack.id,name:stack.name,lockedAt:new Date().toISOString()};await writeFile(path.join(dir,'skills.json'),JSON.stringify(manifest,null,2)+'\n',{mode:0o600});await writeFile(path.join(root,'UI-STACK.md'),`# UI stack\n\n${stack.name}\n\nThis choice is locked. Preserve it when implementing tasks; do not migrate frameworks without explicit owner approval.\n\nOfficial documentation: ${stack.docs}\n\n${stack.note}\n\nSkills are installed under .agents/skills. Read their SKILL.md files when relevant. Installing guidance does not install runtime dependencies. Use the application's pinned versions and verify skill compatibility before applying current upstream advice.\n`,{flag:'wx',mode:0o600});}
