import { beforeEach, describe, expect, it } from "vitest";
import {
  addDemoSource,
  createDemoProject,
  resetDemoStore,
  updateDemoSource,
} from "@/lib/projects/demo-store";

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
});
