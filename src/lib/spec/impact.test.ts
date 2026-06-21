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
});
