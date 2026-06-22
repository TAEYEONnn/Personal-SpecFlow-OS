import { describe, expect, it } from "vitest";

import { demoSpecDocument } from "@/lib/spec/demo-document";

import { mergeCompiledDocument } from "./merge";

describe("mergeCompiledDocument", () => {
  it("preserves question answers, resolved state, screen positions, user tasks, and Figma mapping", () => {
    const previous = structuredClone(demoSpecDocument);
    previous.questions[0] = {
      ...previous.questions[0],
      answer: "소셜 로그인은 이번 범위에서 제외합니다.",
      answeredAt: "2026-06-22T01:00:00.000Z",
      answeredBy: "designer",
      resolved: true,
    };
    previous.screens[0].position = { x: 999, y: 333 };
    previous.tasks.push({
      ...previous.tasks[0],
      id: "task-user",
      title: "직접 만든 작업",
      source: "user",
    });
    previous.figmaMapping = {
      fileUrl: "https://figma.com/file/abc",
      fileKey: "abc",
      libraryName: "Library",
      recommendations: [],
      analyzedAt: "2026-06-22T01:00:00.000Z",
      status: "completed",
      error: null,
    };

    const compiled = structuredClone(demoSpecDocument);
    compiled.questions[0] = {
      ...compiled.questions[0],
      resolved: false,
      answer: null,
      answeredAt: null,
      answeredBy: null,
    };
    compiled.screens[0].position = { x: 10, y: 20 };
    compiled.tasks = compiled.tasks.filter((task) => task.id !== "task-user");
    compiled.figmaMapping = {
      fileUrl: "",
      fileKey: null,
      libraryName: null,
      recommendations: [],
      analyzedAt: null,
      status: "idle",
      error: null,
    };

    const { document } = mergeCompiledDocument(previous, compiled);

    expect(document.questions[0]).toMatchObject({
      answer: "소셜 로그인은 이번 범위에서 제외합니다.",
      answeredAt: "2026-06-22T01:00:00.000Z",
      answeredBy: "designer",
      resolved: true,
    });
    expect(document.screens[0].position).toEqual({ x: 999, y: 333 });
    expect(document.tasks.some((task) => task.id === "task-user")).toBe(true);
    expect(document.figmaMapping.fileKey).toBe("abc");
  });
});
