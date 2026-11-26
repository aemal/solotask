export type MarkdownBlock = { kind: "paragraph" | "heading" | "list" | "quote" | "code" | "rule"; text: string; prefix: string; suffix?: string; level?: number; bodyLines?: number };
/** Preserve source prefixes and fenced code while presenting the common document blocks. */
export function markdownBlocks(markdown: string): MarkdownBlock[] {
  const lines = markdown.replace(/\r\n?/g, "\n").split("\n");
  const blocks: MarkdownBlock[] = [];
  for (let index = 0; index < lines.length; index++) {
    const line = lines[index], fence = line.match(/^\s*(`{3,}|~{3,})(.*)$/);
    if (fence) {
      const content: string[] = []; let suffix = "";
      while (++index < lines.length) {
        if (new RegExp(`^\\s*${fence[1][0]}{${fence[1].length},}\\s*$`).test(lines[index])) { suffix = lines[index]; break; }
        content.push(lines[index]);
      }
      blocks.push({ kind: "code", text: content.join("\n"), prefix: line, suffix, bodyLines: content.length }); continue;
    }
    const heading = line.match(/^(#{1,6})\s+(.*)$/);
    if (heading) { blocks.push({ kind: "heading", text: heading[2], prefix: `${heading[1]} `, level: heading[1].length }); continue; }
    const list = line.match(/^(\s*(?:[-+*]|\d+[.)])\s+(?:\[[ xX]\]\s+)?)(.*)$/);
    if (list) { blocks.push({ kind: "list", text: list[2], prefix: list[1] }); continue; }
    const quote = line.match(/^(\s*>\s?)(.*)$/);
    if (quote) { blocks.push({ kind: "quote", text: quote[2], prefix: quote[1] }); continue; }
    if (/^\s*(?:-{3,}|\*{3,}|_{3,})\s*$/.test(line)) { blocks.push({ kind: "rule", text: "", prefix: line }); continue; }
    blocks.push({ kind: "paragraph", text: line, prefix: "" });
  }
  return blocks;
}
export function blockMarkdown(block: MarkdownBlock) {
  return block.kind === "code" ? `${block.prefix}${block.text || block.bodyLines !== 0 ? `\n${block.text}` : ""}${block.suffix ? `\n${block.suffix}` : ""}` : `${block.prefix}${block.text}`;
}
