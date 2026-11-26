import Link from "next/link";
import { ArrowLeft, CheckCheck, FileText, Layers, Mic } from "lucide-react";
export default function About() {
  return <main className="about-page">
    <Link className="text-button" href="/"><ArrowLeft size={15} />Back to SoloTask</Link>
    <div className="about-brand"><CheckCheck size={30} /><h1>SoloTask</h1></div>
    <p className="about-lead">See what your agents are building.</p>
    <section className="overview-panel"><h2><Layers size={18} />One cockpit, from idea to tasks</h2><p>SoloTask brings local projects, PRD drafting, voice input, task planning and live activity together. This is the web application; a desktop edition is planned.</p></section>
    <section className="overview-panel"><h2><FileText size={18} />Powered by Task Master</h2><p>Task generation uses the separately installed <a href="https://github.com/eyaltoledano/claude-task-master" target="_blank" rel="noreferrer">Task Master</a> CLI, created by Eyal Toledano and Ralph Khreish. SoloTask is an independent integration and is not endorsed by its authors.</p><p>Task Master is licensed under MIT with the Commons Clause, which includes commercial restrictions. Attribution does not grant commercial permission. Distribution or access through paid workshops and subscriptions requires further license review or permission before a commercial release.</p><p>We plan to replace this integration with an independently developed SoloTask engine in the future. Until then, Task Master retains its name and attribution.</p><a href="/licenses/task-master.txt" target="_blank" rel="noreferrer">Read Task Master’s full license and copyright notice</a></section>
    <section className="overview-panel"><h2><Mic size={18} />Voice and AI</h2><p>Voice recordings are transcribed on the machine running SoloTask using OpenAI Whisper (MIT licensed). PRD generation and revisions send text to OpenAI using the API key you supply. Task Master sends the approved PRD to its configured OpenAI model. API usage is billed by your provider.</p><p>SoloTask keeps your API key in memory for the current session and running request. It does not save the key in project files or browser storage. Drafts are saved in this browser; project task files remain local.</p><a href="https://github.com/openai/whisper" target="_blank" rel="noreferrer">OpenAI Whisper</a></section>
  </main>;
}
