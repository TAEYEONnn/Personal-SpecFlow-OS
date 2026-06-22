"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Article,
  ArrowClockwise,
  CheckSquare,
  ClockCounterClockwise,
  DownloadSimple,
  FileText,
  GitDiff,
  ListChecks,
  Notepad,
  PencilSimple,
  Question,
  SquaresFour,
  Warning,
} from "@phosphor-icons/react";
import { LogoutButton } from "@/components/auth/logout-button";
import { DiffView } from "@/components/workspace/diff-view";
import { DocumentView } from "@/components/workspace/document-view";
import { EvidencePanel } from "@/components/workspace/evidence-panel";
import { FigmaView } from "@/components/workspace/figma-view";
import { computeAutoLayout, FlowCanvas } from "@/components/workspace/flow-canvas";
import { MatrixView } from "@/components/workspace/matrix-view";
import { RunsView } from "@/components/workspace/runs-view";
import { ScreenDetail } from "@/components/workspace/screen-detail";
import { DecisionsView } from "@/components/workspace/decisions-view";
import { HelpOverlay } from "@/components/workspace/help-overlay";
import { SourceViewer } from "@/components/workspace/source-viewer";
import type { Evidence, Screen, SpecDocument, Task, UxCopy } from "@/lib/spec/schema";
import type { ProjectView } from "@/lib/projects/service";

type ViewMode = "document" | "flow" | "matrix" | "runs" | "diff" | "figma" | "sources" | "decisions";

const navItems = [
  { id: "overview", label: "개요", icon: FileText, countKey: "brief", description: "목적, 성공 조건, 요구사항 요약", alwaysShow: true },
  { id: "sources", label: "원문", icon: Article, countKey: "sources", description: "업로드된 원본 문서 목록", alwaysShow: true },
  { id: "requirements", label: "요구사항", icon: ListChecks, countKey: "requirements", description: "도출된 기능 요구사항 목록", alwaysShow: false },
  { id: "questions", label: "확인 질문", icon: Question, countKey: "questions", description: "AI가 발견한 미결·가정 사항", alwaysShow: false },
  { id: "decisions", label: "결정 기록", icon: Notepad, countKey: "decisions", description: "확정된 요구사항 및 해결된 질문", alwaysShow: false },
  { id: "screens", label: "화면", icon: SquaresFour, countKey: "screens", description: "화면 흐름도 및 선택 화면 상세", alwaysShow: true },
  { id: "states", label: "상태·예외", icon: Warning, countKey: "states", description: "화면별 상태·예외 시나리오", alwaysShow: false },
  { id: "tasks", label: "작업", icon: CheckSquare, countKey: "tasks", description: "개발 작업 및 진행 상태", alwaysShow: false },
  { id: "diff", label: "변경 영향", icon: GitDiff, countKey: "diff", description: "버전 간 변경 사항 비교", alwaysShow: true },
  { id: "runs", label: "활동 기록", icon: ClockCounterClockwise, countKey: "runs", description: "AI 정리 실행 기록", alwaysShow: true },
] as const;

export function WorkspaceShell({
  project,
  username,
}: {
  project: ProjectView & { document: SpecDocument };
  username: string;
}) {
  const [document, setDocument] = useState(() => structuredClone(project.document));
  const [revision, setRevision] = useState(project.revision);
  const [selectedId, setSelectedId] = useState(document.screens[0]?.id ?? "");
  const [view, setView] = useState<ViewMode>("flow");
  const [activeNav, setActiveNav] = useState("screens");
  const [editing, setEditing] = useState(false);
  const [pending, setPending] = useState(false);
  const [note, setNote] = useState("");
  const [noteIsError, setNoteIsError] = useState(false);
  const [retryFn, setRetryFn] = useState<(() => void) | null>(null);
  const [projectName, setProjectName] = useState(project.name);
  const [nameEditing, setNameEditing] = useState(false);
  const [notionDialog, setNotionDialog] = useState(false);
  const [notionPageId, setNotionPageId] = useState("");
  const [notionPending, setNotionPending] = useState(false);
  const [notionResult, setNotionResult] = useState<{ url: string } | null>(null);
  const [sourcesCount, setSourcesCount] = useState(project.sources.length);
  const [canvasCollapsed, setCanvasCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const [canvasHeight, setCanvasHeight] = useState(() => {
    if (typeof window === "undefined") return 360;

    const saved = window.localStorage.getItem("specflow-canvas-height");
    const parsed = saved ? Number.parseInt(saved, 10) : Number.NaN;

    return Number.isNaN(parsed) || parsed <= 0 ? 360 : parsed;
  });

  const [evidencePanelCollapsed, setEvidencePanelCollapsed] = useState(() => {
    if (typeof window === "undefined") return false;

    return (
      window.localStorage.getItem("specflow-evidence-collapsed") === "true"
    );
  });
  const [needsRecompile, setNeedsRecompile] = useState(project.needsRecompile ?? false);
  const prevPositions = useRef<Record<string, { x: number; y: number }> | null>(null);


  useEffect(() => {
    if (!note || noteIsError) return;
    const id = setTimeout(() => setNote(""), 3000);
    return () => clearTimeout(id);
  }, [note, noteIsError]);

  useEffect(() => {
    if (!editing) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editing]);

  function setError(message: string, retry?: () => void) {
    setNote(message);
    setNoteIsError(true);
    setRetryFn(retry ? () => retry : null);
  }

  function clearNote() {
    setNote("");
    setNoteIsError(false);
    setRetryFn(null);
  }

  const selectedScreen =
    document.screens.find((screen) => screen.id === selectedId) ?? document.screens[0] ?? null;

  const showEvidencePanel = view === "flow" && !!selectedScreen;

  const counts = useMemo(
    () => ({
      brief: 1,
      sources: sourcesCount,
      requirements: document.requirements.length,
      questions: document.questions.length,
      decisions:
        document.requirements.filter((r) => r.evidence.reviewStatus === "confirmed").length +
        document.questions.filter((q) => q.resolved).length,
      screens: document.screens.length,
      states: document.states.length,
      tasks: document.tasks.length,
      diff: 0,
      runs: project.runs.length,
    }),
    [document, project.runs.length, sourcesCount],
  );

  function replaceScreen(next: Screen) {
    setDocument((current) => ({
      ...current,
      screens: current.screens.map((screen) => (screen.id === next.id ? next : screen)),
    }));
  }

  function replaceEvidence(status: Evidence["reviewStatus"]) {
    if (!selectedScreen) return;
    replaceScreen({
      ...selectedScreen,
      evidence: { ...selectedScreen.evidence, reviewStatus: status },
    });
  }

  async function doSave(rev: number, doc: SpecDocument) {
    setPending(true);
    clearNote();
    const response = await fetch(`/api/projects/${project.id}/document`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ revision: rev, document: doc }),
    });
    const data = await response.json();
    if (response.ok) {
      setRevision(data.revision);
      setEditing(false);
      setNote("저장됨");
      setNoteIsError(false);
    } else {
      setError(data.error ?? "저장하지 못했습니다.", () => doSave(rev, doc));
    }
    setPending(false);
  }

  const saveDocument = useCallback(async () => {
    await doSave(revision, document);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [project.id, revision, document]);

  function toggleQuestionResolved(id: string) {
    const nextDoc = {
      ...document,
      questions: document.questions.map((q) =>
        q.id === id ? { ...q, resolved: !q.resolved } : q,
      ),
    };
    setDocument(nextDoc);
    doSave(revision, nextDoc);
  }

  function handleTaskCreate(task: Task) {
    const nextDoc = { ...document, tasks: [...document.tasks, task] };
    setDocument(nextDoc);
    doSave(revision, nextDoc);
  }

  function handleTaskUpdate(id: string, patch: Partial<Task>) {
    const nextDoc = {
      ...document,
      tasks: document.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)),
    };
    setDocument(nextDoc);
    doSave(revision, nextDoc);
  }

  function handleTaskDelete(id: string) {
    const nextDoc = { ...document, tasks: document.tasks.filter((t) => t.id !== id) };
    setDocument(nextDoc);
    doSave(revision, nextDoc);
  }

  function handleUxCopyChange(items: UxCopy[]) {
    if (!selectedScreen) return;
    const others = document.uxCopy.filter((c) => c.screenId !== selectedScreen.id);
    const nextDoc = { ...document, uxCopy: [...others, ...items] };
    setDocument(nextDoc);
    doSave(revision, nextDoc);
  }

  function handleAutoLayout() {
    prevPositions.current = Object.fromEntries(
      document.screens.map((s) => [s.id, { ...s.position }]),
    );
    const positions = computeAutoLayout(document.screens);
    const nextDoc = {
      ...document,
      screens: document.screens.map((s) =>
        positions[s.id] ? { ...s, position: positions[s.id] } : s,
      ),
    };
    setDocument(nextDoc);
    doSave(revision, nextDoc);
  }

  function handleUndoLayout() {
    if (!prevPositions.current) return;
    const saved = prevPositions.current;
    prevPositions.current = null;
    const nextDoc = {
      ...document,
      screens: document.screens.map((s) =>
        saved[s.id] ? { ...s, position: saved[s.id] } : s,
      ),
    };
    setDocument(nextDoc);
    doSave(revision, nextDoc);
  }

  function handlePositionUpdate(screenId: string, pos: { x: number; y: number }) {
    const nextDoc = {
      ...document,
      screens: document.screens.map((s) =>
        s.id === screenId ? { ...s, position: pos } : s,
      ),
    };
    setDocument(nextDoc);
    doSave(revision, nextDoc);
  }

  function startResize(e: React.MouseEvent) {
    e.preventDefault();
    const startY = e.clientY;
    const startH = canvasHeight;
    function onMove(ev: MouseEvent) {
      const next = Math.max(120, Math.min(startH + ev.clientY - startY, window.innerHeight - 200));
      setCanvasHeight(next);
    }
    function onUp(ev: MouseEvent) {
      const finalH = Math.max(120, Math.min(startH + ev.clientY - startY, window.innerHeight - 200));
      localStorage.setItem("specflow-canvas-height", String(finalH));
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    }
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  }

  function toggleEvidenceCollapsed() {
    setEvidencePanelCollapsed((v) => {
      const next = !v;
      localStorage.setItem("specflow-evidence-collapsed", String(next));
      return next;
    });
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "?") { setHelpOpen(true); return; }
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        saveDocument();
        return;
      }
      if (e.key === "z" && (e.metaKey || e.ctrlKey) && !e.shiftKey && prevPositions.current) {
        e.preventDefault();
        handleUndoLayout();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saveDocument]);

  const recompile = useCallback(async () => {
    if (!window.confirm("원문으로 처음부터 다시 정리할까요? 현재 문서는 저장됩니다.")) return;
    setPending(true);
    setNote("정리 중…");
    setNoteIsError(false);
    setRetryFn(null);
    const response = await fetch(`/api/projects/${project.id}/compile`, { method: "POST" });
    const data = await response.json();
    if (response.ok) {
      setDocument(data.document);
      setRevision(data.revision);
      setSelectedId(data.document.screens[0]?.id ?? "");
      setNote("정리 완료");
      setNoteIsError(false);
      setNeedsRecompile(false);
    } else {
      setError(data.error ?? "정리하지 못했습니다.", recompile);
    }
    setPending(false);

  }, [project.id]);

  async function handleRenameProject() {
    if (projectName.trim() === project.name || !projectName.trim()) {
      setNameEditing(false);
      setProjectName(project.name);
      return;
    }
    await fetch(`/api/projects/${project.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: projectName.trim() }),
    });
    setNameEditing(false);
  }

  async function exportToNotion() {
    if (!notionPageId.trim()) return;
    const cleaned = notionPageId.replace(/-/g, "").trim();
    if (!/^[a-f0-9]{32}$/i.test(cleaned)) {
      setNote("유효한 Notion 페이지 ID를 입력해 주세요 (32자리 hex).");
      setNotionDialog(false);
      return;
    }
    setNotionPending(true);
    setNotionResult(null);
    const response = await fetch(`/api/projects/${project.id}/export/notion`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ parentPageId: notionPageId.trim() }),
    });
    const data = await response.json();
    if (response.ok) {
      setNotionResult({ url: data.url });
    } else if (data.notionAuthRequired) {
      window.location.href = `/api/notion/oauth?returnTo=/projects/${project.id}`;
    } else {
      setNote(data.error ?? "Notion 내보내기 실패");
      setNotionDialog(false);
    }
    setNotionPending(false);
  }

  function guardEditing(): boolean {
    if (!editing) return true;
    return window.confirm("저장하지 않은 내용이 있어요. 이동할까요?");
  }

  const visibleNavItems = navItems.filter((item) => {
    if (item.alwaysShow) return true;
    return (counts[item.countKey as keyof typeof counts] ?? 0) > 0;
  });

  const navToSection: Record<string, string> = {
    overview: "section-brief",
    requirements: "section-requirements",
    questions: "section-questions",
    tasks: "section-tasks",
    states: "section-states",
  };

  function chooseNav(id: string) {
    if (!guardEditing()) return;
    setEditing(false);
    setActiveNav(id);
    if (id === "screens") setView("flow");
    else if (id === "runs") setView("runs");
    else if (id === "diff") setView("diff");
    else if (id === "sources") setView("sources");
    else if (id === "decisions") setView("decisions");
    else setView("document");
    if (navToSection[id]) {
      const sectionId = navToSection[id];
      setTimeout(() => {
        window.document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  }

  const epClass = showEvidencePanel
    ? evidencePanelCollapsed ? " workspace--ep-slim" : " workspace--ep-full"
    : "";

  const screenUxCopy = selectedScreen
    ? document.uxCopy.filter((c) => c.screenId === selectedScreen.id)
    : [];

  return (
    <>
      <main className={`workspace${epClass}`}>
        <aside className="workspace-sidebar">
          <div className="sidebar-brand">
            <Link className="brand" href="/projects">
              <span className="brand-mark" aria-hidden />
              <span>SpecFlow OS</span>
            </Link>
          </div>
          <div className="sidebar-project">
            <div className="sidebar-eyebrow">프로젝트</div>
            {nameEditing ? (
              <input
                className="sidebar-project-name-input"
                value={projectName}
                maxLength={120}
                autoFocus
                onBlur={handleRenameProject}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleRenameProject();
                  if (e.key === "Escape") { setNameEditing(false); setProjectName(project.name); }
                }}
                onChange={(e) => setProjectName(e.target.value)}
              />
            ) : (
              <button
                className="sidebar-project-name"
                title="클릭하여 이름 변경"
                onClick={() => setNameEditing(true)}
              >
                {projectName}
              </button>
            )}
          </div>
          <nav className="sidebar-nav" aria-label="산출물">
            {visibleNavItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  className={`nav-item ${activeNav === item.id ? "active" : ""}`}
                  key={item.id}
                  title={item.description}
                  onClick={() => chooseNav(item.id)}
                >
                  <Icon size={18} />
                  <span className="nav-label">{item.label}</span>
                  <span className="nav-count">{counts[item.countKey as keyof typeof counts]}</span>
                </button>
              );
            })}
          </nav>
          <div className="sidebar-footer">
            <div className="profile-chip">
              <span className="avatar">{username.slice(0, 1).toUpperCase()}</span>
              <span>{username}</span>
            </div>
            <LogoutButton compact />
          </div>
        </aside>

        <header className="workspace-header">
          <div className="workspace-title">
            <span>프로젝트</span>
            <strong>{project.name}</strong>
          </div>
          <div className="header-actions">
            {needsRecompile && (
              <span className="recompile-banner">
                원문이 변경되었어요.
                <button className="button button-primary button--sm" disabled={pending} onClick={recompile}>
                  <ArrowClockwise size={13} />
                  다시 정리하기
                </button>
              </span>
            )}
            <span className={`compile-status${noteIsError ? " compile-status--error" : ""}`}>
              <span className={`status-dot${pending ? " status-dot--pending" : ""}`} />
              {note || `변환 완료 · 버전 ${revision}`}
              {noteIsError && retryFn && (
                <button className="retry-button" onClick={() => { clearNote(); retryFn(); }}>
                  다시 시도
                </button>
              )}
              {noteIsError && (
                <button className="dismiss-button" onClick={clearNote} aria-label="닫기">✕</button>
              )}
            </span>
            <button className="button button--icon" onClick={() => setHelpOpen(true)} aria-label="도움말 (?)">
              <Question size={17} />
            </button>
            <button className="button" disabled={pending} onClick={recompile}>
              <ArrowClockwise size={17} />
              다시 정리하기
            </button>
            <div className="export-menu">
              <button className="button">
                <DownloadSimple size={17} />
                내보내기
              </button>
              <div className="export-dropdown">
                <div className="export-group-label">Markdown</div>
                {[
                  ["full", "전체 명세"],
                  ["screen-spec", "화면 정의서"],
                  ["qa-checklist", "QA 체크리스트"],
                  ["daily-report", "일일보고"],
                ].map(([tmpl, label]) => (
                  <a
                    key={tmpl}
                    className="export-option"
                    href={`/api/projects/${project.id}/export?format=markdown&template=${tmpl}`}
                  >
                    {label}
                  </a>
                ))}
                <div className="export-divider" />
                <div className="export-group-label">데이터</div>
                <a
                  className="export-option"
                  href={`/api/projects/${project.id}/export?format=json`}
                >
                  JSON (원본)
                </a>
                <div className="export-divider" />
                <div className="export-group-label">연동</div>
                <button
                  className="export-option"
                  type="button"
                  onClick={() => { setNotionDialog(true); setNotionResult(null); }}
                >
                  Notion으로 내보내기
                </button>
                <button
                  className="export-option"
                  type="button"
                  onClick={() => setView("figma")}
                >
                  Figma 매핑 확인
                </button>
              </div>
            </div>
          </div>
        </header>

        <section
          className="workspace-main"
          style={view === "flow" ? { display: "flex", flexDirection: "column" } : { gridTemplateRows: "1fr" }}
        >
          {view === "flow" ? (
            selectedScreen ? (
              <>
                <div style={{ height: canvasCollapsed ? 50 : canvasHeight, minHeight: canvasCollapsed ? 50 : 120, overflow: "hidden", flexShrink: 0 }}>
                  <FlowCanvas
                    document={document}
                    selectedScreenId={selectedScreen.id}
                    onSelect={setSelectedId}
                    onPositionUpdate={handlePositionUpdate}
                    collapsed={canvasCollapsed}
                    onToggleCollapse={() => setCanvasCollapsed((c) => !c)}
                    onRecompile={recompile}
                    onAutoLayout={handleAutoLayout}
                  />
                </div>
                {!canvasCollapsed && (
                  <div
                    className="resize-divider"
                    onMouseDown={startResize}
                    role="separator"
                    aria-label="상세 패널 크기 조절"
                  />
                )}
                <section className="detail-panel" style={{ flex: 1, minHeight: 0, overflow: "auto" }}>
                  <div className="detail-heading">
                    <h2>
                      선택한 화면 상세
                      <span className="detail-subtitle">{selectedScreen.name}</span>
                    </h2>
                    <div className="header-actions">
                      {note === "저장됨" ? <span className="save-note">✓ 저장됨</span> : null}
                      {editing ? (
                        <button className="button button-primary" disabled={pending} onClick={saveDocument}>
                          저장
                        </button>
                      ) : (
                        <button className="button" onClick={() => setEditing(true)}>
                          <PencilSimple size={17} />
                          편집 모드
                        </button>
                      )}
                    </div>
                  </div>
                  <ScreenDetail
                    screen={selectedScreen}
                    editing={editing}
                    onChange={replaceScreen}
                    uxCopy={screenUxCopy}
                    onUxCopyChange={handleUxCopyChange}
                  />
                </section>
              </>
            ) : (
              <div className="empty-flow">
                <p>정리 결과에 화면 정보가 없어요. 다시 정리하기를 시도해 보세요.</p>
              </div>
            )
          ) : view === "document" ? (
            <DocumentView
              document={document}
              onToggleResolved={toggleQuestionResolved}
              onTaskCreate={handleTaskCreate}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
            />
          ) : view === "decisions" ? (
            <DecisionsView document={document} />
          ) : view === "matrix" ? (
            <MatrixView document={document} />
          ) : view === "diff" ? (
            <DiffView projectId={project.id} current={document} currentRevision={revision} />
          ) : view === "figma" ? (
            <FigmaView projectId={project.id} document={document} />
          ) : view === "sources" ? (
            <SourceViewer
              projectId={project.id}
              initialSources={project.sources}
              onSourceDelete={() => setSourcesCount((n) => Math.max(0, n - 1))}
              onSourceAdd={() => setSourcesCount((n) => n + 1)}
              onSourceUpdate={() => setNeedsRecompile(true)}
            />
          ) : (
            <RunsView runs={project.runs} />
          )}
        </section>

        {showEvidencePanel && (
          <EvidencePanel
            evidence={selectedScreen!.evidence}
            onStatusChange={replaceEvidence}
            onNavigateDiff={() => { setView("diff"); setActiveNav("diff"); }}
            collapsed={evidencePanelCollapsed}
            onToggleCollapse={toggleEvidenceCollapsed}
          />
        )}
      </main>

      <HelpOverlay open={helpOpen} onClose={() => setHelpOpen(false)} />

      {notionDialog && (
        <div
          className="notion-dialog-backdrop"
          onClick={() => setNotionDialog(false)}
          onKeyDown={(e) => e.key === "Escape" && setNotionDialog(false)}
          tabIndex={-1}
        >
          <div className="notion-dialog" onClick={(e) => e.stopPropagation()}>
            {notionResult ? (
              <>
                <p className="notion-dialog-title">Notion 내보내기 완료</p>
                <a className="notion-dialog-link" href={notionResult.url} target="_blank" rel="noreferrer">
                  Notion에서 열기 →
                </a>
                <div className="notion-dialog-actions">
                  <button className="button button-primary" onClick={() => setNotionDialog(false)}>닫기</button>
                </div>
              </>
            ) : (
              <>
                <p className="notion-dialog-title">Notion 페이지 ID 입력</p>
                <p className="notion-dialog-hint">
                  Notion 페이지 URL의 마지막 32자리를 붙여 넣으세요.
                </p>
                <input
                  className="field"
                  placeholder="예: 1a2b3c4d5e6f..."
                  value={notionPageId}
                  onChange={(e) => setNotionPageId(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && exportToNotion()}
                  autoFocus
                />
                <div className="notion-dialog-actions">
                  <button className="button" onClick={() => setNotionDialog(false)}>취소</button>
                  <button
                    className="button button-primary"
                    disabled={notionPending || !notionPageId.trim()}
                    onClick={exportToNotion}
                  >
                    {notionPending ? "내보내는 중…" : "Notion으로 내보내기"}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
