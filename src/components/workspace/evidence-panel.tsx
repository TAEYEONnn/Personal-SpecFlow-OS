import { useState } from "react";
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
}: {
  evidence: Evidence;
  onStatusChange: (status: Evidence["reviewStatus"]) => void;
  onNavigateDiff?: () => void;
}) {
  const [activeTab, setActiveTab] = useState<"evidence" | "history">("evidence");

  return (
    <aside className="evidence-panel">
      <div className="evidence-tabs">
        <button
          className={`evidence-tab ${activeTab === "evidence" ? "active" : ""}`}
          onClick={() => setActiveTab("evidence")}
        >
          근거
        </button>
        <button
          className={`evidence-tab ${activeTab === "history" ? "active" : ""}`}
          onClick={() => setActiveTab("history")}
        >
          변경 이력
        </button>
      </div>
      {activeTab === "history" ? (
        <div className="evidence-content">
          <div className="evidence-section">
            <div className="evidence-box" style={{ textAlign: "center", padding: "20px 16px" }}>
              <p style={{ color: "var(--muted)", fontSize: "13px", marginBottom: "10px" }}>
                이 화면의 변경 이력을 확인하려면 변경 내역 탭을 이용하세요.
              </p>
              {onNavigateDiff && (
                <button className="button" onClick={onNavigateDiff} style={{ fontSize: "12px" }}>
                  변경 내역 보기
                </button>
              )}
            </div>
          </div>
        </div>
      ) : (
      <div className="evidence-content">
        <section className="evidence-section">
          <h3>
            원문 발췌
            <span className={`tag tag-${evidence.type === "original" ? "original" : "inference"}`}>
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
              <span className="tag tag-inference">추론</span>
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
      </div>
      )}
    </aside>
  );
}
