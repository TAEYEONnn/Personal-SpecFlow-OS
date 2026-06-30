import { afterEach, describe, expect, it, vi } from "vitest";
import {
  buildCompilerPrompt,
  compileSpecDocument,
  runWithConcurrency,
} from "@/lib/ai/compiler";
import { demoSpecDocument } from "@/lib/spec/demo-document";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
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
  // Test 1: Demo mode ignores NVIDIA key
  it("demo mode does not call API even when NVIDIA key exists", async () => {
    vi.stubEnv("AI_PROVIDER", "nvidia");
    vi.stubEnv("NVIDIA_API_KEY", "test-nvidia-key");

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(compileSpecDocument("원문", { mode: "demo" })).resolves.toEqual(
      demoSpecDocument,
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Test 2: Demo mode ignores OpenAI key
  it("demo mode does not call API even when OpenAI key exists", async () => {
    vi.stubEnv("OPENAI_API_KEY", "stale-key");

    await expect(compileSpecDocument("원문", { mode: "demo" })).resolves.toEqual(
      demoSpecDocument,
    );
  });

  // Backward-compat test kept from original
  it("uses demo output without calling OpenAI even when a stale key exists", async () => {
    vi.stubEnv("OPENAI_API_KEY", "stale-key");

    await expect(compileSpecDocument("원문", { mode: "demo" })).resolves.toEqual(
      demoSpecDocument,
    );
  });

  // Test 3: AI_PROVIDER=nvidia without key fails before request
  it("AI_PROVIDER=nvidia fails before request when NVIDIA key is missing", async () => {
    vi.stubEnv("AI_PROVIDER", "nvidia");
    vi.stubEnv("NVIDIA_API_KEY", "");

    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(compileSpecDocument("원문", { mode: "live" })).rejects.toThrow(
      "NVIDIA_API_KEY",
    );
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  // Test 4: AI_PROVIDER=openai without key fails before request
  it("AI_PROVIDER=openai fails before request when OpenAI key is missing", async () => {
    vi.stubEnv("AI_PROVIDER", "openai");
    vi.stubEnv("OPENAI_API_KEY", "");

    await expect(compileSpecDocument("원문", { mode: "live" })).rejects.toThrow(
      "OPENAI_API_KEY",
    );
  });

  // Original test preserved
  it("requires an API key in explicit live mode (no provider set defaults to openai)", async () => {
    vi.stubEnv("OPENAI_API_KEY", "");

    await expect(compileSpecDocument("원문", { mode: "live" })).rejects.toThrow(
      "OPENAI_API_KEY",
    );
  });
});

describe("runWithConcurrency", () => {
  // Test 20: concurrency helper enforces limit
  it("limits maximum concurrent executions", async () => {
    let active = 0;
    let maxActive = 0;

    const fn = async (item: number) => {
      active++;
      maxActive = Math.max(maxActive, active);
      await new Promise<void>((r) => setTimeout(r, 10));
      active--;
      return item * 2;
    };

    const results = await runWithConcurrency([1, 2, 3, 4], fn, 2);

    expect(results).toEqual([2, 4, 6, 8]);
    expect(maxActive).toBeLessThanOrEqual(2);
  });

  it("runs all items when concurrency exceeds item count", async () => {
    const results = await runWithConcurrency([1, 2], async (x) => x + 1, 10);
    expect(results).toEqual([2, 3]);
  });

  it("runs sequentially when concurrency is 1", async () => {
    const order: number[] = [];
    const fn = async (item: number) => {
      order.push(item);
      await new Promise<void>((r) => setTimeout(r, 5));
      return item;
    };
    await runWithConcurrency([1, 2, 3], fn, 1);
    expect(order).toEqual([1, 2, 3]);
  });
});
