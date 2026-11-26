import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp,readFile,writeFile,rm,symlink,mkdir } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { skillCatalog,skillsForStack,uiStacks } from '../lib/skill-catalog';
import { parseSkillSource,installSkill,readSkillManifest,prepareProjectSkills,projectSkillFiles,downloadSkill,type SkillPackage } from '../lib/project-skills';
import { readInstructions,saveInstructions } from '../lib/agent-instructions';
const markdown='---\nname: fixture\ndescription: Test fixture guidance.\n---\n# Use approved tokens\n';
const source=skillCatalog[0];
const pkg=(id=source.id):SkillPackage=>({source:{...source,id},commit:'a'.repeat(40),files:{'SKILL.md':markdown,'references/theme.md':'Theme guidance','LICENSE':'fixture license'}});
test('stack mappings use maintainer skills and preserve honest gaps',()=>{
 assert.ok(skillsForStack('shadcn').sources.some(s=>s.id==='shadcn'));
 assert.ok(skillsForStack('mui').sources.some(s=>s.repo==='mui/material-ui'));
 assert.equal(uiStacks.length,12);
 assert.throws(()=>skillsForStack('missing'));
 assert.equal(parseSkillSource('https://github.com/pbakaus/impeccable').id,'impeccable');
 assert.equal(parseSkillSource('https://github.com/shadcn-ui/ui/blob/main/skills/shadcn/SKILL.md').directory,'skills/shadcn');
 assert.throws(()=>parseSkillSource('http://localhost/private'));
 assert.throws(()=>parseSkillSource('https://github.com/a/b/tree/main/%2e%2e/private'));
});
test('installation keeps package references and source history; edited Markdown blocks upstream overwrite',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'vb-skills-'));
 try{
  await installSkill(root,pkg());
  assert.ok((await projectSkillFiles(root)).includes(`.agents/skills/${source.id}/references/theme.md`));
  const file=`.agents/skills/${source.id}/SKILL.md`,document=await readInstructions(root,file);
  await saveInstructions(root,markdown+'\nLocal owner changes',document.revision,file);
  await assert.rejects(installSkill(root,{...pkg(),commit:'b'.repeat(40)}),/Local skill edits/);
  assert.match((await readInstructions(root,file)).content,/Local owner changes/);
  assert.equal((await readSkillManifest(root)).skills[0].commit,'a'.repeat(40));
  await assert.rejects(readInstructions(root,'.agents/skills/impeccable/../../secret.md'));
 }finally{await rm(root,{recursive:true,force:true});}
});
test('new projects lock stack and never replace another stack through preparation',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'vb-stack-'));
 try{
  await prepareProjectSkills(root,'shadcn',[],async s=>({...pkg(s.id),source:s}));
  assert.equal((await readSkillManifest(root)).stack?.id,'shadcn');
  assert.match(await readFile(path.join(root,'UI-STACK.md'),'utf8'),/locked/);
  await assert.rejects(prepareProjectSkills(root,'mui',[],async s=>({...pkg(s.id),source:s})),/locked/);
 }finally{await rm(root,{recursive:true,force:true});}
});
test('symlink skill directories and untracked existing packages are preserved',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'vb-skill-symlink-')),target=await mkdtemp(path.join(os.tmpdir(),'vb-skill-target-'));
 try{await symlink(target,path.join(root,'.agents'));await assert.rejects(installSkill(root,pkg()),/regular/);assert.equal((await readSkillManifest(root)).skills.length,0);}
 finally{await rm(root,{recursive:true,force:true});await rm(target,{recursive:true,force:true});}
});
test('latest source resolves HEAD first, uses immutable revision for every file and includes licenses',async()=>{
 const calls:string[]=[];let version='a'.repeat(40);
 const fetcher:typeof fetch=async input=>{const url=String(input);calls.push(url);
  if(url.endsWith('/commits/HEAD'))return Response.json({sha:version});
  if(url.includes('/git/trees/'))return Response.json({truncated:false,tree:[{path:source.directory+'/SKILL.md',type:'blob',mode:'100644',size:200},{path:'LICENSE',type:'blob',mode:'100644',size:20}]});
  return new Response(url.endsWith('/SKILL.md')?markdown:'fixture license');
 };
 assert.equal((await downloadSkill(source,fetcher)).commit,'a'.repeat(40));version='b'.repeat(40);
 assert.equal((await downloadSkill(source,fetcher)).commit,'b'.repeat(40));
 assert.ok(calls.some(url=>url.includes('/'+'b'.repeat(40)+'/')));
 assert.ok(!calls.some(url=>url.includes('raw.githubusercontent.com')&&url.includes('/main/')));
});
test('binary reference assets survive installation and unchanged package updates',async()=>{
 const root=await mkdtemp(path.join(os.tmpdir(),'vb-skill-assets-'));
 const asset=Buffer.from([137,80,78,71,0,255]);
 try{const packageWithImage={...pkg(),files:{...pkg().files,'assets/example.png':asset.toString('base64')},binaryFiles:['assets/example.png']};await installSkill(root,packageWithImage);assert.deepEqual(await readFile(path.join(root,'.agents/skills',source.id,'assets/example.png')),asset);await installSkill(root,{...packageWithImage,commit:'b'.repeat(40)});assert.equal((await readSkillManifest(root)).skills[0].commit,'b'.repeat(40));}
 finally{await rm(root,{recursive:true,force:true});}
});
test('upstream README license declarations are preserved without inventing a missing license',async()=>{
 const vercel=skillCatalog.find(s=>s.id==='web-design-guidelines')!;
 const fetcher:typeof fetch=async input=>{const url=String(input);if(url.endsWith('/commits/HEAD'))return Response.json({sha:'a'.repeat(40)});if(url.includes('/git/trees/'))return Response.json({truncated:false,tree:[{path:vercel.directory+'/SKILL.md',type:'blob',mode:'100644',size:200}]});return new Response(url.endsWith('/README.md')?'# Upstream\n\n## License\n\nMIT\n':markdown);};
 const value=await downloadSkill(vercel,fetcher);assert.match(value.files['UPSTREAM-LICENSE.md'],/No standalone license/);assert.match(value.files['UPSTREAM-README.md'],/MIT/);assert.equal(value.files.LICENSE,undefined);
});
