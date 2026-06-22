import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCompilerPrompt,
  compileSpecDocument,
} from "@/lib/ai/compiler";
import { demoSpecDocument } from "@/lib/spec/demo-document";

afterEach(() => {
  vi.unstubAllEnvs();
});

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

  it("requires concise Korean UX writing", () => {
    const prompt = buildCompilerPrompt("한국어 회의록");

    expect(prompt).toContain("짧고 명확");
    expect(prompt).toContain("한 문장");
    expect(prompt).toContain("중복");
  });
});

describe("compileSpecDocument mode", () => {
  it("uses demo output without calling OpenAI even when a stale key exists", async () => {
    vi.stubEnv("OPENAI_API_KEY", "stale-key");

    await expect(
      compileSpecDocument("원문", { mode: "demo" }),
    ).resolves.toEqual(demoSpecDocument);
  });

  it("requires an API key in explicit live mode", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    await expect(
      compileSpecDocument("원문", { mode: "live" }),
    ).rejects.toThrow("OPENAI_API_KEY");
  });
});
