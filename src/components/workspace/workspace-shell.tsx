"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
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
  PencilSimple,
  Question,
  SquaresFour,
  TextT,
  UsersThree,
  Warning,
} from "@phosphor-icons/react";
import { LogoutButton } from "@/components/auth/logout-button";
import { DiffView } from "@/components/workspace/diff-view";
import { DocumentView } from "@/components/workspace/document-view";
import { EvidencePanel } from "@/components/workspace/evidence-panel";
import { FigmaView } from "@/components/workspace/figma-view";
import { FlowCanvas } from "@/components/workspace/flow-canvas";
import { MatrixView } from "@/components/workspace/matrix-view";
import { RunsView } from "@/components/workspace/runs-view";
import { ScreenDetail } from "@/components/workspace/screen-detail";
import { HelpOverlay } from "@/components/workspace/help-overlay";
import { SourceViewer } from "@/components/workspace/source-viewer";
import type { Evidence, Screen, SpecDocument } from "@/lib/spec/schema";
import type { ProjectView } from "@/lib/projects/service";

type ViewMode = "document" | "flow" | "matrix" | "runs" | "diff" | "figma" | "sources";

const navItems = [
  { id: "brief", label: "브리프", icon: FileText, countKey: "brief" },
  { id: "questions", label: "확인 질문", icon: Question, countKey: "questions" },
  { id: "screens", label: "화면 목록", icon: SquaresFour, countKey: "screens" },
  { id: "permissions", label: "역할과 권한", icon: UsersThree, countKey: "permissions" },
  { id: "states", label: "상태와 예외", icon: Warning, countKey: "states" },
  { id: "copy", label: "화면 문구", icon: TextT, countKey: "uxCopy" },
  { id: "tasks", label: "작업 목록", icon: CheckSquare, countKey: "tasks" },
  { id: "diff", label: "변경 내역", icon: GitDiff, countKey: "diff" },
  { id: "runs", label: "변환 이력", icon: ClockCounterClockwise, countKey: "runs" },
  { id: "sources", label: "원문", icon: Article, countKey: "sources" },
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

  const counts = useMemo(
    () => ({
      brief: 1,
      questions: document.questions.length,
      screens: document.screens.length,
      permissions: document.permissions.length,
      states: document.states.length,
      uxCopy: document.uxCopy.length,
      tasks: document.tasks.length,
      runs: project.runs.length,
      diff: 0,
      sources: sourcesCount,
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

  function updateTaskStatus(id: string, status: "todo" | "in-progress" | "done") {
    const nextDoc = {
      ...document,
      tasks: document.tasks.map((t) => (t.id === id ? { ...t, status } : t)),
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

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement).tagName;
      if (["INPUT", "TEXTAREA", "SELECT"].includes(tag)) return;
      if (e.key === "?") { setHelpOpen(true); return; }
      if (e.key === "s" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        saveDocument();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
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
    } else {
      setError(data.error ?? "정리하지 못했습니다.", recompile);
    }
    setPending(false);
  // eslint-disable-next-line react-hooks/exhaustive-deps
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

  const navToSection: Record<string, string> = {
    brief: "section-brief",
    questions: "section-questions",
    tasks: "section-tasks",
  };

  function chooseNav(id: string) {
    if (!guardEditing()) return;
    setEditing(false);
    setActiveNav(id);
    if (id === "screens") setView("flow");
    else if (id === "permissions" || id === "states") setView("matrix");
    else if (id === "runs") setView("runs");
    else if (id === "diff") setView("diff");
    else if (id === "sources") setView("sources");
    else setView("document");
    if (navToSection[id]) {
      const sectionId = navToSection[id];
      setTimeout(() => {
        window.document.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth" });
      }, 80);
    }
  }

  function chooseView(mode: ViewMode) {
    if (!guardEditing()) return;
    setEditing(false);
    setView(mode);
    if (mode === "flow") setActiveNav("screens");
    else if (mode === "matrix") {
      if (activeNav !== "states") setActiveNav("permissions");
    } else if (mode === "document") {
      if (["screens", "runs", "diff", "sources", "figma"].includes(activeNav))
        setActiveNav("brief");
    } else if (mode === "runs") {
      setActiveNav("runs");
    } else if (mode === "diff") {
      setActiveNav("diff");
    } else if (mode === "sources") {
      setActiveNav("sources");
    }
  }

  return (
    <>
    <main className="workspace">
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
          {navItems.map((item) => {
            const Icon = item.icon;
            return (
              <button
                className={`nav-item ${activeNav === item.id ? "active" : ""}`}
                key={item.id}
                onClick={() => chooseNav(item.id)}
              >
                <Icon size={18} />
                <span className="nav-label">{item.label}</span>
                <span className="nav-count">{counts[item.countKey]}</span>
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
        <div className="view-switcher" aria-label="보기 방식">
          {[
            ["document", "문서"],
            ["flow", "플로우"],
            ["matrix", "매트릭스"],
          ].map(([id, label]) => (
            <button
              className={`view-button ${view === id ? "active" : ""}`}
              key={id}
              onClick={() => chooseView(id as ViewMode)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="header-actions">
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
                onClick={() => chooseView("figma")}
              >
                Figma 매핑 확인
              </button>
            </div>
          </div>
        </div>
      </header>

      <section
        className="workspace-main"
        style={view !== "flow" ? { gridTemplateRows: "1fr" } : undefined}
        data-canvas-collapsed={view === "flow" && canvasCollapsed ? "true" : undefined}
      >
        {view === "flow" ? (
          selectedScreen ? (
          <>
            <FlowCanvas
              document={document}
              selectedScreenId={selectedScreen.id}
              onSelect={setSelectedId}
              onPositionUpdate={handlePositionUpdate}
              collapsed={canvasCollapsed}
              onToggleCollapse={() => setCanvasCollapsed((c) => !c)}
              onRecompile={recompile}
            />
            <section className="detail-panel">
              <div className="detail-heading">
                <h2>
                  선택한 화면 상세
                  <span className="detail-subtitle">{selectedScreen.name}</span>
                </h2>
                <div className="header-actions">
                  {note === "저장됨" ? <span className="save-note">✓ 저장됨</span> : null}
                  {editing ? (
                    <button className="button button-primary" disabled={pending} onClick={saveDocument}>
                      <ListChecks size={17} />
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
              <ScreenDetail screen={selectedScreen} editing={editing} onChange={replaceScreen} />
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
            onUpdateTaskStatus={updateTaskStatus}
          />
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
          />
        ) : (
          <RunsView runs={project.runs} />
        )}
      </section>

      {selectedScreen ? (
        <EvidencePanel
          evidence={selectedScreen.evidence}
          onStatusChange={replaceEvidence}
          onNavigateDiff={() => chooseView("diff")}
        />
      ) : (
        <aside className="evidence-panel" />
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
