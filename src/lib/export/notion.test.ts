import { describe, expect, it } from "vitest";
import { specDocumentToNotionBlocks } from "@/lib/export/notion";
import { demoSpecDocument } from "@/lib/spec/demo-document";

describe("specDocumentToNotionBlocks", () => {
  it("returns a non-empty array", () => {
    const blocks = specDocumentToNotionBlocks(demoSpecDocument);
    expect(blocks.length).toBeGreaterThan(0);
  });

  it("first block is heading_1 with the brief title", () => {
    const blocks = specDocumentToNotionBlocks(demoSpecDocument);
    const first = blocks[0];
    expect(first.type).toBe("heading_1");
    if (first.type === "heading_1") {
      expect(first.heading_1.rich_text[0].text.content).toBe(demoSpecDocument.brief.title);
    }
  });

  it("every block has object: 'block'", () => {
    const blocks = specDocumentToNotionBlocks(demoSpecDocument);
    for (const block of blocks) {
      expect(block.object).toBe("block");
    }
  });

  it("contains to_do blocks for tasks", () => {
    const blocks = specDocumentToNotionBlocks(demoSpecDocument);
    const todos = blocks.filter((b) => b.type === "to_do");
    expect(todos.length).toBeGreaterThanOrEqual(demoSpecDocument.tasks.length);
  });

  it("contains at least one divider", () => {
    const blocks = specDocumentToNotionBlocks(demoSpecDocument);
    const dividers = blocks.filter((b) => b.type === "divider");
    expect(dividers.length).toBeGreaterThan(0);
  });

  it("each block type is a recognized Notion block type", () => {
    const validTypes = new Set([
      "heading_1", "heading_2", "heading_3",
      "paragraph", "bulleted_list_item", "to_do", "divider",
    ]);
    const blocks = specDocumentToNotionBlocks(demoSpecDocument);
    for (const block of blocks) {
      expect(validTypes.has(block.type), `unknown block type: ${block.type}`).toBe(true);
    }
  });
});
