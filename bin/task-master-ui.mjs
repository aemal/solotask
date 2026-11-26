#!/usr/bin/env node
import { spawn } from "node:child_process";
import { existsSync, realpathSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
const args = process.argv.slice(2);
if (args.includes("--help") || args.includes("-h")) { console.log("Usage: solotask [project-path] [--port 4310] [--dev]\nRun from any project. Reads .taskmaster/tasks/**/*.json and legacy tasks.json files.\nRead-only, localhost-only. Requires Node 22.12+."); process.exit(0); }
const app = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let project = process.cwd(), port = "4310", dev = false, supplied = false;
for (let i=0;i<args.length;i++) {
  if(args[i] === "--dev") dev = true;
  else if(args[i] === "--port") port = args[++i];
  else if(args[i].startsWith("-")) { console.error(`Unknown option: ${args[i]}`); process.exit(1); }
  else if (!supplied) { project = path.resolve(args[i]); supplied = true; }
  else { console.error("Only one project path is allowed."); process.exit(1); }
}
if(!/^\d+$/.test(port || "") || Number(port)<1 || Number(port)>65535) { console.error("Port must be between 1 and 65535."); process.exit(1); }
try { project = realpathSync(project); } catch { console.error(`Project does not exist: ${project}`); process.exit(1); }
if(!dev && !existsSync(path.join(app, ".next", "BUILD_ID"))) { console.error(`Build the UI first: cd "${app}" && npm run build`); process.exit(1); }
console.log(`\nVibeBoard → http://127.0.0.1:${port}\nProject: ${project}\nRead-only · refreshes every 3 seconds\n`);
const child = spawn(process.execPath, [path.join(app,"node_modules/next/dist/bin/next"), dev ? "dev" : "start", ...(dev ? ["--webpack"] : []), "--hostname", "127.0.0.1", "--port", port], { cwd: app, env: { ...process.env, TASK_MASTER_PROJECT: project }, stdio: "inherit" });
for(const signal of ["SIGINT", "SIGTERM"]) process.on(signal, () => child.kill(signal));
child.on("error", error => { console.error(error.message); process.exit(1); });
child.on("exit", code => process.exit(code ?? 0));
