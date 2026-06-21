import { beforeEach, describe, expect, it } from "vitest";
import {
  createDemoProject,
  getDemoProject,
  resetDemoStore,
  saveDemoDocument,
} from "@/lib/projects/demo-store";
import { demoSpecDocument } from "@/lib/spec/demo-document";

describe("demo project store", () => {
  beforeEach(() => resetDemoStore());

  it("creates a project with revision zero", () => {
    const project = createDemoProject("새 프로젝트");
    expect(project.name).toBe("새 프로젝트");
    expect(project.revision).toBe(0);
  });

  it("increments revision when a document is saved", () => {
    const project = createDemoProject("새 프로젝트");
    const revision = saveDemoDocument(project.id, 0, demoSpecDocument);

    expect(revision).toBe(1);
    expect(getDemoProject(project.id)?.document).toEqual(demoSpecDocument);
  });

  it("rejects a stale revision", () => {
    const project = createDemoProject("새 프로젝트");
    saveDemoDocument(project.id, 0, demoSpecDocument);

    expect(() => saveDemoDocument(project.id, 0, demoSpecDocument)).toThrow(
      "다른 곳에서 문서가 수정되었습니다.",
    );
  });
});
