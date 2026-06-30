import { z } from "zod";
import { aiSpecDocumentSchema, specDocumentSchema, type SpecDocument } from "@/lib/spec/schema";

export type AiProviderName = "nvidia" | "openai";

export type GenerateStructuredInput = {
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
};

export type AiSpecDocumentResult = z.infer<typeof aiSpecDocumentSchema>;

export interface AiProvider {
  generateStructured(input: GenerateStructuredInput): Promise<AiSpecDocumentResult>;
}

export class AiProviderError extends Error {
  provider: AiProviderName;
  status?: number;
  code:
    | "config_missing"
    | "request_failed"
    | "timeout"
    | "invalid_response"
    | "structured_output_failed";

  constructor(
    provider: AiProviderName,
    code: AiProviderError["code"],
    message: string,
    status?: number,
  ) {
    super(message);
    this.name = "AiProviderError";
    this.provider = provider;
    this.code = code;
    this.status = status;
  }
}

const DEFAULT_FIGMA_MAPPING = {
  fileUrl: "",
  fileKey: null,
  libraryName: null,
  recommendations: [],
  analyzedAt: null,
  status: "idle" as const,
  error: null,
};

export function normalizeToSpecDocument(aiResult: AiSpecDocumentResult): SpecDocument {
  const candidate = {
    ...aiResult,
    suppressedTaskKeys: [],
    figmaMapping: DEFAULT_FIGMA_MAPPING,
  };
  return specDocumentSchema.parse(candidate);
}

export function getAiJsonSchema(): Record<string, unknown> {
  return z.toJSONSchema(aiSpecDocumentSchema) as Record<string, unknown>;
}
