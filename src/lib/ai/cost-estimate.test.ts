import { describe, expect, it } from "vitest";
import {
  estimateTokens,
  splitIntoChunks,
  estimateCompilationCost,
  formatCostEstimate,
} from "@/lib/ai/cost-estimate";

describe("estimateTokens", () => {
  it("estimates tokens as chars/4", () => {
    expect(estimateTokens("hello")).toBe(2); // ceil(5/4)
    expect(estimateTokens("a".repeat(400))).toBe(100);
  });

  it("returns 0 for empty string", () => {
    expect(estimateTokens("")).toBe(0);
  });
});

describe("splitIntoChunks", () => {
  it("returns single chunk for short text", () => {
    const chunks = splitIntoChunks("짧은 텍스트");
    expect(chunks).toHaveLength(1);
    expect(chunks[0]).toBe("짧은 텍스트");
  });

  it("splits long text into multiple chunks", () => {
    const longText = "a".repeat(90_000);
    const chunks = splitIntoChunks(longText);
    expect(chunks.length).toBeGreaterThanOrEqual(2);
    const totalLength = chunks.reduce((sum, c) => sum + c.length, 0);
    expect(totalLength).toBeGreaterThan(0);
  });

  it("all chunks are non-empty", () => {
    const longText = "paragraph\n\n".repeat(1000);
    const chunks = splitIntoChunks(longText);
    chunks.forEach((chunk) => expect(chunk.length).toBeGreaterThan(0));
  });
});

describe("estimateCompilationCost", () => {
  it("returns cost estimate with all required fields", () => {
    const estimate = estimateCompilationCost("테스트 원문", "gpt-5.4");
    expect(estimate.inputTokens).toBeGreaterThan(0);
    expect(estimate.estimatedOutputTokens).toBeGreaterThan(0);
    expect(estimate.estimatedCostUsd).toBeGreaterThanOrEqual(0);
    expect(estimate.chunkCount).toBe(1);
    expect(estimate.model).toBe("gpt-5.4");
  });

  it("marks high cost estimate as warning", () => {
    const longText = "a".repeat(200_000);
    const estimate = estimateCompilationCost(longText, "gpt-4.5");
    expect(estimate.warningThreshold).toBe(true);
  });

  it("does not warn for small cheap requests", () => {
    const estimate = estimateCompilationCost("짧은 텍스트", "gpt-4o-mini");
    expect(estimate.warningThreshold).toBe(false);
  });

  it("multi-chunk text produces multiple chunks", () => {
    const longText = "a".repeat(200_000);
    const estimate = estimateCompilationCost(longText);
    expect(estimate.chunkCount).toBeGreaterThanOrEqual(2);
  });
});

describe("formatCostEstimate", () => {
  it("formats small cost as < $0.01", () => {
    const estimate = estimateCompilationCost("short", "gpt-4o-mini");
    const formatted = formatCostEstimate(estimate);
    expect(formatted).toContain("< $0.01");
  });

  it("includes chunk count for multi-chunk", () => {
    const longText = "a".repeat(200_000);
    const estimate = estimateCompilationCost(longText);
    if (estimate.chunkCount > 1) {
      expect(formatCostEstimate(estimate)).toContain("청크");
    }
  });
});
