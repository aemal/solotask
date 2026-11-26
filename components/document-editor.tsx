"use client";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useEffect, useRef, useState } from "react";
import { Bold, Italic, Heading2, List, Code2, FileText } from "lucide-react";
import { markdownBlocks, type MarkdownBlock } from "@/lib/prd/markdown-blocks";
type Selection = { start: number; end: number; document: string };
const START = "\uE000VIBE_START\uE001", END = "\uE000VIBE_END\uE001";
function inline(parent: HTMLElement, value: string) {
  const pattern = /(`+)([^`]+)\1|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*\n]+)\*|_([^_\n]+)_/g;
  let offset = 0;
  for (const match of value.matchAll(pattern)) {
    parent.appendChild(document.createTextNode(value.slice(offset, match.index)));
    const element = document.createElement(match[1] ? "code" : match[3] || match[4] ? "strong" : "em");
    element.textContent = match[2] || match[3] || match[4] || match[5] || match[6];
    if (match[1]) element.dataset.ticks = match[1];
    parent.appendChild(element); offset = match.index! + match[0].length;
  }
  parent.appendChild(document.createTextNode(value.slice(offset)));
}
function makeBlock(block: MarkdownBlock) {
  const element = document.createElement(block.kind === "heading" ? `h${block.level}` : block.kind === "code" ? "pre" : block.kind === "rule" ? "hr" : block.kind === "quote" ? "blockquote" : "p");
  element.dataset.kind = block.kind; element.dataset.prefix = block.prefix;
  if (block.kind === "code") { element.dataset.suffix = block.suffix || ""; element.dataset.bodyLines = String(block.bodyLines ?? 1); element.textContent = block.text; }
  else if (block.kind !== "rule") inline(element, block.text);
  if (block.kind === "list") { element.className = "document-list-item"; element.dataset.marker = block.prefix.trim().replace(/\s+$/, ""); }
  if (!element.childNodes.length && block.kind !== "rule") element.appendChild(document.createElement("br"));
  return element;
}
function inlineMarkdown(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) return node.textContent || "";
  if (!(node instanceof HTMLElement)) return "";
  const text = [...node.childNodes].map(inlineMarkdown).join("");
  switch (node.tagName) {
    case "STRONG": case "B": return `**${text}**`;
    case "EM": case "I": return `*${text}*`;
    case "CODE": { const ticks = node.dataset.ticks || "`"; return `${ticks}${text}${ticks}`; }
    case "BR": return "\n";
    case "DIV": case "P": return text + "\n";
    default: return text;
  }
}
function serialize(root: HTMLElement) {
  const parts = [...root.childNodes].map(node => {
    if (!(node instanceof HTMLElement)) return node.textContent || "";
    if (node.tagName === "PRE") return `${node.dataset.prefix || "```"}${node.textContent || node.dataset.bodyLines !== "0" ? `\n${node.textContent || ""}` : ""}${node.dataset.suffix ? `\n${node.dataset.suffix}` : ""}`;
    if (node.tagName === "HR") return node.dataset.prefix || "---";
    const text = [...node.childNodes].map(inlineMarkdown).join("").replace(/\n$/, "");
    const heading = node.tagName.match(/^H([1-6])$/);
    const prefix = heading ? "#".repeat(Number(heading[1])) + " " : node.dataset.prefix || (node.tagName === "BLOCKQUOTE" ? "> " : "");
    return prefix + text;
  });
  return parts.reduce((result, part, index) => result + (index && !part.startsWith(END) && !parts[index - 1].endsWith(START) ? "\n" : "") + part, "");
}
function nodePath(node: Node, root: Node) {
  const path: number[] = [];
  while (node !== root && node.parentNode) { path.unshift([...node.parentNode.childNodes].indexOf(node as ChildNode)); node = node.parentNode; }
  return path;
}
function atPath(root: Node, path: number[]) { return path.reduce((node, index) => node.childNodes[index], root); }
export default function DocumentEditor({ value, disabled, onChange, onSelection, label = "PRD", maxLength = 100000 }: { label?: string; maxLength?: number; value: string; disabled: boolean; onChange: (value: string) => void; onSelection: (selection: Selection) => void }) {
  const root = useRef<HTMLDivElement>(null), lastEmitted = useRef<string | null>(null), composing = useRef(false);
  const [source, setSource] = useState(false);
  const pendingPaste = useRef(false), pasteFrame = useRef(0), pasteTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latestEmit = useRef<() => void>(() => {});
  function cancelPasteSync() {
    cancelAnimationFrame(pasteFrame.current);
    if (pasteTimer.current) clearTimeout(pasteTimer.current);
    pasteTimer.current = null; pendingPaste.current = false;
  }
  useEffect(() => () => { cancelPasteSync(); }, []);
  const previousSelection = useRef<{ node: Node; endNode: Node; start: number; end: number; value: string } | null>(null);
  useEffect(() => {
    if (!root.current || source || value === lastEmitted.current) return;
    root.current.replaceChildren(...markdownBlocks(value).map(makeBlock));
    lastEmitted.current = value;
  }, [value, source]);
  function emit() {
    if (!root.current || composing.current || pendingPaste.current) return;
    const markdown = serialize(root.current);
    root.current.dataset.empty = String(!root.current.textContent?.trim());
    if (markdown !== lastEmitted.current) { lastEmitted.current = markdown; onChange(markdown); }
  }
  latestEmit.current = emit;
  function flushPaste() {
    if (!pendingPaste.current) return;
    cancelPasteSync(); latestEmit.current();
  }
  function select() {
    if (disabled || source) return;
    const element = root.current, selection = window.getSelection();
    if (!element || !selection?.rangeCount || selection.isCollapsed) { previousSelection.current = null; return; }
    const range = selection.getRangeAt(0);
    if (!element.contains(range.startContainer) || !element.contains(range.endContainer)) return;
    const previous = previousSelection.current;
    if (previous?.node === range.startContainer && previous.endNode === range.endContainer && previous.start === range.startOffset && previous.end === range.endOffset && previous.value === value) return;
    previousSelection.current = { node: range.startContainer, endNode: range.endContainer, start: range.startOffset, end: range.endOffset, value };
    const clone = element.cloneNode(true) as HTMLElement;
    const copy = document.createRange();
    copy.setStart(atPath(clone, nodePath(range.startContainer, element)), range.startOffset);
    copy.setEnd(atPath(clone, nodePath(range.endContainer, element)), range.endOffset);
    const endRange = copy.cloneRange(); endRange.collapse(false); endRange.insertNode(document.createTextNode(END));
    copy.collapse(true); copy.insertNode(document.createTextNode(START));
    const marked = serialize(clone), start = marked.indexOf(START), end = marked.indexOf(END) - START.length;
    const markdown = marked.replace(START, "").replace(END, "");
    if (start < 0 || end <= start) return;
    if (markdown !== lastEmitted.current) { lastEmitted.current = markdown; onChange(markdown); }
    onSelection({ start, end, document: markdown });
  }
  useEffect(() => {
    let frame = 0;
    function changed() { cancelAnimationFrame(frame); frame = requestAnimationFrame(select); }
    document.addEventListener("selectionchange", changed);
    return () => { cancelAnimationFrame(frame); document.removeEventListener("selectionchange", changed); };
  });
  function blockFormat(kind: "heading" | "list") {
    const element = root.current, selection = window.getSelection(); if (!element || !selection?.rangeCount) return;
    let block: Node = selection.anchorNode!;
    if (!element.contains(block) || block === element) return;
    while (block.parentNode !== element && block.parentNode) block = block.parentNode;
    if (!(block instanceof HTMLElement)) return;
    const removeFormat = kind === "heading" ? block.tagName === "H2" : block.dataset.kind === "list";
    const replacement = makeBlock({ kind: removeFormat ? "paragraph" : kind, text: "", prefix: removeFormat ? "" : kind === "heading" ? "## " : "- ", level: 2 });
    replacement.replaceChildren(...block.childNodes); block.replaceWith(replacement);
    const range = document.createRange(); range.selectNodeContents(replacement); range.collapse(false); selection.removeAllRanges(); selection.addRange(range); emit();
  }
  return <div className="document-editor">
    <div className="document-toolbar" role="toolbar" aria-label="Document formatting">
      {!source && <><Button type="button" className="icon-button" title="Bold" aria-label="Bold" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => { document.execCommand("bold"); emit(); }}><Bold size={15} /></Button><Button type="button" className="icon-button" title="Italic" aria-label="Italic" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => { document.execCommand("italic"); emit(); }}><Italic size={15} /></Button><Button type="button" className="icon-button" title="Heading" aria-label="Heading" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => blockFormat("heading")}><Heading2 size={16} /></Button><Button type="button" className="icon-button" title="Bullet list" aria-label="Bullet list" disabled={disabled} onMouseDown={e => e.preventDefault()} onClick={() => blockFormat("list")}><List size={16} /></Button><span className="document-toolbar-hint">Write directly · select text to refine with AI</span></>}
      <Button type="button" className="text-button document-source-toggle" aria-pressed={source} onClick={() => { flushPaste(); lastEmitted.current = null; setSource(!source); }}>{source ? <FileText size={14} /> : <Code2 size={14} />}{source ? "Document" : "Markdown"}</Button>
    </div>
    {source ? <Textarea className="document-source" aria-label={`${label} Markdown source`} maxLength={maxLength} value={value} disabled={disabled} onChange={e => onChange(e.target.value)} onSelect={e => { const field = e.currentTarget; if (field.selectionEnd > field.selectionStart) onSelection({ document: value, start: field.selectionStart, end: field.selectionEnd }); }} /> : <div ref={root} className="document-canvas" role="textbox" aria-label={`${label} document`} aria-multiline="true" aria-readonly={disabled} contentEditable={!disabled} suppressContentEditableWarning data-empty={!value.trim()} data-placeholder={label === "PRD" ? "Start writing, import a file, or draft from an idea above…" : "Write your project instructions here…"} onInput={emit} onBlur={flushPaste} onMouseUp={select} onKeyUp={select} onCompositionStart={() => { composing.current = true; }} onCompositionEnd={() => { composing.current = false; emit(); }} onPaste={event => {
      event.preventDefault();
      cancelPasteSync(); pendingPaste.current = true;
      document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
      // Keep the native insertion/undo behavior; publish Markdown after the first paint.
      pasteFrame.current = requestAnimationFrame(() => {
        pasteTimer.current = setTimeout(flushPaste, 0);
      });
    }} onKeyDown={event => {
      if (event.key !== "Enter" || event.shiftKey || composing.current) return;
      const element = root.current, selection = window.getSelection(); if (!element || !selection?.rangeCount) return;
      const range = selection.getRangeAt(0); let block: Node = range.startContainer;
      while (block.parentNode !== element && block.parentNode) block = block.parentNode;
      if (!(block instanceof HTMLElement) || block.tagName === "PRE" || block.parentNode !== element) return;
      event.preventDefault(); range.deleteContents();
      if (block.dataset.kind === "list" && !block.textContent?.trim()) { block.dataset.kind = "paragraph"; block.dataset.prefix = ""; block.className = ""; emit(); return; }
      const tail = document.createRange(); tail.setStart(range.startContainer, range.startOffset); tail.setEnd(block, block.childNodes.length);
      const fragment = tail.extractContents();
      const blockSource = (block.dataset.prefix || "") + [...block.childNodes].map(inlineMarkdown).join("").replace(/\n$/, "");
      const parsed = markdownBlocks(blockSource)[0];
      const formatted = makeBlock(parsed);
      block.replaceWith(formatted);
      let prefix = parsed.kind === "list" ? parsed.prefix || "- " : "";
      prefix = prefix.replace(/^(\s*)(\d+)([.)]\s+)/, (_, spaces, number, ending) => `${spaces}${Number(number) + 1}${ending}`).replace(/\[[xX]\]/, "[ ]");
      const next = makeBlock({ kind: parsed.kind === "list" ? "list" : "paragraph", prefix, text: "" });
      if (fragment.textContent) next.replaceChildren(fragment);
      formatted.after(next);
      const caret = document.createRange(); caret.selectNodeContents(next); caret.collapse(true); selection.removeAllRanges(); selection.addRange(caret); emit();
    }} />}
  </div>;
}
