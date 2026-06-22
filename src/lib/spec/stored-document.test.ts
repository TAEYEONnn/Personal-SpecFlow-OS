import { describe, expect, it } from "vitest";

import { demoSpecDocument } from "@/lib/spec/demo-document";

import { parseStoredSpecDocument } from "./stored-document";

describe("parseStoredSpecDocument", () => {
  it("normalizes fields omitted by an older saved document", () => {
    const legacy = structuredClone(demoSpecDocument);
    Reflect.deleteProperty(legacy.states[0], "position");
    Reflect.deleteProperty(legacy.tasks[0], "status");
    Reflect.deleteProperty(legacy.tasks[0], "source");
    Reflect.deleteProperty(legacy.tasks[0], "description");
    Reflect.deleteProperty(legacy.tasks[0], "dueDate");
    Reflect.deleteProperty(legacy.tasks[0], "blockerReason");
    Reflect.deleteProperty(legacy.tasks[0], "relatedScreenIds");
    Reflect.deleteProperty(legacy.tasks[0], "relatedRequirementIds");
    Reflect.deleteProperty(legacy.tasks[0], "deletedAt");

    const parsed = parseStoredSpecDocument(legacy, "project-1");

    expect(parsed.states[0].position).toBeNull();
    expect(parsed.tasks[0]).toMatchObject({
      status: "todo",
      source: "ai",
      description: "",
      dueDate: null,
      blockerReason: null,
      relatedScreenIds: [],
      relatedRequirementIds: [],
      deletedAt: null,
    });
  });

  it("throws an actionable server error instead of passing malformed JSON", () => {
    expect(() =>
      parseStoredSpecDocument({ screens: null }, "project-broken"),
    ).toThrow(/project-broken.*brief/);
  });
});
