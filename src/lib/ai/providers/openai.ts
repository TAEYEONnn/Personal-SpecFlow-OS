import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { aiSpecDocumentSchema } from "@/lib/spec/schema";
import {
  type AiProvider,
  type AiSpecDocumentResult,
  type GenerateStructuredInput,
  AiProviderError,
} from "@/lib/ai/provider";

export function createOpenAIProvider(): AiProvider {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    throw new AiProviderError(
      "openai",
      "config_missing",
      "OPENAI_API_KEY 환경변수가 필요합니다.",
    );
  }

  return {
    async generateStructured(input: GenerateStructuredInput): Promise<AiSpecDocumentResult> {
      const client = new OpenAI({ apiKey });
      const model = process.env.OPENAI_MODEL ?? "gpt-5.4";

      let response;
      try {
        response = await client.responses.parse({
          model,
          input: [
            { role: "system", content: input.systemPrompt },
            { role: "user", content: input.userPrompt },
          ],
          text: {
            format: zodTextFormat(aiSpecDocumentSchema, "spec_document"),
          },
        });
      } catch (err) {
        throw new AiProviderError(
          "openai",
          "request_failed",
          err instanceof Error ? err.message : "OpenAI 요청에 실패했습니다.",
        );
      }

      if (!response.output_parsed) {
        throw new AiProviderError(
          "openai",
          "invalid_response",
          "AI가 구조화된 명세를 반환하지 않았습니다.",
        );
      }

      return aiSpecDocumentSchema.parse(response.output_parsed);
    },
  };
}
