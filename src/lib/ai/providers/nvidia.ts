import type { z } from "zod";
import { aiSpecDocumentSchema } from "@/lib/spec/schema";
import {
  type AiProvider,
  type AiSpecDocumentResult,
  type GenerateStructuredInput,
  AiProviderError,
  getAiJsonSchema,
} from "@/lib/ai/provider";

export const NVIDIA_ENDPOINT = "https://integrate.api.nvidia.com/v1/chat/completions";

type NvidiaRequestBody = {
  model: string;
  messages: Array<{ role: string; content: string }>;
  temperature: number;
  max_tokens: number;
  reasoning_effort: "none" | "high";
  stream: false;
  guided_json?: Record<string, unknown>;
};

type NvidiaResponseData = {
  choices?: Array<{ message?: { content?: string } }>;
};

export function buildCombinedPrompt(
  systemPrompt: string,
  userPrompt: string,
  jsonSchema: Record<string, unknown>,
): string {
  return [
    systemPrompt,
    "",
    "아래 JSON Schema와 정확히 일치하는 JSON 객체 하나만 반환하세요.",
    "마크다운 코드 블록, 설명, 머리말, 맺음말을 출력하지 마세요.",
    "",
    JSON.stringify(jsonSchema),
    "",
    userPrompt,
  ].join("\n");
}

export function extractJsonFromText(text: string): string {
  const trimmed = text.trim();

  // Remove markdown code fences
  const withoutFences = trimmed
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/\s*```\s*$/, "")
    .trim();

  // Try to find JSON object bounds
  const start = withoutFences.indexOf("{");
  if (start === -1) return "";

  const end = withoutFences.lastIndexOf("}");
  if (end === -1 || end <= start) return "";

  return withoutFences.slice(start, end + 1);
}

async function callNvidiaApi(
  requestBody: NvidiaRequestBody,
  apiKey: string,
  timeoutMs: number,
): Promise<string> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(NVIDIA_ENDPOINT, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify(requestBody),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err instanceof Error && err.name === "AbortError") {
      throw new AiProviderError("nvidia", "timeout", "NVIDIA API 요청이 시간 초과되었습니다.");
    }
    throw new AiProviderError("nvidia", "request_failed", "NVIDIA API 네트워크 요청에 실패했습니다.");
  } finally {
    clearTimeout(timer);
  }

  if (!response.ok) {
    const status = response.status;
    if ((status === 400 || status === 422) && requestBody.guided_json) {
      throw new AiProviderError(
        "nvidia",
        "request_failed",
        "guided-json 모드가 거부되었습니다. NVIDIA_STRUCTURED_MODE=prompt로 변경하세요.",
        status,
      );
    }
    throw new AiProviderError(
      "nvidia",
      "request_failed",
      `NVIDIA API 오류 (HTTP ${status})`,
      status,
    );
  }

  let data: NvidiaResponseData;
  try {
    data = (await response.json()) as NvidiaResponseData;
  } catch {
    throw new AiProviderError(
      "nvidia",
      "invalid_response",
      "NVIDIA API 응답을 파싱할 수 없습니다.",
    );
  }

  const content = data?.choices?.[0]?.message?.content;
  if (!content) {
    throw new AiProviderError(
      "nvidia",
      "invalid_response",
      "NVIDIA API 응답에 내용이 없습니다.",
    );
  }

  return content;
}

async function attemptRepair(
  originalJson: string,
  issues: z.ZodIssue[],
  jsonSchema: Record<string, unknown>,
  model: string,
  apiKey: string,
  reasoningEffort: "none" | "high",
  timeoutMs: number,
): Promise<AiSpecDocumentResult> {
  const issuesSummary =
    issues.length > 0
      ? issues.map((i) => `- path: ${i.path.join(".")}, message: ${i.message}`).join("\n")
      : "JSON 파싱 실패";

  const repairPrompt = [
    "아래 JSON에 다음 구조 오류가 있습니다.",
    "내용을 새로 분석하지 말고 JSON 구조만 수정하세요.",
    "마크다운 코드 블록 없이 순수 JSON만 반환하세요.",
    "",
    "오류 목록:",
    issuesSummary,
    "",
    "JSON Schema:",
    JSON.stringify(jsonSchema),
    "",
    "수정이 필요한 JSON:",
    originalJson,
  ].join("\n");

  const repairBody: NvidiaRequestBody = {
    model,
    messages: [{ role: "user", content: repairPrompt }],
    temperature: 0.1,
    max_tokens: 32768,
    reasoning_effort: reasoningEffort,
    stream: false,
  };

  let repairContent: string;
  try {
    repairContent = await callNvidiaApi(repairBody, apiKey, timeoutMs);
  } catch (err) {
    throw new AiProviderError(
      "nvidia",
      "structured_output_failed",
      `Repair 요청도 실패했습니다: ${err instanceof Error ? err.message : "알 수 없는 오류"}`,
    );
  }

  const repairJsonString = extractJsonFromText(repairContent);
  if (!repairJsonString) {
    throw new AiProviderError(
      "nvidia",
      "structured_output_failed",
      "Repair 응답에서 JSON 객체를 찾을 수 없습니다.",
    );
  }

  let repairParsed: unknown;
  try {
    repairParsed = JSON.parse(repairJsonString);
  } catch {
    throw new AiProviderError(
      "nvidia",
      "structured_output_failed",
      "Repair 응답이 유효한 JSON이 아닙니다.",
    );
  }

  const repairResult = aiSpecDocumentSchema.safeParse(repairParsed);
  if (!repairResult.success) {
    throw new AiProviderError(
      "nvidia",
      "structured_output_failed",
      `Repair 후에도 스키마 검증에 실패했습니다. 오류 수: ${repairResult.error.issues.length}`,
    );
  }

  return repairResult.data;
}

async function parseAndValidate(
  content: string,
  jsonSchema: Record<string, unknown>,
  model: string,
  apiKey: string,
  reasoningEffort: "none" | "high",
  timeoutMs: number,
): Promise<AiSpecDocumentResult> {
  const jsonString = extractJsonFromText(content);
  if (!jsonString) {
    throw new AiProviderError(
      "nvidia",
      "structured_output_failed",
      "응답에서 JSON 객체를 찾을 수 없습니다.",
    );
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(jsonString);
  } catch {
    return attemptRepair(content, [], jsonSchema, model, apiKey, reasoningEffort, timeoutMs);
  }

  const result = aiSpecDocumentSchema.safeParse(parsed);
  if (result.success) {
    return result.data;
  }

  return attemptRepair(
    jsonString,
    result.error.issues,
    jsonSchema,
    model,
    apiKey,
    reasoningEffort,
    timeoutMs,
  );
}

export function createNvidiaProvider(): AiProvider {
  const apiKey = process.env.NVIDIA_API_KEY?.trim();
  if (!apiKey) {
    throw new AiProviderError(
      "nvidia",
      "config_missing",
      "NVIDIA_API_KEY 환경변수가 필요합니다.",
    );
  }

  const model = process.env.NVIDIA_MODEL ?? "mistralai/mistral-medium-3.5-128b";
  const reasoningEffort: "none" | "high" =
    process.env.NVIDIA_REASONING_EFFORT === "high" ? "high" : "none";
  const structuredMode = process.env.NVIDIA_STRUCTURED_MODE ?? "prompt";

  return {
    async generateStructured(input: GenerateStructuredInput): Promise<AiSpecDocumentResult> {
      const timeoutMs = input.timeoutMs ?? parseInt(process.env.AI_TIMEOUT_MS ?? "90000", 10);
      const temperature = input.temperature ?? 0.1;
      const maxTokens = input.maxTokens ?? 32768;

      const jsonSchema = getAiJsonSchema();
      const combinedPrompt = buildCombinedPrompt(input.systemPrompt, input.userPrompt, jsonSchema);

      const requestBody: NvidiaRequestBody = {
        model,
        messages: [{ role: "user", content: combinedPrompt }],
        temperature,
        max_tokens: maxTokens,
        reasoning_effort: reasoningEffort,
        stream: false,
      };

      if (structuredMode === "guided-json") {
        // NOTE: guided_json is experimental. Officially unconfirmed for NVIDIA Hosted API.
        // If API returns 400/422, switch NVIDIA_STRUCTURED_MODE=prompt.
        requestBody.guided_json = jsonSchema;
      }

      const content = await callNvidiaApi(requestBody, apiKey, timeoutMs);
      return parseAndValidate(content, jsonSchema, model, apiKey, reasoningEffort, timeoutMs);
    },
  };
}
