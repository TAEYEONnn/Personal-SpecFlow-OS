import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import { splitIntoChunks } from "@/lib/ai/cost-estimate";
import { specDocumentSchema, type SpecDocument } from "@/lib/spec/schema";

export const COMPILER_PROMPT_VERSION = "2026-06-21.v2";
export type CompilerMode = "demo" | "live";
export type CompileSpecDocumentOptions = {
  mode?: CompilerMode;
};

export function buildCompilerPrompt(source: string) {
  return `당신은 프로덕트 디자인 업무 컴파일러입니다.
입력된 업무 원문을 실행 가능한 제품·UX 디자인 명세로 변환하세요.

## 기본 원칙

- 원문에 명시된 사실과 AI의 추론을 엄격하게 구분합니다.
- 원문에 없는 내용을 확정된 사실처럼 생성하지 않습니다.
- 불확실한 내용은 확인 질문이나 가정으로 표시합니다.
- 모든 필드를 제공된 스키마에 맞게 반환합니다.
- 배열에 해당 항목이 없으면 필드를 생략하지 말고 빈 배열 []을 반환합니다.
- nullable 필드에 정보가 없으면 빈 문자열이 아니라 null을 반환합니다.
- 서로 참조하는 ID는 실제로 존재하는 항목의 ID와 일치해야 합니다.

## Evidence 생성 규칙

모든 requirements, questions, roles, permissions, screens, states,
uxCopy, tasks 항목에는 evidence를 반드시 생성합니다.

evidence.type은 다음 기준으로 지정합니다.

- original:
  원문에 직접 명시된 사실입니다.

- inference:
  원문을 근거로 합리적으로 추론한 내용이지만,
  원문에 직접 명시되지는 않은 내용입니다.

- assumption:
  작업 진행을 위해 임시로 설정한 가정입니다.
  원문만으로 확인할 수 없는 내용입니다.

evidence.reviewStatus는 다음 기준으로 지정합니다.

- conflict:
  원문 안의 정보가 서로 충돌하거나 양립할 수 없을 때 사용합니다.

- needs-review:
  conflict가 아닌 모든 최초 생성 항목에 사용합니다.

- confirmed:
  AI가 최초 생성할 때 사용하지 않습니다.
  confirmed는 사용자가 직접 검토하고 승인한 뒤 설정하는 상태입니다.

evidence.sourceId는 현재 입력 원문의 출처를 나타내도록
항상 "source-1"로 지정합니다.

evidence.sourceExcerpt에는 판단의 근거가 된 원문 문장을
가능한 한 원문 그대로 짧게 인용합니다.

- 원문 표현을 임의로 바꾸지 않습니다.
- 원문에 없는 문장을 인용문처럼 만들지 않습니다.
- inference나 assumption도 가장 관련 있는 원문 부분을 연결합니다.

evidence.rationale은 다음 기준으로 생성합니다.

- original이고 원문만으로 의미가 명확하면 null을 반환합니다.
- inference이면 어떤 원문에서 어떻게 추론했는지 설명합니다.
- assumption이면 왜 해당 가정이 필요한지 설명합니다.
- conflict이면 어떤 정보가 서로 충돌하는지 설명합니다.

## 확인 질문 규칙

확인 질문의 priority는 다음 기준으로 지정합니다.

- blocking:
  답을 알기 전에는 핵심 설계를 진행할 수 없습니다.

- should-decide:
  작업은 진행할 수 있지만, 지금 결정해야 재작업을 줄일 수 있습니다.

- assumable:
  임시 가정으로 작업을 진행한 뒤 나중에 확인할 수 있습니다.

질문을 불필요하게 많이 만들지 않습니다.
디자인이나 개발 결과에 실질적인 영향을 주는 질문만 생성합니다.

## 화면 및 연결 규칙

- 모든 화면에는 고유한 id를 생성합니다.
- nextScreenIds에는 실제 screens 항목에 존재하는 id만 사용합니다.
- state의 screenId에는 실제 screens 항목에 존재하는 id만 사용합니다.
- uxCopy의 screenId에도 실제 screens 항목의 id만 사용합니다.
- permission의 roleId에는 실제 roles 항목의 id만 사용합니다.
- requirement의 affectedScreenIds에는 실제 screens 항목의 id만 사용합니다.
- 관련 항목이 없으면 참조 ID를 임의로 만들지 말고 빈 배열을 반환합니다.

## 화면 위치 규칙

- 화면 position은 1440px 데스크톱 플로우 보드를 기준으로 지정합니다.
- 화면끼리 겹치지 않도록 배치합니다.
- 주요 사용자 흐름은 왼쪽에서 오른쪽으로 배치합니다.
- 분기 화면은 관련 부모 화면 아래쪽에 배치합니다.

## UX Writing 규칙

- 사용자의 입력 언어를 유지합니다.
- 한국어 입력에는 자연스러운 해요체를 사용합니다.
- 버튼 문구는 사용자의 행동을 표현합니다.
- 오류 문구에는 문제뿐 아니라 다음 행동을 안내합니다.
- 기술 용어보다 사용자가 이해할 수 있는 표현을 우선합니다.
- 한국어 문구는 짧고 명확하게 작성하고, 가능한 한 한 문장으로 끝냅니다.
- 같은 의미의 수식어와 안내를 중복하지 않습니다.

## 반드시 생성할 최상위 항목

다음 항목을 모두 생성합니다.

- brief
- requirements
- questions
- roles
- permissions
- screens
- states
- uxCopy
- tasks
- dailyReport

## 원문

${source}`;
}

export async function compileSpecDocument(
  source: string,
  options: CompileSpecDocumentOptions = {},
): Promise<SpecDocument> {
  const mode =
    options.mode ??
    (process.env.OPENAI_API_KEY || process.env.NODE_ENV === "production"
      ? "live"
      : "demo");

  if (mode === "demo") {
    return structuredClone(demoSpecDocument);
  }

  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new Error("OPENAI_API_KEY 환경변수가 필요합니다.");
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
        content: [
          "당신은 정확성과 추적 가능성을 최우선으로 하는 프로덕트 디자인 업무 컴파일러입니다.",
          "제공된 spec_document 스키마를 엄격히 따르고 모든 필드를 반환하세요.",
          "원문에 없는 사실을 확정하지 마세요.",
          "AI가 최초 생성한 항목을 confirmed로 표시하지 마세요.",
          "정보가 없는 nullable 필드는 null, 항목이 없는 배열은 []로 반환하세요.",
        ].join(" "),
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

function dedupeById(arr: { id: string }[]): { id: string }[] {
  const seen = new Set<string>();
  return arr.filter((item) => (seen.has(item.id) ? false : seen.add(item.id) && true));
}

function mergeSpecDocuments(docs: SpecDocument[]): SpecDocument {
  const base = docs[0];
  const rest = docs.slice(1);
  const concat = (key: keyof SpecDocument) =>
    dedupeById(
      rest.reduce(
        (acc, d) => acc.concat(d[key] as { id: string }[]),
        base[key] as { id: string }[]
      )
    );
  return {
    brief: base.brief,
    requirements: concat("requirements") as SpecDocument["requirements"],
    questions: concat("questions") as SpecDocument["questions"],
    roles: concat("roles") as SpecDocument["roles"],
    permissions: concat("permissions") as SpecDocument["permissions"],
    screens: concat("screens") as SpecDocument["screens"],
    states: concat("states") as SpecDocument["states"],
    uxCopy: concat("uxCopy") as SpecDocument["uxCopy"],
    tasks: concat("tasks") as SpecDocument["tasks"],
    suppressedTaskKeys: base.suppressedTaskKeys ?? [],
    dailyReport: base.dailyReport,
    figmaMapping: base.figmaMapping,
  };
}
