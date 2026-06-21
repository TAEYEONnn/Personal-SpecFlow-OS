import { describe, expect, it } from "vitest";
import { buildCompilerPrompt } from "@/lib/ai/compiler";

describe("buildCompilerPrompt", () => {
  it("requires evidence separation and every MVP deliverable", () => {
    const prompt = buildCompilerPrompt("회의록 본문");

    expect(prompt).toContain("original");
    expect(prompt).toContain("inference");
    expect(prompt).toContain("assumption");
    expect(prompt).toContain("blocking");
    expect(prompt).toContain("screens");
    expect(prompt).toContain("states");
    expect(prompt).toContain("dailyReport");
    expect(prompt).toContain("회의록 본문");
  });
});
