"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ArrowCounterClockwise,
  CaretDown,
  PencilSimple,
  Plus,
  Trash,
} from "@phosphor-icons/react";
import type { Evidence, Question, SpecDocument, Task } from "@/lib/spec/schema";

const questionPriorityLabel: Record<Question["priority"], string> = {
  blocking: "먼저 확인",
  "should-decide": "결정 필요",
  assumable: "나중에 확인",
};

const taskStatusLabel: Record<Task["status"], string> = {
  inbox: "새 작업",
  todo: "할 일",
  "in-progress": "진행 중",
  blocked: "막힘",
  done: "완료",
};

const taskPriorityLabel: Record<Task["priority"], string> = {
  high: "높음",
  medium: "보통",
  low: "낮음",
};

const stateKindLabel: Record<SpecDocument["states"][number]["kind"], string> = {
  default: "기본",
  loading: "불러오는 중",
  empty: "내용 없음",
  error: "오류",
  disabled: "사용할 수 없음",
  "permission-denied": "권한 없음",
  "network-failure": "연결 실패",
  timeout: "시간 초과",
  "validation-error": "입력 오류",
  "partial-completion": "일부 완료",
  "duplicate-action": "중복 실행",
  "session-expiration": "로그인 만료",
  "unsaved-changes": "저장 안 됨",
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

function editedQuestionEvidence(item: Question, question: string): Evidence {
  const previousRationale = [
    `기존 근거 (${item.evidence.sourceId}): ${item.evidence.sourceExcerpt}`,
    item.evidence.rationale,
  ]
    .filter(Boolean)
    .join("\n");

  return {
    type: "assumption",
    reviewStatus: "needs-review",
    sourceId: "user-input",
    sourceExcerpt: question.slice(0, 80),
    rationale: previousRationale || null,
  };
}

function QuestionCard({
  item,
  answeredBy,
  onToggleResolved,
  onUpdate,
}: {
  item: Question;
  answeredBy: string;
  onToggleResolved?: (id: string) => void;
  onUpdate?: (id: string, patch: Partial<Question>) => void | Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [answerEditing, setAnswerEditing] = useState(false);
  const [answerDraft, setAnswerDraft] = useState(item.answer ?? "");
  const [answerStatus, setAnswerStatus] = useState<"idle" | "pending" | "success" | "error">("idle");
  const [question, setQuestion] = useState(item.question);
  const [context, setContext] = useState(item.context);
  const [priority, setPriority] = useState(item.priority);

  useEffect(() => {
    if (answerEditing) return;
    const frame = window.requestAnimationFrame(() =>
      setAnswerDraft(item.answer ?? ""),
    );
    return () => window.cancelAnimationFrame(frame);
  }, [answerEditing, item.answer]);

  function cancel() {
    setQuestion(item.question);
    setContext(item.context);
    setPriority(item.priority);
    setEditing(false);
  }

  async function save() {
    const nextQuestion = question.trim();
    if (!nextQuestion) return;
    await onUpdate?.(item.id, {
      question: nextQuestion,
      context: context.trim(),
      priority,
      resolved: false,
      evidence: editedQuestionEvidence(item, nextQuestion),
    });
    setEditing(false);
  }

  function cancelAnswer() {
    setAnswerDraft(item.answer ?? "");
    setAnswerEditing(false);
    setAnswerStatus("idle");
  }

  async function saveAnswer() {
    const answer = answerDraft.trim();
    if (!answer || !onUpdate || answerStatus === "pending") return;
    setAnswerStatus("pending");
    try {
      await onUpdate(item.id, {
        answer,
        answeredAt: new Date().toISOString(),
        answeredBy,
        resolved: true,
      });
      setAnswerStatus("success");
      setAnswerEditing(false);
    } catch {
      setAnswerStatus("error");
    }
  }

  return (
    <div className={`question-callout${item.resolved ? " question-resolved" : ""}`}>
      {editing ? (
        <div className="question-edit-form">
          <label>
            질문
            <textarea
              className="field"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              autoFocus
            />
          </label>
          <label>
            배경
            <textarea
              className="field"
              value={context}
              onChange={(event) => setContext(event.target.value)}
            />
          </label>
          <label>
            우선순위
            <select
              className="field"
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as Question["priority"])
              }
            >
              {Object.entries(questionPriorityLabel).map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
          </label>
          <div className="question-edit-actions">
            <button className="button" type="button" onClick={cancel}>취소</button>
            <button
              className="button button-primary"
              type="button"
              onClick={save}
              disabled={!question.trim()}
            >
              질문 저장
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="question-header">
            <span className={`tag tag-priority-${item.priority}`}>
              {questionPriorityLabel[item.priority]}
            </span>
            {onUpdate && (
              <button
                className="icon-action"
                type="button"
                aria-label={`${item.question} 수정`}
                onClick={() => setEditing(true)}
              >
                <PencilSimple size={15} />
              </button>
            )}
            {onToggleResolved && (
              <label className="question-resolve-toggle">
                <input
                  type="checkbox"
                  checked={item.resolved}
                  onChange={() => onToggleResolved(item.id)}
                />
                확인 완료
              </label>
            )}
          </div>
          <strong>{item.question}</strong>
          {item.context && <p>{item.context}</p>}
          {item.answer ? (
            <div className="question-answer">
              <span>답변</span>
              <p>{item.answer}</p>
              <small>
                {[item.answeredBy, item.answeredAt?.slice(0, 10)]
                  .filter(Boolean)
                  .join(" · ")}
              </small>
            </div>
          ) : null}
          {onUpdate && (
            <div className="question-answer-actions">
              {answerEditing ? (
                <div className="question-answer-form">
                  <label>
                    답변
                    <textarea
                      className="field"
                      value={answerDraft}
                      autoFocus
                      onChange={(event) => setAnswerDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if ((event.metaKey || event.ctrlKey) && event.key === "Enter") {
                          event.preventDefault();
                          void saveAnswer();
                        }
                        if (event.key === "Escape") {
                          event.preventDefault();
                          cancelAnswer();
                        }
                      }}
                    />
                  </label>
                  <div className="question-edit-actions">
                    <button
                      className="button"
                      type="button"
                      disabled={answerStatus === "pending"}
                      onClick={cancelAnswer}
                    >
                      취소
                    </button>
                    <button
                      className="button button-primary"
                      type="button"
                      disabled={answerStatus === "pending" || !answerDraft.trim()}
                      onClick={() => void saveAnswer()}
                    >
                      {answerStatus === "pending" ? "저장 중…" : "답변 저장"}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  className="button button--sm"
                  type="button"
                  onClick={() => {
                    setAnswerDraft(item.answer ?? "");
                    setAnswerEditing(true);
                    setAnswerStatus("idle");
                  }}
                >
                  {item.answer ? "답변 수정" : "답변 입력"}
                </button>
              )}
              <span className={`question-answer-status status-${answerStatus}`} aria-live="polite">
                {answerStatus === "success"
                  ? "저장했어요"
                  : answerStatus === "error"
                    ? "저장하지 못했어요. 다시 시도해 주세요."
                    : ""}
              </span>
            </div>
          )}
        </>
      )}
    </div>
  );
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
    const title = titleDraft.trim();
    if (title && title !== task.title) onUpdate?.(task.id, { title });
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
            onChange={(event) => setTitleDraft(event.target.value)}
            onBlur={commitTitle}
            onKeyDown={(event) => {
              if (event.key === "Enter") commitTitle();
              if (event.key === "Escape") {
                setEditingTitle(false);
                setTitleDraft(task.title);
              }
            }}
          />
        ) : (
          <button
            className="task-title"
            onClick={() => setEditingTitle(true)}
            type="button"
          >
            {task.title}
          </button>
        )}
        <div className="task-badges">
          {task.source === "user" && <span className="task-source-badge">직접 추가</span>}
          <span className={`task-priority task-priority-${task.priority}`}>
            {taskPriorityLabel[task.priority]}
          </span>
        </div>
        <div className="task-actions">
          {onUpdate && (
            <select
              className="task-status-select"
              value={task.status}
              aria-label={`${task.title} 상태`}
              onChange={(event) =>
                onUpdate(task.id, { status: event.target.value as Task["status"] })
              }
            >
              {ALL_STATUSES.map((status) => (
                <option key={status} value={status}>{taskStatusLabel[status]}</option>
              ))}
            </select>
          )}
          {onUpdate && (
            <button
              className="icon-action"
              onClick={() => setExpanded((value) => !value)}
              aria-label={`${task.title} 세부 정보`}
              type="button"
            >
              <PencilSimple size={15} />
            </button>
          )}
          {onDelete && (
            <button
              className="icon-action icon-action--danger"
              aria-label="작업 삭제"
              type="button"
              onClick={() => onDelete(task.id)}
            >
              <Trash size={15} />
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
              placeholder="필요한 내용을 적어 주세요."
              defaultValue={task.description ?? ""}
              onBlur={(event) => onUpdate(task.id, { description: event.target.value })}
            />
          </label>
          <label className="task-detail-label">
            마감일
            <input
              type="date"
              className="field"
              defaultValue={task.dueDate ?? ""}
              onBlur={(event) => onUpdate(task.id, { dueDate: event.target.value || null })}
            />
          </label>
          {task.status === "blocked" && (
            <label className="task-detail-label">
              막힌 이유
              <input
                className="field"
                placeholder="진행을 막고 있는 내용을 적어 주세요."
                defaultValue={task.blockerReason ?? ""}
                onBlur={(event) =>
                  onUpdate(task.id, { blockerReason: event.target.value || null })
                }
              />
            </label>
          )}
          <label className="task-detail-label">
            우선순위
            <select
              className="field task-priority-select"
              value={task.priority}
              onChange={(event) =>
                onUpdate(task.id, { priority: event.target.value as Task["priority"] })
              }
            >
              {(["high", "medium", "low"] as const).map((priority) => (
                <option key={priority} value={priority}>
                  {taskPriorityLabel[priority]}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}
      {task.status === "blocked" && task.blockerReason && !expanded && (
        <p className="task-blocker-text">막힌 이유: {task.blockerReason}</p>
      )}
      {task.dueDate && !expanded && (
        <span className="task-due-date">마감 {task.dueDate}</span>
      )}
    </li>
  );
}

function SectionHeading({
  id,
  title,
  meta,
  collapsed,
  onToggle,
}: {
  id: string;
  title: string;
  meta?: React.ReactNode;
  collapsed: boolean;
  onToggle: () => void;
}) {
  return (
    <h2 id={id} className="section-heading">
      <button type="button" onClick={onToggle} aria-expanded={!collapsed}>
        <span>{title}</span>
        <span className="section-meta">
          {meta}
          <CaretDown
            className={`section-chevron${collapsed ? " is-collapsed" : ""}`}
            size={17}
          />
        </span>
      </button>
    </h2>
  );
}

export function DocumentView({
  document,
  username = "designer",
  onToggleResolved,
  onQuestionUpdate,
  onBriefProblemChange,
  onTaskCreate,
  onTaskUpdate,
  onTaskDelete,
  onTaskRestore,
  onTaskPurge,
}: {
  document: SpecDocument;
  username?: string;
  onToggleResolved?: (id: string) => void;
  onQuestionUpdate?: (id: string, patch: Partial<Question>) => void | Promise<void>;
  onBriefProblemChange?: (problem: string) => void;
  onTaskCreate?: (task: Task) => void;
  onTaskUpdate?: (id: string, patch: Partial<Task>) => void;
  onTaskDelete?: (id: string) => void;
  onTaskRestore?: (id: string) => void;
  onTaskPurge?: (id: string) => void;
}) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const [expandedRequirements, setExpandedRequirements] = useState<Set<string>>(new Set());
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [trashOpen, setTrashOpen] = useState(false);
  const [problemEditing, setProblemEditing] = useState(false);
  const [problemDraft, setProblemDraft] = useState(document.brief.problem);

  const requirementGroups = useMemo(() => {
    const groups = new Map<string, SpecDocument["requirements"]>();
    document.requirements.forEach((requirement) => {
      const category = requirement.category.trim() || "기타";
      groups.set(category, [...(groups.get(category) ?? []), requirement]);
    });
    return [...groups.entries()];
  }, [document.requirements]);

  const stateGroups = useMemo(
    () =>
      document.screens.map((screen) => ({
        screen,
        states: document.states.filter((state) => state.screenId === screen.id),
      })).filter((group) => group.states.length > 0),
    [document.screens, document.states],
  );

  const activeTasks = document.tasks.filter((task) => !task.deletedAt);
  const deletedTasks = document.tasks.filter((task) => task.deletedAt);
  const unresolvedCount = document.questions.filter((question) => !question.resolved).length;

  function toggleSection(key: string) {
    setCollapsed((current) => ({ ...current, [key]: !current[key] }));
  }

  function handleCreateTask() {
    const title = newTaskTitle.trim();
    if (!title || !onTaskCreate) return;
    onTaskCreate({
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
      deletedAt: null,
    });
    setNewTaskTitle("");
  }

  if (!document.brief.title) {
    return (
      <div className="document-view">
        <div className="document-empty">
          <p>아직 정리된 내용이 없어요. 원문을 확인한 뒤 다시 정리해 주세요.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="document-view">
      <article id="section-brief">
        <h1>{document.brief.title}</h1>
        <p className="document-lead">{document.brief.purpose}</p>

        {(document.brief.problem || problemEditing) && (
          <section className="brief-block">
            <div className="brief-block-header">
              <h2>문제 배경</h2>
              {onBriefProblemChange && !problemEditing && (
                <button
                  className="brief-edit-btn"
                  aria-label="문제 배경 편집"
                  onClick={() => { setProblemDraft(document.brief.problem); setProblemEditing(true); }}
                >
                  <PencilSimple size={13} />
                </button>
              )}
            </div>
            {problemEditing ? (
              <div className="brief-edit-form">
                <textarea
                  className="brief-edit-textarea"
                  value={problemDraft}
                  onChange={(e) => setProblemDraft(e.target.value)}
                  autoFocus
                  rows={3}
                />
                <div className="brief-edit-actions">
                  <button className="button" onClick={() => setProblemEditing(false)}>취소</button>
                  <button
                    className="button button-primary"
                    onClick={() => {
                      onBriefProblemChange?.(problemDraft.trim());
                      setProblemEditing(false);
                    }}
                  >
                    저장
                  </button>
                </div>
              </div>
            ) : (
              <p>{document.brief.problem}</p>
            )}
          </section>
        )}

        {document.brief.successCriteria.length > 0 && (
          <section className="brief-block">
            <h2>성공 조건</h2>
            <ul>
              {document.brief.successCriteria.map((item) => <li key={item}>{item}</li>)}
            </ul>
          </section>
        )}

        <section>
          <SectionHeading
            id="section-requirements"
            title="요구사항"
            meta={document.requirements.length > 0 ? `${document.requirements.length}개` : ""}
            collapsed={!!collapsed.requirements}
            onToggle={() => toggleSection("requirements")}
          />
          {!collapsed.requirements && (
            document.requirements.length > 0 ? (
              <div className="requirement-groups">
                {requirementGroups.map(([category, requirements]) => (
                  <section className="requirement-group" key={category}>
                    <h3>{category}</h3>
                    {requirements.map((item) => {
                      const expanded = expandedRequirements.has(item.id);
                      return (
                        <button
                          className={`requirement-item${expanded ? " is-expanded" : ""}`}
                          type="button"
                          key={item.id}
                          aria-expanded={expanded}
                          onClick={() =>
                            setExpandedRequirements((current) => {
                              const next = new Set(current);
                              if (next.has(item.id)) next.delete(item.id);
                              else next.add(item.id);
                              return next;
                            })
                          }
                        >
                          <span className="requirement-copy">{item.content}</span>
                          <span
                            className={`tag tag-${item.evidence.type === "original" ? "original" : "inference"}`}
                          >
                            {item.evidence.type === "original" ? "원문" : "정리"}
                          </span>
                        </button>
                      );
                    })}
                  </section>
                ))}
              </div>
            ) : (
              <p className="section-empty">정리된 요구사항이 아직 없어요. 다시 정리하기를 눌러 원문을 분석해봐요.</p>
            )
          )}
        </section>

        <section>
          <SectionHeading
            id="section-questions"
            title="확인 질문"
            meta={document.questions.length > 0 ? (unresolvedCount > 0 ? `${unresolvedCount}개 남음` : "모두 확인") : ""}
            collapsed={!!collapsed.questions}
            onToggle={() => toggleSection("questions")}
          />
          {!collapsed.questions && (
            document.questions.length > 0 ? (
              <div className="question-list">
                {document.questions.map((item) => (
                  <QuestionCard
                    key={item.id}
                    item={item}
                    answeredBy={username}
                    onToggleResolved={onToggleResolved}
                    onUpdate={onQuestionUpdate}
                  />
                ))}
              </div>
            ) : (
              <p className="section-empty">확인할 질문이 없어요.</p>
            )
          )}
        </section>

        <section>
          <SectionHeading
            id="section-states"
            title="상태·예외"
            meta={document.states.length > 0 ? `${document.states.length}개` : ""}
            collapsed={!!collapsed.states}
            onToggle={() => toggleSection("states")}
          />
          {!collapsed.states && (
            document.states.length > 0 ? (
              <div className="state-groups">
                {stateGroups.map(({ screen, states }) => (
                  <section className="state-group" key={screen.id}>
                    <h3>{screen.name}</h3>
                    <div className="state-list">
                      {states.map((state) => (
                        <article className="state-item" key={state.id}>
                          <div>
                            <strong>{state.name}</strong>
                            <span className={`tag tag-state-kind tag-state-${state.kind}`}>
                              {stateKindLabel[state.kind]}
                            </span>
                          </div>
                          {state.description && <p className="state-desc">{state.description}</p>}
                        </article>
                      ))}
                    </div>
                  </section>
                ))}
              </div>
            ) : (
              <p className="section-empty">등록된 상태·예외 케이스가 없어요.</p>
            )
          )}
        </section>

        <section>
          <SectionHeading
            id="section-permissions"
            title="역할·권한"
            meta={document.roles.length > 0 ? `${document.roles.length}개 역할` : ""}
            collapsed={!!collapsed.permissions}
            onToggle={() => toggleSection("permissions")}
          />
          {!collapsed.permissions && (
            document.roles.length > 0 || document.permissions.length > 0 ? (
              <div className="permission-cards">
                {document.roles.map((role) => {
                  const permissions = document.permissions.filter(
                    (permission) => permission.roleId === role.id,
                  );
                  return (
                    <article className="permission-card" key={role.id}>
                      <h3>{role.name}</h3>
                      <p>{role.description}</p>
                      {[
                        [true, "할 수 있어요"],
                        [false, "할 수 없어요"],
                        [null, "확인이 필요해요"],
                      ].map(([allowed, label]) => {
                        const items = permissions.filter(
                          (permission) => permission.allowed === allowed,
                        );
                        if (!items.length) return null;
                        return (
                          <div className="permission-group" key={label as string}>
                            <strong>{label}</strong>
                            <ul>
                              {items.map((permission) => (
                                <li key={permission.id}>
                                  <span>{permission.capability}</span>
                                  {permission.note && <small>{permission.note}</small>}
                                </li>
                              ))}
                            </ul>
                          </div>
                        );
                      })}
                    </article>
                  );
                })}
              </div>
            ) : (
              <p className="section-empty">역할과 권한 정보가 없어요.</p>
            )
          )}
        </section>

        <section>
          <SectionHeading
            id="section-tasks"
            title="작업 목록"
            meta={`${activeTasks.length}개`}
            collapsed={!!collapsed.tasks}
            onToggle={() => toggleSection("tasks")}
          />
          {!collapsed.tasks && (
            <>
              <ul className="task-list">
                {activeTasks.map((item) => (
                  <TaskRow
                    key={item.id}
                    task={item}
                    onUpdate={onTaskUpdate}
                    onDelete={onTaskDelete}
                  />
                ))}
              </ul>
              {activeTasks.length === 0 && (
                <p className="section-empty">진행 중인 작업이 없어요.</p>
              )}
              {onTaskCreate && (
                <div className="task-create-row">
                  <input
                    className="field task-create-input"
                    placeholder="새 작업 추가…"
                    value={newTaskTitle}
                    onChange={(event) => setNewTaskTitle(event.target.value)}
                    onKeyDown={(event) => event.key === "Enter" && handleCreateTask()}
                  />
                  <button
                    className="button"
                    type="button"
                    onClick={handleCreateTask}
                    disabled={!newTaskTitle.trim()}
                  >
                    <Plus size={15} />
                    추가
                  </button>
                </div>
              )}
              {deletedTasks.length > 0 && (
                <div className="task-trash">
                  <button
                    className="button button-ghost"
                    type="button"
                    aria-label="휴지통 열기"
                    onClick={() => setTrashOpen((value) => !value)}
                  >
                    <Trash size={15} />
                    휴지통 {deletedTasks.length}
                  </button>
                  {trashOpen && (
                    <ul className="task-trash-list">
                      {deletedTasks.map((task) => (
                        <li key={task.id}>
                          <span>{task.title}</span>
                          <div>
                            <button
                              className="button button--sm"
                              type="button"
                              onClick={() => onTaskRestore?.(task.id)}
                            >
                              <ArrowCounterClockwise size={14} />
                              복원
                            </button>
                            {onTaskPurge && (
                              <button
                                className="button button--sm"
                                type="button"
                                onClick={() => {
                                  if (
                                    window.confirm(
                                      `"${task.title}" 작업을 영구 삭제할까요? 이 작업은 되돌릴 수 없어요.`,
                                    )
                                  ) {
                                    onTaskPurge(task.id);
                                  }
                                }}
                              >
                                영구 삭제
                              </button>
                            )}
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </>
          )}
        </section>
      </article>
    </div>
  );
}
