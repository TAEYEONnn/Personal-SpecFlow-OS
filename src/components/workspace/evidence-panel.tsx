"use client";

import { CaretRight } from "@phosphor-icons/react";
import { useHydratedMediaQuery } from "@/lib/browser-state";
import type { Evidence } from "@/lib/spec/schema";

const labels = {
  original: "원문",
  inference: "추론",
  assumption: "가정",
};

export function EvidencePanel({
  evidence,
  onStatusChange,
  onNavigateDiff,
  collapsed,
  onToggleCollapse,
}: {
  evidence: Evidence;
  onStatusChange: (status: Evidence["reviewStatus"]) => void;
  onNavigateDiff?: () => void;
  collapsed?: boolean;
  onToggleCollapse?: () => void;
}) {
  const isMobileOverlay = useHydratedMediaQuery("(max-width: 1023px)");
  if (collapsed) {
    return (
      <aside className="evidence-panel evidence-panel--collapsed">
        <button
          className="evidence-collapse-btn"
          onClick={onToggleCollapse}
          aria-label="근거 패널 펼치기"
          title="근거 패널 펼치기"
        >
          <CaretRight size={16} />
        </button>
      </aside>
    );
  }

  return (
    <>
      {isMobileOverlay && (
        <div
          className="evidence-overlay-backdrop"
          onClick={onToggleCollapse}
          aria-hidden="true"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.4)",
            zIndex: 49,
          }}
        />
      )}
      <aside
        className={`evidence-panel${isMobileOverlay ? " evidence-panel--mobile-overlay" : ""}`}
        style={
          isMobileOverlay
            ? {
              position: "fixed",
              top: 0,
              right: 0,
              bottom: 0,
              width: "min(360px, 90vw)",
              zIndex: 50,
              overflowY: "auto",
            }
            : undefined
        }
      >
        <div className="evidence-panel-header">
          <span className="evidence-panel-title">근거</span>
          {onToggleCollapse && (
            <button
              className="evidence-collapse-btn evidence-collapse-btn--inline"
              onClick={onToggleCollapse}
              aria-label="근거 패널 접기"
              title="근거 패널 접기"
            >
              <CaretRight size={14} style={{ transform: "rotate(180deg)" }} />
            </button>
          )}
        </div>
        <div className="evidence-content">
          <section className="evidence-section">
            <h3>
              원문 발췌
              <span
                className={`tag tag-${evidence.type === "original" ? "original" : "inference"}`}
                title={
                  evidence.type === "original"
                    ? "AI가 원문에서 직접 인용한 내용"
                    : evidence.type === "inference"
                      ? "AI가 문맥을 통해 추론한 내용"
                      : "AI가 가정을 통해 도출한 내용"
                }
              >
                {labels[evidence.type]}
              </span>
            </h3>
            <div className="evidence-box">
              {evidence.sourceExcerpt}
              <div className="source-meta">출처 ID · {evidence.sourceId}</div>
            </div>
          </section>
          {evidence.rationale ? (
            <section className="evidence-section">
              <h3>
                추론 근거
                <span className="tag tag-inference" title="AI가 문맥을 통해 추론한 내용">
                  추론
                </span>
              </h3>
              <div className="evidence-box">{evidence.rationale}</div>
            </section>
          ) : null}
          <section className="evidence-section">
            <h3>
              검토 상태
              {evidence.reviewStatus === "needs-review" ? (
                <span className="tag tag-review">확인 필요</span>
              ) : null}
            </h3>
            <div className="review-options">
              {[
                ["confirmed", "확인됨"],
                ["needs-review", "확인 필요"],
                ["conflict", "충돌"],
              ].map(([value, label]) => (
                <label key={value}>
                  <input
                    type="radio"
                    name="review-status"
                    value={value}
                    checked={evidence.reviewStatus === value}
                    onChange={() => onStatusChange(value as Evidence["reviewStatus"])}
                  />
                  {label}
                </label>
              ))}
            </div>
          </section>
          <section className="evidence-section">
            <h3>출처 정보</h3>
            <div className="evidence-box">
              <div>출처 ID · {evidence.sourceId}</div>
              <div>형식 · 업무 원문</div>
            </div>
          </section>
          {onNavigateDiff && (
            <div className="evidence-diff-link">
              <button className="button" onClick={onNavigateDiff}>
                변경 내역 보기 →
              </button>
            </div>
          )}
        </div>
      </aside>
    </>
  );
}
