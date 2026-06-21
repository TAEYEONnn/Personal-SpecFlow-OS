import { describe, expect, it } from "vitest";
import { recommendFigmaComponents } from "@/lib/figma/recommend";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import type { FigmaLibrary } from "@/lib/figma/types";

const emptyLibrary: FigmaLibrary = {
  fileKey: "test-key",
  fileName: "Test Library",
  components: [],
  variables: [],
  fetchedAt: "2026-06-21T00:00:00Z",
};

const libraryWithButton: FigmaLibrary = {
  ...emptyLibrary,
  components: [
    {
      key: "btn-001",
      name: "Button",
      description: "Primary action button",
      variants: [{ property: "variant", values: ["primary", "secondary"] }],
    },
  ],
};

describe("recommendFigmaComponents (mock mode, no API key)", () => {
  it("returns one result per screen", async () => {
    const screens = demoSpecDocument.screens;
    const results = await recommendFigmaComponents(screens, emptyLibrary);
    expect(results.length).toBe(screens.length);
  });

  it("each result has screenId and screenName", async () => {
    const results = await recommendFigmaComponents(demoSpecDocument.screens, emptyLibrary);
    for (const result of results) {
      expect(typeof result.screenId).toBe("string");
      expect(typeof result.screenName).toBe("string");
    }
  });

  it("each result has at least one recommendation", async () => {
    const results = await recommendFigmaComponents(demoSpecDocument.screens, emptyLibrary);
    for (const result of results) {
      expect(result.recommendations.length).toBeGreaterThanOrEqual(1);
    }
  });

  it("does not throw on empty screens array", async () => {
    await expect(recommendFigmaComponents([], emptyLibrary)).resolves.toEqual([]);
  });

  it("uses existing pattern when library has matching button component", async () => {
    const screenWithCta = demoSpecDocument.screens.find((s) => s.cta.length > 0);
    if (!screenWithCta) return;
    const results = await recommendFigmaComponents([screenWithCta], libraryWithButton);
    const ctaRec = results[0].recommendations.find((r) => r.element.startsWith("CTA"));
    expect(ctaRec?.pattern).toBe("existing");
    expect(ctaRec?.componentKey).toBe("btn-001");
  });

  it("uses new-component pattern when library is empty", async () => {
    const screenWithCta = demoSpecDocument.screens.find((s) => s.cta.length > 0);
    if (!screenWithCta) return;
    const results = await recommendFigmaComponents([screenWithCta], emptyLibrary);
    const ctaRec = results[0].recommendations.find((r) => r.element.startsWith("CTA"));
    expect(ctaRec?.pattern).toBe("new-component");
    expect(ctaRec?.componentKey).toBeNull();
  });
});
