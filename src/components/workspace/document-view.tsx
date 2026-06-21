"use client";

import { useState } from "react";
import { PencilSimple, Plus, Trash } from "@phosphor-icons/react";
import type { Evidence, SpecDocument, Task } from "@/lib/spec/schema";

const questionPriorityLabel: Record<string, string> = {
  blocking: "차단",
  "should-decide": "결정 필요",
  assumable: "가정 가능",
};

const taskStatusLabel: Record<string, string> = {
  inbox: "수신함",
  todo: "대기",
  "in-progress": "진행 중",
  blocked: "차단됨",
  done: "완료",
};

const taskPriorityLabel: Record<string, string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const ALL_STATUSES = ["inbox", "todo", "in-progress", "blocked", "done"] as const;

function placeholderEvidence(title: string): Evidence {
  return {
    type: "assumption",
    reviewStatus: "needs-review",
    sourceId: "user-input",
    sourceExcerpt: title.slice(0, 80) || "사용자 입력",
    rationale: null,
  };
}

function TaskRow({
  task,
  onUpdate,
  onDelete,
}: {
  task: Task;
  onUpdate?: (id: string, patch: Partial<Task>) => void;
  onDelete?: (id: string) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const [editingTitle, setEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState(task.title);

  function commitTitle() {
    setEditingTitle(false);
    const t = titleDraft.trim();
    if (t && t !== task.title) onUpdate?.(task.id, { title: t });
    else setTitleDraft(task.title);
  }

  return (
    <li className={`task-item task-${task.status} task-source-${task.source ?? "ai"}`}>
      <div className="task-row-main">
        {editingTitle ? (
          <input
            className="field task-title-input"
            value={titleDraft}
            autoFocus
            onChange={(e) => setTitleDraft(e.target.value)}
            onBlur={commitTitle}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitTitle();
              if (e.key === "Escape") { setEditingTitle(false); setTitleDraft(task.title); }
            }}
          />
        ) : (
          <span
            className="task-title"
            onClick={() => setEditingTitle(true)}
            title="클릭하여 제목 편집"
          >
            {task.title}
          </span>
        )}
        <div className="task-badges">
          {task.source === "user" && (
            <span className="task-source-badge">사용자</span>
          )}
          <span className={`task-priority task-priority-${task.priority}`}>
            {taskPriorityLabel[task.priority]}
          </span>
        </div>
        <div className="task-actions">
          {onUpdate && (
            <select
              className="task-status-select"
              value={task.status}
              onChange={(e) => onUpdate(task.id, { status: e.target.value as Task["status"] })}
            >
              {ALL_STATUSES.map((s) => (
                <option key={s} value={s}>{taskStatusLabel[s]}</option>
              ))}
            </select>
          )}
          {onUpdate && (
            <button
              className="button button--sm"
              onClick={() => setExpanded((v) => !v)}
              title={expanded ? "접기" : "세부 정보"}
            >
              <PencilSimple size={13} />
            </button>
          )}
          {onDelete && (
            <button
              className="task-delete-btn"
              aria-label="작업 삭제"
              onClick={() => {
                if (window.confirm(`"${task.title}" 작업을 삭제할까요?`)) onDelete(task.id);
              }}
            >
              <Trash size={14} />
            </button>
          )}
        </div>
      </div>
      {expanded && onUpdate && (
        <div className="task-detail-form">
          <label className="task-detail-label">
            설명
            <textarea
              className="field task-detail-textarea"
              placeholder="작업 설명 (선택)"
              defaultValue={task.description ?? ""}
              onBlur={(e) => onUpdate(task.id, { description: e.target.value })}
            />
          </label>
          <label className="task-detail-label">
            마감일
            <input
              type="date"
              className="field"
              defaultValue={task.dueDate ?? ""}
              onBlur={(e) => onUpdate(task.id, { dueDate: e.target.value || null })}
            />
          </label>
          {task.status === "blocked" && (
            <label className="task-detail-label">
              차단 사유
              <input
                className="field"
                placeholder="무엇이 이 작업을 막고 있나요?"
                defaultValue={task.blockerReason ?? ""}
                onBlur={(e) => onUpdate(task.id, { blockerReason: e.target.value || null })}
              />
            </label>
          )}
          <select
            className="field task-priority-select"
            value={task.priority}
            onChange={(e) => onUpdate(task.id, { priority: e.target.value as Task["priority"] })}
          >
            {(["high", "medium", "low"] as const).map((p) => (
              <option key={p} value={p}>{taskPriorityLabel[p]}</option>
            ))}
          </select>
        </div>
      )}
      {task.status === "blocked" && task.blockerReason && !expanded && (
        <p className="task-blocker-text">🚧 {task.blockerReason}</p>
      )}
      {task.dueDate && !expanded && (
        <span className="task-due-date">📅 {task.dueDate}</span>
      )}
    </li>
  );
}

export function DocumentView({
  document,
  onToggleResolved,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
}: {
  document: SpecDocument;
  onToggleResolved?: (id: string) => void;
  onTaskCreate?: (task: Task) => void;
  onTaskUpdate?: (id: string, patch: Partial<Task>) => void;
  onTaskDelete?: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [newTaskTitle, setNewTaskTitle] = useState("");

  function toggleSection(key: string) {
    setCollapsed((prev) => ({ ...prev, [key]: !prev[key] }));
  }

  function handleCreateTask() {
    const title = newTaskTitle.trim();
    if (!title || !onTaskCreate) return;
    const task: Task = {
      id: crypto.randomUUID(),
      title,
      status: "inbox",
      priority: "medium",
      relatedIds: [],
      evidence: placeholderEvidence(title),
      source: "user",
      description: "",
      dueDate: null,
      blockerReason: null,
      relatedScreenIds: [],
      relatedRequirementIds: [],
    };
    onTaskCreate(task);
    setNewTaskTitle("");
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
                      {questionPriorityLabel[item.priority]}
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
            <>
              <ul className="task-list">
                {document.tasks.map((item) => (
                  <TaskRow
                    key={item.id}
                    task={item}
                    onUpdate={onTaskUpdate}
                    onDelete={onTaskDelete}
                  />
                ))}
              </ul>
              {onTaskCreate && (
                <div className="task-create-row">
                  <input
                    className="field task-create-input"
                    placeholder="새 작업 추가…"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleCreateTask()}
                  />
                  <button
                    className="button"
                    onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim()}
                  >
                    <Plus size={14} />
                    추가
                  </button>
                </div>
              )}
            </>
          )}
        </>

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
