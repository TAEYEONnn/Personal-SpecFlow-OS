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
      </article>
    </div>
  );
}
