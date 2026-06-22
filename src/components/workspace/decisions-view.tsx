"use client";

import type { SpecDocument } from "@/lib/spec/schema";

export function DecisionsView({ document }: { document: SpecDocument }) {
  const confirmed = document.requirements.filter(
    (r) => r.evidence.reviewStatus === "confirmed",
  );
  const resolved = document.questions.filter((q) => q.resolved);

  if (confirmed.length === 0 && resolved.length === 0) {
    return (
      <div className="document-view">
        <article>
          <h1>결정 기록</h1>
          <p className="document-empty-note">
            아직 확정된 결정이 없어요. 요구사항이나 질문에서 검토 상태를 업데이트하면 여기에 표시돼요.
          </p>
        </article>
      </div>
    );
  }

  return (
    <div className="document-view">
      <article>
        <h1>결정 기록</h1>

        {confirmed.length > 0 && (
          <>
            <h2>확정된 요구사항 <span className="section-meta">{confirmed.length}개</span></h2>
            <ul className="decision-list">
              {confirmed.map((r) => (
                <li key={r.id} className="decision-item">
                  <span>{r.content}</span>
                  <span className="decision-category">{r.category}</span>
                </li>
              ))}
            </ul>
          </>
        )}

        {resolved.length > 0 && (
          <>
            <h2>해결된 질문 <span className="section-meta">{resolved.length}개</span></h2>
            <ul className="decision-list">
              {resolved.map((q) => (
                <li key={q.id} className="decision-item decision-item--question">
                  <strong className="decision-question">{q.question}</strong>
                  {q.answer ? (
                    <div className="decision-answer">
                      <span className="decision-answer-label">답변</span>
                      <p className="decision-answer-text">{q.answer}</p>
                      {(q.answeredBy || q.answeredAt) && (
                        <small className="decision-answer-meta">
                          {[q.answeredBy, q.answeredAt?.slice(0, 10)]
                            .filter(Boolean)
                            .join(" · ")}
                        </small>
                      )}
                    </div>
                  ) : (
                    q.context && <p className="decision-context">{q.context}</p>
                  )}
                </li>
              ))}
            </ul>
          </>
        )}
      </article>
    </div>
  );
}
