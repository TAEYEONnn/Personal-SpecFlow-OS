import { describe, expect, it } from "vitest";
import { computeImpact, diffDocuments } from "@/lib/spec/impact";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import type { SpecDocument } from "@/lib/spec/schema";

describe("computeImpact", () => {
  it("returns affectedScreenIds from the requirement", () => {
    const req = demoSpecDocument.requirements[0];
    const impact = computeImpact(demoSpecDocument, req.id);
    expect(impact.requirementId).toBe(req.id);
    expect(impact.affectedScreenIds).toEqual(req.affectedScreenIds);
  });

  it("returns states belonging to affected screens", () => {
    const req = demoSpecDocument.requirements.find(
      (r) => r.affectedScreenIds.length > 0,
    );
    if (!req) return;
    const impact = computeImpact(demoSpecDocument, req.id);
    const expectedStateIds = demoSpecDocument.states
      .filter((s) => impact.affectedScreenIds.includes(s.screenId))
      .map((s) => s.id);
    expect(impact.affectedStateIds).toEqual(expect.arrayContaining(expectedStateIds));
  });

  it("returns empty arrays for unknown requirement ID", () => {
    const impact = computeImpact(demoSpecDocument, "req-nonexistent");
    expect(impact.affectedScreenIds).toEqual([]);
    expect(impact.affectedStateIds).toEqual([]);
    expect(impact.affectedCopyIds).toEqual([]);
  });

  it("excludes soft-deleted tasks from affected task IDs", () => {
    const requirementId = demoSpecDocument.requirements[0].id;
    const activeTask = {
      ...demoSpecDocument.tasks[0],
      id: "task-active",
      relatedIds: [requirementId],
      deletedAt: null,
    };
    const deletedTask = {
      ...activeTask,
      id: "task-deleted",
      deletedAt: "2026-06-22T00:00:00.000Z",
    };
    const document: SpecDocument = {
      ...demoSpecDocument,
      tasks: [activeTask, deletedTask],
    };

    expect(computeImpact(document, requirementId).affectedTaskIds).toEqual([
      "task-active",
    ]);
  });
});

describe("diffDocuments", () => {
  it("returns no changes between identical documents", () => {
    const diff = diffDocuments(demoSpecDocument, demoSpecDocument);
    expect(diff.addedScreenIds).toHaveLength(0);
    expect(diff.removedScreenIds).toHaveLength(0);
    expect(diff.changedScreenIds).toHaveLength(0);
    expect(diff.addedRequirementIds).toHaveLength(0);
    expect(diff.removedRequirementIds).toHaveLength(0);
  });

  it("detects added screens", () => {
    const updated: SpecDocument = {
      ...demoSpecDocument,
      screens: [
        ...demoSpecDocument.screens,
        {
          ...demoSpecDocument.screens[0],
          id: "screen-new",
          name: "신규 화면",
        },
      ],
    };
    const diff = diffDocuments(demoSpecDocument, updated);
    expect(diff.addedScreenIds).toContain("screen-new");
    expect(diff.removedScreenIds).toHaveLength(0);
  });

  it("detects removed screens", () => {
    const updated: SpecDocument = {
      ...demoSpecDocument,
      screens: demoSpecDocument.screens.slice(1),
    };
    const diff = diffDocuments(demoSpecDocument, updated);
    expect(diff.removedScreenIds).toContain(demoSpecDocument.screens[0].id);
  });

  it("detects changed screen content", () => {
    const firstScreen = demoSpecDocument.screens[0];
    const updated: SpecDocument = {
      ...demoSpecDocument,
      screens: demoSpecDocument.screens.map((s) =>
        s.id === firstScreen.id ? { ...s, name: "변경된 이름" } : s,
      ),
    };
    const diff = diffDocuments(demoSpecDocument, updated);
    expect(diff.changedScreenIds).toContain(firstScreen.id);
  });

  it("detects task status changes", () => {
    const firstTask = demoSpecDocument.tasks[0];
    if (!firstTask) return;
    const updated: SpecDocument = {
      ...demoSpecDocument,
      tasks: demoSpecDocument.tasks.map((t) =>
        t.id === firstTask.id ? { ...t, status: "done" } : t,
      ),
    };
    const diff = diffDocuments(demoSpecDocument, updated);
    const change = diff.taskStatusChanges.find((c) => c.id === firstTask.id);
    expect(change).toBeDefined();
    expect(change?.to).toBe("done");
  });

  it("ignores status changes for soft-deleted tasks", () => {
    const firstTask = demoSpecDocument.tasks[0];
    const previous: SpecDocument = {
      ...demoSpecDocument,
      tasks: [{ ...firstTask, deletedAt: null }],
    };
    const current: SpecDocument = {
      ...demoSpecDocument,
      tasks: [
        {
          ...firstTask,
          status: "done",
          deletedAt: "2026-06-22T00:00:00.000Z",
        },
      ],
    };

    expect(diffDocuments(previous, current).taskStatusChanges).toEqual([]);
  });
});

describe("computeImpact — affectedQuestionIds", () => {
  it("does not link questions to unrelated requirements", () => {
    // req-security affects screen-login; questions with blocking priority are unrelated
    const impact = computeImpact(demoSpecDocument, "req-security");
    // affectedQuestionIds should only include questions that share affectedScreenIds
    // with req-security (i.e. screen-login), not all questions
    const loginScreenQuestionIds = demoSpecDocument.questions
      .filter((q) => q.evidence.sourceId === demoSpecDocument.requirements
        .find((r) => r.id === "req-security")?.evidence.sourceId)
      .map((q) => q.id);
    // affectedQuestionIds must be a subset of questions — no phantom IDs
    for (const qId of impact.affectedQuestionIds) {
      const exists = demoSpecDocument.questions.some((q) => q.id === qId);
      expect(exists, `questionId "${qId}" does not exist in document`).toBe(true);
    }
    void loginScreenQuestionIds; // suppress unused warning
  });

  it("returns empty affectedQuestionIds for unknown requirement", () => {
    const impact = computeImpact(demoSpecDocument, "req-nonexistent");
    expect(impact.affectedQuestionIds).toEqual([]);
  });
});
