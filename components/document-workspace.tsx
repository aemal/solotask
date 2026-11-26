"use client";
import { Button } from "@/components/ui/button";
import { Tabs } from "@heroui/react";
import { type ReactNode } from "react";
import { FileText, FolderOpen } from "lucide-react";
export default function DocumentWorkspace({ files, openFiles, active, onOpen, children }: { files: string[]; openFiles: string[]; active: string; onOpen: (file: string) => void; children: ReactNode }) {
  const title = (file: string) => file.startsWith(".agents/skills/") && file.endsWith("/SKILL.md") ? `${file.split("/")[2]} / SKILL.md` : file.split("/").pop() || file;
  return <div className="document-workspace"><div role="complementary" className="document-explorer" aria-label="Project documents"><h3><FolderOpen size={15}/>Your documents</h3>{files.map(file => <Button key={file} className={active === file ? "selected" : ""} onClick={() => onOpen(file)} title={file}><FileText size={15}/><span>{title(file)}</span></Button>)}<p>Project documents only</p></div><Tabs className="document-workarea" selectedKey={active} onSelectionChange={key => onOpen(String(key))}><Tabs.ListContainer><Tabs.List className="document-tabs" aria-label="Open documents">{openFiles.map(file => <Tabs.Tab key={file} id={file}><FileText size={14}/>{title(file)}<Tabs.Indicator/></Tabs.Tab>)}</Tabs.List></Tabs.ListContainer>{children}</Tabs></div>;
}
export function DocumentPanel({ file, children }: { file: string; active: boolean; children: ReactNode }) {
  return <Tabs.Panel className="document-panel" id={file} shouldForceMount>{children}</Tabs.Panel>;
}
