import { describe, expect, it } from "vitest";
import { zodTextFormat } from "openai/helpers/zod";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import { specDocumentSchema } from "@/lib/spec/schema";

describe("SpecDocument schema", () => {
  it("accepts the canonical demo document", () => {
    expect(specDocumentSchema.parse(demoSpecDocument)).toEqual({
      ...demoSpecDocument,
      states: demoSpecDocument.states.map((state) => ({
        ...state,
        position: state.position ?? null,
      })),
      tasks: demoSpecDocument.tasks.map((task) => ({
        ...task,
        deletedAt: null,
      })),
    });
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

  it("emits rationale as a required nullable Structured Outputs field", () => {
    const format = zodTextFormat(specDocumentSchema, "spec_document");
    const schema = format.schema as {
      properties: {
        requirements: {
          items: {
            properties: {
              evidence: {
                properties: { rationale: { anyOf: Array<{ type: string }> } };
                required: string[];
              };
            };
          };
        };
      };
    };
    const evidence =
      schema.properties.requirements.items.properties.evidence;

    expect(evidence.required).toContain("rationale");
    expect(evidence.properties.rationale.anyOf).toEqual(
      expect.arrayContaining([{ type: "string" }, { type: "null" }]),
    );
  });

  it("marks every Structured Outputs object property as required", () => {
    const format = zodTextFormat(specDocumentSchema, "spec_document");
    const missingRequired: string[] = [];

    function visit(node: unknown, path: string) {
      if (!node || typeof node !== "object") return;
      const schema = node as {
        type?: string;
        properties?: Record<string, unknown>;
        required?: string[];
        items?: unknown;
        anyOf?: unknown[];
      };

      if (schema.type === "object" && schema.properties) {
        const required = new Set(schema.required ?? []);
        for (const [key, child] of Object.entries(schema.properties)) {
          if (!required.has(key)) missingRequired.push(`${path}.${key}`);
          visit(child, `${path}.${key}`);
        }
      }
      if (schema.items) visit(schema.items, `${path}[]`);
      schema.anyOf?.forEach((child, index) => visit(child, `${path}.anyOf[${index}]`));
    }

    visit(format.schema, "$");
    expect(missingRequired).toEqual([]);
  });

  it("defaults omitted rationale to null for existing saved documents", () => {
    const parsed = specDocumentSchema.parse(demoSpecDocument);
    expect(parsed.requirements[0].evidence.rationale).toBeNull();
  });

  it("defaults omitted task deletedAt to null for existing saved documents", () => {
    const legacy = structuredClone(demoSpecDocument);
    Reflect.deleteProperty(legacy.tasks[0], "deletedAt");

    const parsed = specDocumentSchema.parse(legacy);

    expect(parsed.tasks[0].deletedAt).toBeNull();
  });

  it("accepts a nullable task deletedAt timestamp", () => {
    const document = structuredClone(demoSpecDocument);
    document.tasks[0] = {
      ...document.tasks[0],
      deletedAt: "2026-06-22T00:00:00.000Z",
    };

    expect(specDocumentSchema.parse(document).tasks[0].deletedAt).toBe(
      "2026-06-22T00:00:00.000Z",
    );
  });
});
