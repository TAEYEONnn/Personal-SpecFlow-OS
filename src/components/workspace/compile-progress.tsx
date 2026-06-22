"use client";

import { useEffect, useState } from "react";

type CompileStep =
  | "idle"
  | "preparing"
  | "reading-sources"
  | "analyzing"
  | "merging"
  | "saving"
  | "completed"
  | "failed";

const STEPS: CompileStep[] = [
  "preparing",
  "reading-sources",
  "analyzing",
  "merging",
  "saving",
];

const STEP_LABEL: Record<CompileStep, string> = {
  idle: "",
  preparing: "원문을 준비하고 있어요",
  "reading-sources": "원문 내용을 확인하고 있어요",
  analyzing: "요구사항과 화면을 분석하고 있어요",
  merging: "기존 수정 내용과 병합하고 있어요",
  saving: "결과를 저장하고 있어요",
  completed: "정리가 완료됐어요",
  failed: "정리하지 못했어요",
};

export function CompileProgress({
  step,
  startedAt,
}: {
  step: CompileStep;
  startedAt: number | null;
}) {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!startedAt) return;
    const interval = setInterval(() => {
      setElapsed(Math.floor((Date.now() - startedAt) / 1000));
    }, 1000);
    return () => {
      clearInterval(interval);
      setElapsed(0);
    };
  }, [startedAt]);

  const isActive = step !== "idle" && step !== "completed" && step !== "failed";
  if (!isActive) return null;

  const currentIndex = STEPS.indexOf(step);
  const progress = currentIndex >= 0
    ? Math.round(((currentIndex + 1) / STEPS.length) * 100)
    : 10;

  return (
    <div className="compile-progress" role="status" aria-live="polite" aria-label="정리 진행 중">
      <div className="compile-progress-header">
        <span className="compile-spinner" aria-hidden="true" />
        <span className="compile-progress-label">{STEP_LABEL[step]}</span>
        {elapsed > 0 && (
          <span className="compile-progress-elapsed">{elapsed}초</span>
        )}
      </div>
      <div className="compile-progress-track" role="progressbar" aria-valuenow={progress} aria-valuemin={0} aria-valuemax={100}>
        <div className="compile-progress-fill" style={{ width: `${progress}%` }} />
      </div>
      <ol className="compile-steps" aria-hidden="true">
        {STEPS.map((s, i) => (
          <li
            key={s}
            className={
              i < currentIndex
                ? "compile-step compile-step--done"
                : i === currentIndex
                  ? "compile-step compile-step--active"
                  : "compile-step"
            }
          >
            {STEP_LABEL[s]}
          </li>
        ))}
      </ol>
      {elapsed >= 10 && (
        <p className="compile-progress-slow">좀 걸리고 있어요. 조금만 기다려줘요.</p>
      )}
    </div>
  );
}
