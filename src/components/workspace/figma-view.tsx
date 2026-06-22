"use client";

import { useMemo, useState } from "react";
import type { RecommendationPattern } from "@/lib/figma/types";
import type { SpecDocument } from "@/lib/spec/schema";

const patternLabel: Record<RecommendationPattern, string> = {
  existing: "기존 사용",
  "extend-variant": "Variant 확장",
  "new-component": "신규 제작",
  "screen-only": "화면 전용",
};

const patternClass: Record<RecommendationPattern, string> = {
  existing: "figma-badge--existing",
  "extend-variant": "figma-badge--extend",
  "new-component": "figma-badge--new",
  "screen-only": "figma-badge--screen",
};

type Props = {
  projectId: string;
  document: SpecDocument;
  mapping: SpecDocument["figmaMapping"];
  onMappingChange: (mapping: SpecDocument["figmaMapping"]) => Promise<void> | void;
};

function extractFigmaFileKey(value: string) {
  const trimmed = value.trim();
  const match = trimmed.match(/figma\.com\/(?:file|design)\/([^/?#]+)/);
  return match?.[1] ?? trimmed;
}

export function FigmaView({ projectId, document, mapping, onMappingChange }: Props) {
  const [fileUrl, setFileUrl] = useState(mapping.fileUrl || mapping.fileKey || "");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [saveStatus, setSaveStatus] = useState<"idle" | "pending" | "success" | "error">("idle");

  async function analyze() {
    const nextFileUrl = fileUrl.trim();
    const fileKey = extractFigmaFileKey(nextFileUrl);
    if (!fileKey) return;
    setPending(true);
    setError("");
    setSaveStatus("pending");
    const previousCompletedRecommendations = mapping.recommendations;
    const analyzingMapping: SpecDocument["figmaMapping"] = {
      ...mapping,
      fileUrl: nextFileUrl,
      fileKey,
      status: "analyzing",
      error: null,
    };
    await onMappingChange(analyzingMapping);

    try {
      const response = await fetch(`/api/projects/${projectId}/figma`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          fileKey,
          components: [],
          variables: [],
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "분석에 실패했습니다.");
      await onMappingChange({
        fileUrl: nextFileUrl,
        fileKey,
        libraryName: data.libraryName ?? null,
        recommendations: data.recommendations,
        analyzedAt: new Date().toISOString(),
        status: "completed",
        error: null,
      });
      setSaveStatus("success");
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : "분석에 실패했습니다.";
      setError(message);
      await onMappingChange({
        ...mapping,
        fileUrl: nextFileUrl,
        fileKey,
        recommendations: previousCompletedRecommendations,
        status: "failed",
        error: message,
      });
      setSaveStatus("error");
    } finally {
      setPending(false);
    }
  }

  const results = mapping.recommendations.length ? mapping.recommendations : null;
  const summary = useMemo(() =>
    results
    ? {
      existing: results.flatMap((r) => r.recommendations).filter((r) => r.pattern === "existing").length,
      extend: results.flatMap((r) => r.recommendations).filter((r) => r.pattern === "extend-variant").length,
      newComp: results.flatMap((r) => r.recommendations).filter((r) => r.pattern === "new-component").length,
      screenOnly: results.flatMap((r) => r.recommendations).filter((r) => r.pattern === "screen-only").length,
    }
    : null,
  [results]);

  const urlChanged = Boolean(mapping.fileUrl) && fileUrl.trim() !== mapping.fileUrl;

  return (
    <div className="figma-view">
      <div className="figma-header">
        <h2 className="figma-title">Figma 디자인 시스템 매핑</h2>
        <p className="figma-desc">
          Figma 라이브러리 파일 키를 입력하면 각 화면 요소와 기존 컴포넌트의 연결을 분석합니다.
          Figma 파일을 자동으로 수정하지 않고, 추천과 근거만 생성합니다.
        </p>
        <div className="figma-input-row">
          <input
            className="field"
            placeholder="Figma 파일 URL 또는 파일 키"
            value={fileUrl}
            onChange={(e) => setFileUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
          />
          <button
            className="button button-primary"
            disabled={pending || !fileUrl.trim()}
            onClick={analyze}
          >
            {pending ? (
              <>
                <span className="btn-spinner" aria-hidden="true" />
                분석 중…
              </>
            ) : mapping.status === "completed" ? "다시 분석" : "컴포넌트 분석"}
          </button>
        </div>

        {pending && (
          <div className="figma-analyzing-banner" role="status" aria-live="polite">
            <span className="compile-spinner" aria-hidden="true" />
            <span>Figma 컴포넌트를 분석하고 있어요. 잠시만 기다려 주세요.</span>
          </div>
        )}

        <p className="figma-save-status" aria-live="polite">
          {!pending && (
            mapping.status === "analyzing"
              ? "Figma URL을 저장하고 분석하고 있어요."
              : saveStatus === "success"
                ? "분석 결과를 저장했어요."
                : saveStatus === "error"
                  ? "새 분석은 실패했지만 기존 결과는 유지했어요."
                  : mapping.analyzedAt
                    ? `마지막 분석: ${mapping.analyzedAt.slice(0, 10)}`
                    : ""
          )}
          {!pending && urlChanged ? " URL이 바뀌었어요. 다시 분석하면 새 결과로 교체돼요." : ""}
        </p>
        {error && <p className="form-error">{error}</p>}
      </div>

      {summary && (
        <div className="figma-summary">
          <div className="figma-stat">
            <span className="figma-stat-num">{summary.existing}</span>
            <span className="figma-stat-label">기존 사용</span>
          </div>
          <div className="figma-stat">
            <span className="figma-stat-num">{summary.extend}</span>
            <span className="figma-stat-label">Variant 확장</span>
          </div>
          <div className="figma-stat">
            <span className="figma-stat-num">{summary.newComp}</span>
            <span className="figma-stat-label">신규 제작</span>
          </div>
          <div className="figma-stat">
            <span className="figma-stat-num">{summary.screenOnly}</span>
            <span className="figma-stat-label">화면 전용</span>
          </div>
        </div>
      )}

      {results && (
        <div className="figma-results">
          {results.map((screenResult) => (
            <div key={screenResult.screenId} className="figma-screen-section">
              <h3 className="figma-screen-name">{screenResult.screenName}</h3>
              {screenResult.recommendations.length === 0 ? (
                <p className="figma-empty">추천 결과 없음</p>
              ) : (
                <div className="figma-table-wrap">
                <table className="figma-table">
                  <thead>
                    <tr>
                      <th>요소</th>
                      <th>분류</th>
                      <th>컴포넌트</th>
                      <th>근거</th>
                    </tr>
                  </thead>
                  <tbody>
                    {screenResult.recommendations.map((rec, i) => (
                      <tr key={`${screenResult.screenId}-${rec.element}-${rec.pattern}-${i}`}>
                        <td>{rec.element}</td>
                        <td>
                          <span className={`figma-badge ${patternClass[rec.pattern]}`}>
                            {patternLabel[rec.pattern]}
                          </span>
                        </td>
                        <td>{rec.componentName ?? "—"}</td>
                        <td>
                          {rec.rationale}
                          {rec.missingStates?.length ? (
                            <span className="figma-missing">
                              {" "}부족한 상태: {rec.missingStates.join(", ")}
                            </span>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {!results && !pending && (
        <div className="figma-placeholder">
          <p>{document.screens.length}개 화면 · {document.brief.title}</p>
          <p>파일 키를 입력하면 컴포넌트 연결 분석이 시작됩니다.</p>
        </div>
      )}
    </div>
  );
}
