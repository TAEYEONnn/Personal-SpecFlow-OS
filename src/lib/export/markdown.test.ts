import { describe, expect, it } from "vitest";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import { specDocumentToMarkdown } from "@/lib/export/markdown";

describe("specDocumentToMarkdown", () => {
  it("exports every MVP deliverable section", () => {
    const markdown = specDocumentToMarkdown(demoSpecDocument);

    expect(markdown).toContain("# 리디자인 프로젝트 (MVP)");
    expect(markdown).toContain("## 프로젝트 브리프");
    expect(markdown).toContain("## 확인 질문");
    expect(markdown).toContain("## 화면 목록");
    expect(markdown).toContain("## 역할·권한");
    expect(markdown).toContain("## 상태·예외");
    expect(markdown).toContain("## UX 문구");
    expect(markdown).toContain("## 작업 목록");
    expect(markdown).toContain("## 일일보고");
  });

  it("labels inference separately from original evidence", () => {
    const markdown = specDocumentToMarkdown(demoSpecDocument);
    expect(markdown).toContain("[추론]");
    expect(markdown).toContain("[원문]");
  });
});
