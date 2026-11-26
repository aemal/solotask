import { skillCatalog, uiStacks, defaultSkillIds } from "@/lib/skill-catalog";
export async function GET() {return Response.json({skills:skillCatalog,stacks:uiStacks,defaults:defaultSkillIds});}
