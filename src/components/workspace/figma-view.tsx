"use client";

import { useState } from "react";
import type { ComponentRecommendation, FigmaLibrary, RecommendationPattern } from "@/lib/figma/types";
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
};

export function FigmaView({ projectId, document }: Props) {
  const [fileKey, setFileKey] = useState("");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState<ComponentRecommendation[] | null>(null);
  const [libraryName, setLibraryName] = useState("");

  async function analyze() {
    if (!fileKey.trim()) return;
    setPending(true);
    setError("");
    setResults(null);

    const response = await fetch(`/api/projects/${projectId}/figma`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileKey: fileKey.trim(),
        components: [],
        variables: [],
      }),
    });

    const data = await response.json();
    if (response.ok) {
      setResults(data.recommendations);
      setLibraryName(data.libraryName);
    } else {
      setError(data.error ?? "분석에 실패했습니다.");
    }
    setPending(false);
  }

  const summary = results
    ? {
        existing: results.flatMap((r) => r.recommendations).filter((r) => r.pattern === "existing").length,
        extend: results.flatMap((r) => r.recommendations).filter((r) => r.pattern === "extend-variant").length,
        newComp: results.flatMap((r) => r.recommendations).filter((r) => r.pattern === "new-component").length,
        screenOnly: results.flatMap((r) => r.recommendations).filter((r) => r.pattern === "screen-only").length,
      }
    : null;

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
            placeholder="Figma 파일 키 (URL에서 /file/ 다음 부분)"
            value={fileKey}
            onChange={(e) => setFileKey(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && analyze()}
          />
          <button
            className="button button-primary"
            disabled={pending || !fileKey.trim()}
            onClick={analyze}
          >
            {pending ? "분석 중…" : "컴포넌트 분석"}
          </button>
        </div>
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
                      <tr key={i}>
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
