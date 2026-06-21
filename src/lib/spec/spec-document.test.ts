import { describe, expect, it } from "vitest";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import { specDocumentSchema } from "@/lib/spec/schema";

describe("SpecDocument schema", () => {
  it("accepts the canonical demo document", () => {
    expect(specDocumentSchema.parse(demoSpecDocument)).toEqual(demoSpecDocument);
  });

  it("requires evidence on generated requirements", () => {
    const invalid = structuredClone(demoSpecDocument);
    Reflect.deleteProperty(invalid.requirements[0], "evidence");

    expect(specDocumentSchema.safeParse(invalid).success).toBe(false);
  });

  it("allows only the three clarification priorities", () => {
    const invalid = structuredClone(demoSpecDocument);
    invalid.questions[0].priority = "later" as never;

    expect(specDocumentSchema.safeParse(invalid).success).toBe(false);
  });
});
