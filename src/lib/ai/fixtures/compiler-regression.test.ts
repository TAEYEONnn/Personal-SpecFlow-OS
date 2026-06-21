import { describe, expect, it } from "vitest";
import { buildCompilerPrompt, COMPILER_PROMPT_VERSION } from "@/lib/ai/compiler";
import { specDocumentSchema } from "@/lib/spec/schema";
import { demoSpecDocument } from "@/lib/spec/demo-document";
import { sampleSources } from "./sample-sources";

describe("컴파일러 프롬프트 회귀 테스트", () => {
  it("프롬프트 버전이 고정됩니다 — 변경 시 의도적으로 갱신해야 합니다", () => {
    expect(COMPILER_PROMPT_VERSION).toBe("2026-06-21.v2");
  });

  it("10개 샘플 원문이 모두 프롬프트에 포함됩니다", () => {
    for (const sample of sampleSources) {
      const prompt = buildCompilerPrompt(sample.text);
      expect(prompt, `${sample.name}: 원문이 프롬프트에 포함되지 않았습니다`).toContain(
        sample.text,
      );
    }
  });

  it("모든 샘플 프롬프트가 evidence 유형 3가지를 요구합니다", () => {
    for (const sample of sampleSources) {
      const prompt = buildCompilerPrompt(sample.text);
      expect(prompt, `${sample.name}: original 누락`).toContain("original");
      expect(prompt, `${sample.name}: inference 누락`).toContain("inference");
      expect(prompt, `${sample.name}: assumption 누락`).toContain("assumption");
    }
  });

  it("모든 샘플 프롬프트가 확인 질문 우선순위 3가지를 요구합니다", () => {
    for (const sample of sampleSources) {
      const prompt = buildCompilerPrompt(sample.text);
      expect(prompt, `${sample.name}: blocking 누락`).toContain("blocking");
      expect(prompt, `${sample.name}: should-decide 누락`).toContain("should-decide");
      expect(prompt, `${sample.name}: assumable 누락`).toContain("assumable");
    }
  });

  it("모든 샘플 프롬프트가 필수 산출물 10가지를 모두 요구합니다", () => {
    const required = [
      "brief",
      "requirements",
      "questions",
      "roles",
      "permissions",
      "screens",
      "states",
      "uxCopy",
      "tasks",
      "dailyReport",
    ];
    for (const sample of sampleSources) {
      const prompt = buildCompilerPrompt(sample.text);
      for (const field of required) {
        expect(prompt, `${sample.name}: ${field} 누락`).toContain(field);
      }
    }
  });

  it("프롬프트 크기가 8000자 미만입니다 (최소 원문 입력 기준)", () => {
    const prompt = buildCompilerPrompt("test");
    expect(prompt.length).toBeLessThan(8000);
  });

  it("프롬프트가 화면 position 지침을 포함합니다", () => {
    const prompt = buildCompilerPrompt("테스트");
    expect(prompt).toContain("position");
    expect(prompt).toContain("1440");
  });
});

describe("데모 문서 품질 기준 회귀 테스트", () => {
  it("데모 문서가 스키마를 통과합니다", () => {
    expect(() => specDocumentSchema.parse(demoSpecDocument)).not.toThrow();
  });

  it("데모 문서에 화면이 최소 1개 있습니다", () => {
    expect(demoSpecDocument.screens.length).toBeGreaterThanOrEqual(1);
  });

  it("데모 문서에 확인 질문이 최소 1개 있습니다", () => {
    expect(demoSpecDocument.questions.length).toBeGreaterThanOrEqual(1);
  });

  it("모든 화면에 nextScreenIds 배열이 있습니다", () => {
    for (const screen of demoSpecDocument.screens) {
      expect(Array.isArray(screen.nextScreenIds), `${screen.name}: nextScreenIds 없음`).toBe(true);
    }
  });

  it("모든 상태에 유효한 screenId 참조가 있습니다", () => {
    const screenIds = new Set(demoSpecDocument.screens.map((s) => s.id));
    for (const state of demoSpecDocument.states) {
      expect(
        screenIds.has(state.screenId),
        `상태 "${state.name}"의 screenId "${state.screenId}"가 없음`,
      ).toBe(true);
    }
  });

  it("evidence.type이 original/inference/assumption 중 하나입니다", () => {
    const valid = ["original", "inference", "assumption"];
    for (const screen of demoSpecDocument.screens) {
      expect(valid, `화면 "${screen.name}": 잘못된 evidence.type`).toContain(
        screen.evidence.type,
      );
    }
    for (const req of demoSpecDocument.requirements) {
      expect(valid, `요구사항 "${req.content}": 잘못된 evidence.type`).toContain(
        req.evidence.type,
      );
    }
  });

  it("original evidence 비율이 전체 요구사항의 30% 이상입니다", () => {
    const reqs = demoSpecDocument.requirements;
    if (reqs.length === 0) return;
    const originalCount = reqs.filter((r) => r.evidence.type === "original").length;
    const ratio = originalCount / reqs.length;
    expect(ratio, `원문 근거 비율 ${(ratio * 100).toFixed(0)}% — 30% 이상이어야 합니다`).toBeGreaterThanOrEqual(0.3);
  });

  it("blocking 질문이 최소 1개 있습니다", () => {
    const blocking = demoSpecDocument.questions.filter((q) => q.priority === "blocking");
    expect(blocking.length).toBeGreaterThanOrEqual(1);
  });

  it("데모 문서에 역할(roles)이 최소 1개 있습니다", () => {
    expect(demoSpecDocument.roles.length).toBeGreaterThanOrEqual(1);
  });

  it("데모 문서에 권한(permissions)이 최소 1개 있습니다", () => {
    expect(demoSpecDocument.permissions.length).toBeGreaterThanOrEqual(1);
  });

  it("tasks 배열에 작업 목록이 있습니다", () => {
    expect(demoSpecDocument.tasks.length).toBeGreaterThanOrEqual(1);
  });

  it("dailyReport에 date, summary, completed, next, blockers가 있습니다", () => {
    const report = demoSpecDocument.dailyReport;
    expect(report.date).toBeTruthy();
    expect(report.summary).toBeTruthy();
    expect(Array.isArray(report.completed)).toBe(true);
    expect(Array.isArray(report.next)).toBe(true);
    expect(Array.isArray(report.blockers)).toBe(true);
  });
});
