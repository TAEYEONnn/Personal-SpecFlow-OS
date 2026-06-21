"use client";

import { useState } from "react";
import type { SpecDocument } from "@/lib/spec/schema";

const priorityLabel: Record<string, string> = {
  blocking: "차단",
  "should-decide": "결정 필요",
  assumable: "가정 가능",
};

const taskStatusLabel: Record<string, string> = {
  todo: "대기",
  "in-progress": "진행 중",
  done: "완료",
};

const taskPriorityLabel: Record<string, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

export function DocumentView({
  document,
  onToggleResolved,
  onUpdateTaskStatus,
}: {
  document: SpecDocument;
  onToggleResolved?: (id: string) => void;
  onUpdateTaskStatus?: (id: string, status: "todo" | "in-progress" | "done") => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});

  function toggleSection(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  if (!document.brief.title) {
    return (
      <div className="document-view">
        <div className="document-empty">
          <p>정리된 문서가 없어요. 다시 정리하기를 시도해 보세요.</p>
        </div>
      </div>
    );
  }

  const unresolvedCount = document.questions.filter((q) => !q.resolved).length;

  return (
    <div className="document-view">
      <article id="section-brief">
        <h1>{document.brief.title}</h1>
        <p>{document.brief.purpose}</p>

        {document.brief.problem && (
          <>
            <h2>해결할 문제</h2>
            <p>{document.brief.problem}</p>
          </>
        )}

        {document.brief.successCriteria.length > 0 && (
          <>
            <h2>성공 조건</h2>
            <ul>
              {document.brief.successCriteria.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          </>
        )}

        {document.questions.length > 0 && (
          <>
            <h2
              id="section-questions"
              className="section-collapsible"
              onClick={() => toggleSection("questions")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("questions")}
            >
              확인 질문
              <span className="section-meta">
                {unresolvedCount > 0 && (
                  <span className="badge-blocking">{unresolvedCount}개 미해결</span>
                )}
                <span className={`section-chevron${collapsed.questions ? " is-collapsed" : ""}`}>▾</span>
              </span>
            </h2>
            {!collapsed.questions &&
              document.questions.map((item) => (
                <div
                  className={`question-callout${item.resolved ? " question-resolved" : ""}`}
                  key={item.id}
                >
                  <div className="question-header">
                    <span className={`tag tag-priority-${item.priority}`}>
                      {priorityLabel[item.priority]}
                    </span>
                    {onToggleResolved && (
                      <label className="question-resolve-toggle">
                        <input
                          type="checkbox"
                          checked={item.resolved}
                          onChange={() => onToggleResolved(item.id)}
                        />
                        해결됨
                      </label>
                    )}
                  </div>
                  <strong>{item.question}</strong>
                  <p>{item.context}</p>
                </div>
              ))}
          </>
        )}

        {document.requirements.length > 0 && (
          <>
            <h2
              id="section-requirements"
              className="section-collapsible"
              onClick={() => toggleSection("requirements")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("requirements")}
            >
              요구사항
              <span className="section-meta">
                {document.requirements.length}개
                <span className={`section-chevron${collapsed.requirements ? " is-collapsed" : ""}`}>▾</span>
              </span>
            </h2>
            {!collapsed.requirements && (
              <ul>
                {document.requirements.map((item) => (
                  <li key={item.id}>
                    {item.content}{" "}
                    <span
                      className={`tag tag-${item.evidence.type === "original" ? "original" : "inference"}`}
                    >
                      {item.evidence.type === "original" ? "원문" : "추론"}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {document.tasks.length > 0 && (
          <>
            <h2
              id="section-tasks"
              className="section-collapsible"
              onClick={() => toggleSection("tasks")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("tasks")}
            >
              작업 목록
              <span className="section-meta">
                {document.tasks.length}개
                <span className={`section-chevron${collapsed.tasks ? " is-collapsed" : ""}`}>▾</span>
              </span>
            </h2>
            {!collapsed.tasks && (
              <ul className="task-list">
                {document.tasks.map((item) => (
                  <li key={item.id} className={`task-item task-${item.status}`}>
                    <span className="task-title">{item.title}</span>
                    <span className={`task-priority task-priority-${item.priority}`}>
                      {taskPriorityLabel[item.priority]}
                    </span>
                    {onUpdateTaskStatus ? (
                      <select
                        className="task-status-select"
                        value={item.status}
                        onChange={(e) =>
                          onUpdateTaskStatus(
                            item.id,
                            e.target.value as "todo" | "in-progress" | "done",
                          )
                        }
                      >
                        {(["todo", "in-progress", "done"] as const).map((s) => (
                          <option key={s} value={s}>
                            {taskStatusLabel[s]}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <span className={`task-status-badge task-status-${item.status}`}>
                        {taskStatusLabel[item.status]}
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        )}

        {(document.roles.length > 0 || document.permissions.length > 0) && (
          <>
            <h2
              id="section-permissions"
              className="section-collapsible"
              onClick={() => toggleSection("permissions")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("permissions")}
            >
              역할과 권한
              <span className="section-meta">
                {document.permissions.length}개
                <span className={`section-chevron${collapsed.permissions ? " is-collapsed" : ""}`}>▾</span>
              </span>
            </h2>
            {!collapsed.permissions && (
              <div className="doc-table-wrap">
                <table className="doc-table">
                  <thead>
                    <tr><th>역할</th><th>기능</th><th>허용</th><th>메모</th></tr>
                  </thead>
                  <tbody>
                    {document.permissions.map((p) => (
                      <tr key={p.id}>
                        <td>{document.roles.find((r) => r.id === p.roleId)?.name ?? p.roleId}</td>
                        <td>{p.capability}</td>
                        <td>{p.allowed === true ? "✅" : p.allowed === false ? "❌" : "—"}</td>
                        <td className="doc-table-note">{p.note}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </>
        )}

        {document.states.length > 0 && (
          <>
            <h2
              id="section-states"
              className="section-collapsible"
              onClick={() => toggleSection("states")}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === "Enter" && toggleSection("states")}
            >
              상태와 예외
              <span className="section-meta">
                {document.states.length}개
                <span className={`section-chevron${collapsed.states ? " is-collapsed" : ""}`}>▾</span>
              </span>
            </h2>
            {!collapsed.states && (
              <ul className="state-list">
                {document.states.map((s) => {
                  const screen = document.screens.find((sc) => sc.id === s.screenId);
                  return (
                    <li key={s.id} className="state-item">
                      <span className="state-screen-tag">{screen?.name ?? s.screenId}</span>
                      <strong>{s.name}</strong>
                      <span className={`tag tag-state-kind tag-state-${s.kind}`}>{s.kind}</span>
                      {s.description && <p className="state-desc">{s.description}</p>}
                    </li>
                  );
                })}
              </ul>
            )}
          </>
        )}
      </article>
    </div>
  );
}
