import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { z } from "zod";
import {
  createNvidiaProvider,
  extractJsonFromText,
  buildCombinedPrompt,
  NVIDIA_ENDPOINT,
} from "@/lib/ai/providers/nvidia";
import { aiSpecDocumentSchema } from "@/lib/spec/schema";
import { normalizeToSpecDocument } from "@/lib/ai/provider";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

type AiDoc = z.infer<typeof aiSpecDocumentSchema>;

function makeMinimalAiDoc(overrides: Partial<AiDoc> = {}): AiDoc {
  return {
    brief: {
      title: "테스트",
      purpose: "테스트 목적",
      problem: "테스트 문제",
      successCriteria: [],
      audience: [],
      scope: [],
      outOfScope: [],
      constraints: [],
      userEditedFields: [],
    },
    requirements: [],
    questions: [],
    roles: [],
    permissions: [],
    screens: [],
    states: [],
    uxCopy: [],
    tasks: [],
    dailyReport: {
      date: "2026-06-30",
      summary: "테스트 요약",
      completed: [],
      next: [],
      blockers: [],
    },
    ...overrides,
  };
}

function makeNvidiaResponse(content: string): Response {
  return new Response(
    JSON.stringify({
      choices: [{ message: { content } }],
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}

// ---------------------------------------------------------------------------
// extractJsonFromText
// ---------------------------------------------------------------------------

describe("extractJsonFromText", () => {
  // Test 12: pure JSON
  it("returns pure JSON unchanged", () => {
    const json = JSON.stringify(makeMinimalAiDoc());
    expect(extractJsonFromText(json)).toBe(json);
  });

  // Test 13: JSON with code fences
  it("strips markdown code fences", () => {
    const json = JSON.stringify({ a: 1 });
    expect(extractJsonFromText("```json\n" + json + "\n```")).toBe(json);
    expect(extractJsonFromText("```\n" + json + "\n```")).toBe(json);
  });

  // Test 14: JSON surrounded by prose
  it("extracts JSON object from surrounding text", () => {
    const json = JSON.stringify({ a: 1 });
    const text = "Here is the result:\n" + json + "\nThat's all.";
    const extracted = extractJsonFromText(text);
    expect(extracted).toBe(json);
  });

  it("returns empty string for empty response", () => {
    expect(extractJsonFromText("")).toBe("");
    expect(extractJsonFromText("   ")).toBe("");
  });

  it("returns empty string for non-JSON response", () => {
    expect(extractJsonFromText("이것은 JSON이 아닙니다")).toBe("");
  });
});

// ---------------------------------------------------------------------------
// buildCombinedPrompt
// ---------------------------------------------------------------------------

describe("buildCombinedPrompt", () => {
  // Test 11: source and JSON schema in prompt
  it("includes system prompt, JSON schema instruction, schema JSON, and user prompt", () => {
    const schema = { type: "object" };
    const combined = buildCombinedPrompt("시스템 지시", "사용자 원문", schema);

    expect(combined).toContain("시스템 지시");
    expect(combined).toContain("JSON Schema");
    expect(combined).toContain(JSON.stringify(schema));
    expect(combined).toContain("사용자 원문");
  });
});

// ---------------------------------------------------------------------------
// createNvidiaProvider — request format
// ---------------------------------------------------------------------------

describe("createNvidiaProvider request format", () => {
  beforeEach(() => {
    vi.stubEnv("NVIDIA_API_KEY", "test-nvidia-key");
    vi.stubEnv("NVIDIA_MODEL", "mistralai/mistral-medium-3.5-128b");
    vi.stubEnv("NVIDIA_REASONING_EFFORT", "none");
    vi.stubEnv("NVIDIA_STRUCTURED_MODE", "prompt");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  function setupFetchMock(content: string) {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(makeNvidiaResponse(content)));
  }

  // Test 5: NVIDIA endpoint
  it("sends request to the correct NVIDIA endpoint", async () => {
    const validDoc = makeMinimalAiDoc();
    setupFetchMock(JSON.stringify(validDoc));

    const provider = createNvidiaProvider();
    await provider.generateStructured({ systemPrompt: "sys", userPrompt: "user" });

    const [url] = vi.mocked(fetch).mock.calls[0] as [string, ...unknown[]];
    expect(url).toBe(NVIDIA_ENDPOINT);
  });

  // Test 6: Authorization header
  it("sets Authorization header with NVIDIA API key", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "my-secret-key");
    const validDoc = makeMinimalAiDoc();
    setupFetchMock(JSON.stringify(validDoc));

    const provider = createNvidiaProvider();
    await provider.generateStructured({ systemPrompt: "sys", userPrompt: "user" });

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const headers = options.headers as Record<string, string>;
    expect(headers["Authorization"]).toBe("Bearer my-secret-key");
  });

  // Test 7: model name in request body
  it("includes model name in request body", async () => {
    vi.stubEnv("NVIDIA_MODEL", "mistralai/mistral-medium-3.5-128b");
    const validDoc = makeMinimalAiDoc();
    setupFetchMock(JSON.stringify(validDoc));

    const provider = createNvidiaProvider();
    await provider.generateStructured({ systemPrompt: "sys", userPrompt: "user" });

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.model).toBe("mistralai/mistral-medium-3.5-128b");
  });

  // Test 8: reasoning_effort is "none" or "high" only
  it("reasoning_effort is 'none' when NVIDIA_REASONING_EFFORT is not 'high'", async () => {
    vi.stubEnv("NVIDIA_REASONING_EFFORT", "medium");
    const validDoc = makeMinimalAiDoc();
    setupFetchMock(JSON.stringify(validDoc));

    const provider = createNvidiaProvider();
    await provider.generateStructured({ systemPrompt: "sys", userPrompt: "user" });

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.reasoning_effort).toBe("none");
  });

  it("reasoning_effort is 'high' when NVIDIA_REASONING_EFFORT=high", async () => {
    vi.stubEnv("NVIDIA_REASONING_EFFORT", "high");
    const validDoc = makeMinimalAiDoc();
    setupFetchMock(JSON.stringify(validDoc));

    const provider = createNvidiaProvider();
    await provider.generateStructured({ systemPrompt: "sys", userPrompt: "user" });

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.reasoning_effort).toBe("high");
  });

  // Test 9: stream: false
  it("sends stream: false in request body", async () => {
    const validDoc = makeMinimalAiDoc();
    setupFetchMock(JSON.stringify(validDoc));

    const provider = createNvidiaProvider();
    await provider.generateStructured({ systemPrompt: "sys", userPrompt: "user" });

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.stream).toBe(false);
  });

  // Test 10: single user message
  it("combines prompts into a single user role message", async () => {
    const validDoc = makeMinimalAiDoc();
    setupFetchMock(JSON.stringify(validDoc));

    const provider = createNvidiaProvider();
    await provider.generateStructured({ systemPrompt: "시스템", userPrompt: "사용자" });

    const [, options] = vi.mocked(fetch).mock.calls[0] as [string, RequestInit];
    const body = JSON.parse(options.body as string);
    expect(body.messages).toHaveLength(1);
    expect(body.messages[0].role).toBe("user");
    expect(body.messages[0].content).toContain("시스템");
    expect(body.messages[0].content).toContain("사용자");
  });
});

// ---------------------------------------------------------------------------
// createNvidiaProvider — response parsing
// ---------------------------------------------------------------------------

describe("createNvidiaProvider response parsing", () => {
  beforeEach(() => {
    vi.stubEnv("NVIDIA_API_KEY", "test-key");
    vi.stubEnv("NVIDIA_STRUCTURED_MODE", "prompt");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  // Test 15: Zod validation failure triggers repair exactly once
  it("calls API exactly twice when first response fails Zod validation", async () => {
    const invalidDoc = { brief: { title: "only title" } }; // missing required fields
    const validDoc = makeMinimalAiDoc();

    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(makeNvidiaResponse(JSON.stringify(invalidDoc)))
      .mockResolvedValueOnce(makeNvidiaResponse(JSON.stringify(validDoc)));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createNvidiaProvider();
    await provider.generateStructured({ systemPrompt: "sys", userPrompt: "user" });

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // Test 16: repair failure does not trigger more calls
  it("throws after repair failure without additional API calls", async () => {
    const invalidDoc = { brief: { title: "only" } };

    const fetchMock = vi
      .fn()
      .mockResolvedValue(makeNvidiaResponse(JSON.stringify(invalidDoc)));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createNvidiaProvider();
    await expect(
      provider.generateStructured({ systemPrompt: "sys", userPrompt: "user" }),
    ).rejects.toThrow();

    expect(fetchMock).toHaveBeenCalledTimes(2);
  });

  // Test 18: arbitrary fields not trusted
  it("ignores fields not in aiSpecDocumentSchema", async () => {
    const docWithExtra = { ...makeMinimalAiDoc(), hackerField: "injected" };
    const fetchMock = vi
      .fn()
      .mockResolvedValue(makeNvidiaResponse(JSON.stringify(docWithExtra)));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createNvidiaProvider();
    const result = await provider.generateStructured({ systemPrompt: "sys", userPrompt: "user" });

    expect(result).not.toHaveProperty("hackerField");
  });
});

// ---------------------------------------------------------------------------
// normalizeToSpecDocument (Test 17)
// ---------------------------------------------------------------------------

describe("normalizeToSpecDocument", () => {
  // Test 17: runtime defaults added
  it("adds suppressedTaskKeys and figmaMapping to AI output", () => {
    const aiDoc = makeMinimalAiDoc();
    const doc = normalizeToSpecDocument(aiDoc);

    expect(doc.suppressedTaskKeys).toEqual([]);
    expect(doc.figmaMapping).toMatchObject({
      fileUrl: "",
      fileKey: null,
      libraryName: null,
      recommendations: [],
      analyzedAt: null,
      status: "idle",
      error: null,
    });
  });
});

// ---------------------------------------------------------------------------
// Test 3: config missing error (Test 3 in requirements)
// ---------------------------------------------------------------------------

describe("createNvidiaProvider config validation", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("throws config_missing when NVIDIA_API_KEY is not set", () => {
    vi.stubEnv("NVIDIA_API_KEY", "");
    expect(() => createNvidiaProvider()).toThrow("NVIDIA_API_KEY");
  });
});

// ---------------------------------------------------------------------------
// Test 21: sensitive data not in error messages
// ---------------------------------------------------------------------------

describe("NVIDIA provider error handling", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it("does not expose API key in error messages", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "super-secret-key-12345");

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response(null, { status: 401 })),
    );

    const provider = createNvidiaProvider();
    let errorMessage = "";
    try {
      await provider.generateStructured({ systemPrompt: "sys", userPrompt: "user" });
    } catch (err) {
      errorMessage = err instanceof Error ? err.message : String(err);
    }

    expect(errorMessage).not.toContain("super-secret-key-12345");
  });

  it("throws guided-json config error on 400/422 without auto-retry", async () => {
    vi.stubEnv("NVIDIA_API_KEY", "key");
    vi.stubEnv("NVIDIA_STRUCTURED_MODE", "guided-json");

    const fetchMock = vi
      .fn()
      .mockResolvedValue(new Response(null, { status: 400 }));
    vi.stubGlobal("fetch", fetchMock);

    const provider = createNvidiaProvider();
    await expect(
      provider.generateStructured({ systemPrompt: "sys", userPrompt: "user" }),
    ).rejects.toThrow("guided-json");

    // Only one attempt, no auto-retry
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });
});
