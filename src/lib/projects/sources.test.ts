import { beforeEach, describe, expect, it } from "vitest";
import {
  addDemoSource,
  createDemoProject,
  deleteDemoSource,
  getDemoProject,
  resetDemoStore,
  saveDemoDocument,
  updateDemoSource,
} from "@/lib/projects/demo-store";
import { demoSpecDocument } from "@/lib/spec/demo-document";

describe("updateDemoSource", () => {
  beforeEach(() => resetDemoStore());

  it("updates source name", () => {
    const project = createDemoProject("테스트");
    const source = addDemoSource(project.id, { name: "원래 이름", type: "paste", content: "내용" });
    const updated = updateDemoSource(project.id, source.id, { name: "새 이름" });
    expect(updated.name).toBe("새 이름");
    expect(updated.content).toBe("내용");
  });

  it("updates source content", () => {
    const project = createDemoProject("테스트");
    const source = addDemoSource(project.id, { name: "이름", type: "paste", content: "기존 내용" });
    const updated = updateDemoSource(project.id, source.id, { content: "새 내용" });
    expect(updated.content).toBe("새 내용");
    expect(updated.name).toBe("이름");
  });

  it("updates both name and content", () => {
    const project = createDemoProject("테스트");
    const source = addDemoSource(project.id, { name: "이름", type: "txt", content: "내용" });
    const updated = updateDemoSource(project.id, source.id, { name: "수정된 이름", content: "수정된 내용" });
    expect(updated.name).toBe("수정된 이름");
    expect(updated.content).toBe("수정된 내용");
  });

  it("throws when project does not exist", () => {
    expect(() => updateDemoSource("nonexistent", "any", { name: "x" })).toThrow();
  });

  it("throws when source does not exist", () => {
    const project = createDemoProject("테스트");
    expect(() => updateDemoSource(project.id, "nonexistent-source", { name: "x" })).toThrow();
  });

  it("returns the updated source without mutating other sources", () => {
    const project = createDemoProject("테스트");
    const s1 = addDemoSource(project.id, { name: "소스1", type: "paste", content: "내용1" });
    addDemoSource(project.id, { name: "소스2", type: "paste", content: "내용2" });
    updateDemoSource(project.id, s1.id, { name: "소스1 수정" });

    expect(() => updateDemoSource(project.id, s1.id, { name: "소스1 재수정" })).not.toThrow();
  });

  it("marks the project for re-analysis when a source is added", () => {
    const project = createDemoProject("테스트");
    addDemoSource(project.id, { name: "새 원문", type: "paste", content: "내용" });
    expect(getDemoProject(project.id)?.needsRecompile).toBe(true);
  });

  it("marks the project for re-analysis when a source is deleted", () => {
    const project = createDemoProject("테스트");
    const source = addDemoSource(project.id, {
      name: "삭제할 원문",
      type: "paste",
      content: "내용",
    });
    saveDemoDocument(project.id, 0, demoSpecDocument);
    deleteDemoSource(project.id, source.id);
    expect(getDemoProject(project.id)?.needsRecompile).toBe(true);
  });

  it("keeps the re-analysis flag when an ordinary document edit is saved", () => {
    const project = createDemoProject("테스트");
    addDemoSource(project.id, { name: "새 원문", type: "paste", content: "내용" });

    saveDemoDocument(project.id, 0, demoSpecDocument);

    expect(getDemoProject(project.id)?.needsRecompile).toBe(true);
  });

  it("clears the re-analysis flag only after a full re-analysis", () => {
    const project = createDemoProject("테스트");
    addDemoSource(project.id, { name: "새 원문", type: "paste", content: "내용" });

    saveDemoDocument(project.id, 0, demoSpecDocument, true);

    expect(getDemoProject(project.id)?.needsRecompile).toBe(false);
  });
});
