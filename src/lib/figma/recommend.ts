import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod";
import { z } from "zod";
import type { FigmaLibrary, ComponentRecommendation, ScreenRecommendation } from "@/lib/figma/types";
import type { Screen } from "@/lib/spec/schema";

const screenRecommendationSchema = z.object({
  recommendations: z.array(
    z.object({
      element: z.string(),
      pattern: z.enum(["existing", "extend-variant", "new-component", "screen-only"]),
      componentKey: z.string().nullable(),
      componentName: z.string().nullable(),
      rationale: z.string(),
      missingStates: z.array(z.string()),
    }),
  ),
});

function buildFigmaPrompt(screen: Screen, library: FigmaLibrary): string {
  const componentSummary = library.components
    .map((c) => {
      const variantStr = c.variants?.length
        ? ` [Variants: ${c.variants.map((v) => `${v.property}=${v.values.join("|")}`).join(", ")}]`
        : "";
      return `- ${c.name} (key: ${c.key})${variantStr}: ${c.description || "설명 없음"}`;
    })
    .join("\n");

  return `당신은 Figma 디자인 시스템 분석가입니다.
아래 화면 명세와 Figma 라이브러리 컴포넌트 목록을 비교하여, 각 화면 요소에 가장 적합한 컴포넌트 연결을 추천하세요.

## 분류 기준
- existing: 기존 컴포넌트를 그대로 사용 가능
- extend-variant: 기존 컴포넌트에 새 Variant/State 추가 필요
- new-component: 유사 컴포넌트가 없어 신규 제작 필요
- screen-only: 라이브러리화 불필요한 화면 전용 레이아웃

## 화면 명세
이름: ${screen.name}
설명: ${screen.description}
주요 행동: ${screen.primaryActions.join(", ")}
진입 조건: ${screen.entryConditions.join(", ")}
CTA: ${screen.cta}
QA 기준: ${screen.qaCriteria.join(", ")}

## Figma 라이브러리 컴포넌트 (${library.components.length}개)
${componentSummary || "컴포넌트 없음"}

각 화면 요소 (버튼, 입력창, 카드, 네비게이션 등)에 대해 분류와 근거를 JSON으로 반환하세요.

missingStates가 없으면 빈 배열 []을 반환하세요.`;
}

export async function recommendFigmaComponents(
  screens: Screen[],
  library: FigmaLibrary,
): Promise<ComponentRecommendation[]> {
  if (screens.length === 0) {
    return [];
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const useMock =
    process.env.NODE_ENV === "test" ||
    !apiKey;

  if (useMock) {
    return screens.map((screen) => ({
      screenId: screen.id,
      screenName: screen.name,
      recommendations: mockRecommendations(screen, library),
    }));
  }

  const client = new OpenAI({
    apiKey,
  });

  const results = await Promise.all(
    screens.map(async (screen): Promise<ComponentRecommendation> => {
      const response = await client.responses.parse({
        model: process.env.OPENAI_MODEL ?? "gpt-5.4",
        input: [
          {
            role: "system",
            content: "JSON 스키마를 엄격히 따르세요. componentKey/componentName은 라이브러리에 실제로 존재하는 값만 사용하고, 없으면 null.",
          },
          { role: "user", content: buildFigmaPrompt(screen, library) },
        ],
        text: {
          format: zodTextFormat(screenRecommendationSchema, "screen_recommendations"),
        },
      });

      const parsed = response.output_parsed ?? { recommendations: [] };
      return {
        screenId: screen.id,
        screenName: screen.name,
        recommendations: parsed.recommendations as ScreenRecommendation[],
      };
    }),
  );

  return results;
}

function mockRecommendations(screen: Screen, library: FigmaLibrary): ScreenRecommendation[] {
  const recs: ScreenRecommendation[] = [];

  if (screen.cta) {
    const btn = library.components.find((c) => /button|btn/i.test(c.name));
    recs.push({
      element: `CTA: ${screen.cta}`,
      pattern: btn ? "existing" : "new-component",
      componentKey: btn?.key ?? null,
      componentName: btn?.name ?? null,
      rationale: btn
        ? `기존 ${btn.name} 컴포넌트를 CTA로 사용 가능합니다.`
        : "버튼 컴포넌트가 없어 신규 제작이 필요합니다.",
      missingStates: [],
    });
  }

  recs.push({
    element: "화면 레이아웃",
    pattern: "screen-only",
    componentKey: null,
    componentName: null,
    rationale: "화면 전체 레이아웃은 라이브러리화 불필요한 페이지 구조입니다.",
    missingStates: [],
  });

  return recs;
}
