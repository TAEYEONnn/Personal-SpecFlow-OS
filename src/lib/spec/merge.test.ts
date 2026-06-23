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

  // ─── task deduplication ───────────────────────────────────────────────────

  it("deduplicates tasks with same title when AI generates new IDs", () => {
    const previous = structuredClone(demoSpecDocument);
    // user completes the AI task
    previous.tasks[0] = { ...previous.tasks[0], id: "task-auth-v1", status: "done" };

    // AI regenerates the same task with a new ID
    const compiled = structuredClone(demoSpecDocument);
    compiled.tasks[0] = { ...compiled.tasks[0], id: "task-auth-v2", status: "todo" };

    const { document, stats } = mergeCompiledDocument(previous, compiled);

    // Only one task, not two
    const authTasks = document.tasks.filter((t) =>
      t.title.includes("아이디·비밀번호"),
    );
    expect(authTasks).toHaveLength(1);
    // Completed status preserved
    expect(authTasks[0].status).toBe("done");
    // Stable ID from previous
    expect(authTasks[0].id).toBe("task-auth-v1");
    // Dedup counter incremented
    expect(stats.deduplicated).toBeGreaterThan(0);
  });

  it("does not duplicate task on multiple recompiles", () => {
    const base = structuredClone(demoSpecDocument);
    const compiled1 = structuredClone(demoSpecDocument);
    const { document: after1 } = mergeCompiledDocument(base, compiled1);

    const compiled2 = structuredClone(demoSpecDocument);
    const { document: after2 } = mergeCompiledDocument(after1, compiled2);

    const compiled3 = structuredClone(demoSpecDocument);
    const { document: after3 } = mergeCompiledDocument(after2, compiled3);

    // Task count must not grow on repeated recompile
    expect(after3.tasks.length).toBe(base.tasks.length);
  });

  it("preserves completed AI task when AI no longer regenerates it", () => {
    const previous = structuredClone(demoSpecDocument);
    previous.tasks[0] = { ...previous.tasks[0], status: "done" };

    // AI produces a different set — doesn't regenerate the completed task
    const compiled = structuredClone(demoSpecDocument);
    compiled.tasks = [
      {
        ...compiled.tasks[0],
        id: "task-new",
        title: "완전히 새로운 작업",
        relatedIds: [],
        relatedRequirementIds: [],
        relatedScreenIds: [],
      },
    ];

    const { document, stats } = mergeCompiledDocument(previous, compiled);

    expect(document.tasks.some((t) => t.status === "done")).toBe(true);
    expect(stats.preservedCompletedTasks).toBeGreaterThan(0);
  });

  it("drops pure todo AI tasks that AI no longer regenerates", () => {
    const previous = structuredClone(demoSpecDocument);
    previous.tasks[0] = { ...previous.tasks[0], id: "task-old-todo", status: "todo", source: "ai" };

    // AI produces completely different tasks (no semantic overlap)
    const compiled = structuredClone(demoSpecDocument);
    compiled.tasks = [
      {
        ...compiled.tasks[0],
        id: "task-entirely-new",
        title: "완전히 다른 새 작업",
        relatedIds: [],
        relatedRequirementIds: [],
        relatedScreenIds: [],
      },
    ];

    const { document } = mergeCompiledDocument(previous, compiled);

    expect(document.tasks.some((t) => t.id === "task-old-todo")).toBe(false);
  });

  it("always preserves user-created tasks regardless of status", () => {
    const previous = structuredClone(demoSpecDocument);
    previous.tasks.push({
      ...previous.tasks[0],
      id: "task-user-todo",
      title: "사용자가 직접 만든 todo",
      source: "user",
      status: "todo",
    });

    // AI generates a completely different set
    const compiled = structuredClone(demoSpecDocument);
    compiled.tasks = [];

    const { document } = mergeCompiledDocument(previous, compiled);

    expect(document.tasks.some((t) => t.id === "task-user-todo")).toBe(true);
  });

  // ─── brief field protection ───────────────────────────────────────────────

  it("preserves user-edited brief fields on recompile", () => {
    const previous = structuredClone(demoSpecDocument);
    previous.brief.problem = "사용자가 직접 쓴 문제 정의";
    previous.brief.userEditedFields = ["problem"];

    const compiled = structuredClone(demoSpecDocument);
    compiled.brief.problem = "AI가 새로 쓴 문제 정의";

    const { document } = mergeCompiledDocument(previous, compiled);

    expect(document.brief.problem).toBe("사용자가 직접 쓴 문제 정의");
    expect(document.brief.userEditedFields).toContain("problem");
  });

  it("uses AI brief value when field is not user-edited", () => {
    const previous = structuredClone(demoSpecDocument);
    previous.brief.purpose = "이전 목적";
    previous.brief.userEditedFields = []; // purpose was not user-edited

    const compiled = structuredClone(demoSpecDocument);
    compiled.brief.purpose = "AI가 새로 분석한 목적";

    const { document } = mergeCompiledDocument(previous, compiled);

    expect(document.brief.purpose).toBe("AI가 새로 분석한 목적");
  });

  // ─── question answer preservation ────────────────────────────────────────

  it("preserves question answer via direct ID match", () => {
    const previous = structuredClone(demoSpecDocument);
    previous.questions[0] = {
      ...previous.questions[0],
      answer: "이번 범위에서 제외합니다.",
      resolved: true,
    };

    // Same ID — exact match
    const compiled = structuredClone(demoSpecDocument);
    compiled.questions[0] = {
      ...compiled.questions[0],
      id: previous.questions[0].id,
      answer: null,
      resolved: false,
    };

    const { document, stats } = mergeCompiledDocument(previous, compiled);

    expect(document.questions[0].answer).toBe("이번 범위에서 제외합니다.");
    expect(document.questions[0].resolved).toBe(true);
    expect(stats.preservedAnsweredQuestions).toBeGreaterThan(0);
  });

  it("preserves question answer as orphan when question is unmatched", () => {
    const previous = structuredClone(demoSpecDocument);
    previous.questions[0] = {
      ...previous.questions[0],
      id: "old-q-unique",
      answer: "이번 범위에서 제외합니다.",
      resolved: true,
    };

    const compiled = structuredClone(demoSpecDocument);
    compiled.questions = compiled.questions.map((q) => ({ ...q, id: q.id + "-new" }));

    const { document } = mergeCompiledDocument(previous, compiled);

    // Orphan answer must be preserved somewhere in the question list
    const preserved = document.questions.find((q) => q.answer?.includes("제외합니다"));
    expect(preserved).toBeTruthy();
    expect(preserved?.resolved).toBe(true);
  });

  // ─── screen position preservation ────────────────────────────────────────

  it("preserves manual screen positions after recompile", () => {
    const previous = structuredClone(demoSpecDocument);
    previous.screens[0].position = { x: 500, y: 300 };

    const compiled = structuredClone(demoSpecDocument);
    compiled.screens[0].position = { x: 10, y: 10 };

    const { document, stats } = mergeCompiledDocument(previous, compiled);

    expect(document.screens[0].position).toEqual({ x: 500, y: 300 });
    expect(stats.preservedScreenPositions).toBeGreaterThan(0);
  });

  // ─── merge stats ─────────────────────────────────────────────────────────

  it("returns correct merge stats on first compile (no previous)", () => {
    const { stats } = mergeCompiledDocument(null, demoSpecDocument);

    expect(stats.added).toBeGreaterThan(0);
    expect(stats.preserved).toBe(0);
    expect(stats.deduplicated).toBe(0);
  });
});
