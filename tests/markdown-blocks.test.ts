import { test } from "node:test";
import assert from "node:assert/strict";
import { markdownBlocks, blockMarkdown } from "../lib/prd/markdown-blocks";
test("document block parsing preserves Markdown structure and source prefixes", () => {
  const source = "# Product\n\n## Requirements\n- **Bold** text\n  + nested\n2. Ordered\n- [x] Done\n> A quote\n---\n\n<script>literal text</script>\n";
  const blocks = markdownBlocks(source);
  assert.equal(blocks[0].kind, "heading"); assert.equal(blocks[0].level, 1);
  assert.equal(blocks[3].kind, "list"); assert.equal(blocks[6].prefix, "- [x] ");
  assert.equal(blocks.map(blockMarkdown).join("\n"), source);
});
test("fenced code and empty code blocks preserve literal Markdown and delimiters", () => {
  for (const source of ["```ts\nconst text = '**literal**';\n```", "```\n```", "```\n\n```", "~~~js\n# not a heading\n~~~~", "```\nunclosed", "```", "# A\n\n```\ncode\n```\n"]) {
    assert.equal(markdownBlocks(source).map(blockMarkdown).join("\n"), source);
  }
});
