import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import { splitIntoChunks } from "@/lib/ai/cost-estimate";
import { specDocumentSchema, type SpecDocument } from "@/lib/spec/schema";

export const COMPILER_PROMPT_VERSION = "2026-06-21.v1";

export function buildCompilerPrompt(source: string) {
  return `당신은 프로덕트 디자인 업무 컴파일러입니다.
입력된 원문을 실행 가능한 디자인 명세로 변환하세요.

필수 규칙:
- 모든 생성 항목의 evidence.type을 original, inference, assumption 중 하나로 지정합니다.
- AI가 추론한 내용을 original로 표시하지 않습니다.
- 확인 질문은 blocking, should-decide, assumable 중 하나로 등급화합니다.
- 근거가 충돌하면 reviewStatus를 conflict로 지정합니다.
- brief, requirements, questions, roles, permissions, screens, states, uxCopy, tasks, dailyReport를 모두 생성합니다.
- 화면 position은 1440px 데스크톱 플로우 보드에서 겹치지 않는 좌표로 지정합니다.
- 사용자의 입력 언어를 유지하고, 한국어 입력에는 자연스러운 해요체 UX 문구를 사용합니다.

원문:
${source}`;
}

export async function compileSpecDocument(source: string): Promise<SpecDocument> {
  if (!process.env.OPENAI_API_KEY) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("OPENAI_API_KEY 환경변수가 필요합니다.");
    }
    return structuredClone(demoSpecDocument);
  }

  const chunks = splitIntoChunks(source);
  if (chunks.length === 1) {
    return compileSingleChunk(chunks[0]);
  }

  // Multi-chunk: compile each chunk, then merge results
  const docs = await Promise.all(chunks.map((chunk) => compileSingleChunk(chunk)));
  return mergeSpecDocuments(docs);
}

async function compileSingleChunk(source: string): Promise<SpecDocument> {
  const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  const response = await client.responses.parse({
    model: process.env.OPENAI_MODEL ?? "gpt-5.4",
    input: [
      {
        role: "system",
        content:
          "정확성과 추적 가능성을 우선하며, 제공된 JSON 스키마를 엄격히 따르세요.",
      },
      { role: "user", content: buildCompilerPrompt(source) },
    ],
    text: {
      format: zodTextFormat(specDocumentSchema, "spec_document"),
    },
  });

  if (!response.output_parsed) {
    throw new Error("AI가 구조화된 명세를 반환하지 않았습니다.");
  }
  return specDocumentSchema.parse(response.output_parsed);
}

function mergeSpecDocuments(docs: SpecDocument[]): SpecDocument {
  const base = docs[0];
  const rest = docs.slice(1);
  return {
    brief: base.brief,
    requirements: rest.reduce((acc, d) => acc.concat(d.requirements), base.requirements),
    questions: rest.reduce((acc, d) => acc.concat(d.questions), base.questions),
    roles: rest.reduce((acc, d) => acc.concat(d.roles), base.roles),
    permissions: rest.reduce((acc, d) => acc.concat(d.permissions), base.permissions),
    screens: rest.reduce((acc, d) => acc.concat(d.screens), base.screens),
    states: rest.reduce((acc, d) => acc.concat(d.states), base.states),
    uxCopy: rest.reduce((acc, d) => acc.concat(d.uxCopy), base.uxCopy),
    tasks: rest.reduce((acc, d) => acc.concat(d.tasks), base.tasks),
    dailyReport: base.dailyReport,
  };
}
