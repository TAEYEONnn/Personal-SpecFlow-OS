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
import { CompileProgress } from "@/components/workspace/compile-progress";
import { DecisionsView } from "@/components/workspace/decisions-view";
import { HelpOverlay } from "@/components/workspace/help-overlay";
import { SourceViewer, type ProjectSource } from "@/components/workspace/source-viewer";
import { useWorkspacePreferences } from "@/lib/browser-state";
import { createDocumentSaveQueue } from "@/lib/projects/document-save-queue";
import type {
  Evidence,
  Question as SpecQuestion,
  Screen,
  SpecDocument,
  Task,
  UxCopy,
} from "@/lib/spec/schema";
import type { ProjectView } from "@/lib/projects/service";

type ViewMode = "document" | "flow" | "matrix" | "runs" | "diff" | "figma" | "sources" | "decisions";
type CompileStep =
  | "idle"
  | "preparing"
  | "reading-sources"
  | "analyzing"
  | "merging"
  | "saving"
  | "completed"
  | "failed";

const compileStepLabel: Record<CompileStep, string> = {
  idle: "",
  preparing: "원문을 준비하고 있어요",
  "reading-sources": "원문 내용을 확인하고 있어요",
  analyzing: "요구사항과 화면을 분석하고 있어요",
  merging: "기존 수정 내용과 병합하고 있어요",
  saving: "결과를 저장하고 있어요",
  completed: "정리가 완료됐어요",
  failed: "정리하지 못했어요",
};

const primaryNavItems = [
  { id: "overview", label: "개요", icon: FileText, countKey: "brief", description: "목적과 성공 조건", alwaysShow: true },
  { id: "requirements", label: "요구사항", icon: ListChecks, countKey: "requirements", description: "도출된 기능 요구사항 목록", alwaysShow: false },
  { id: "questions", label: "확인 질문", icon: Question, countKey: "questions", description: "결정이 필요한 내용", alwaysShow: false },
  { id: "decisions", label: "결정 기록", icon: Notepad, countKey: "decisions", description: "확정된 내용", alwaysShow: false },
  { id: "screens", label: "화면 흐름", icon: SquaresFour, countKey: "screens", description: "화면 흐름과 상세", alwaysShow: true },
  { id: "states", label: "상태·예외", icon: Warning, countKey: "states", description: "화면별 상태와 예외", alwaysShow: false },
  { id: "permissions", label: "역할·권한", icon: UsersThree, countKey: "roles", description: "역할별 가능 범위", alwaysShow: false },
  { id: "tasks", label: "작업 목록", icon: CheckSquare, countKey: "tasks", description: "진행할 작업", alwaysShow: true },
] as const;

const referenceNavItems = [
  { id: "sources", label: "원문", icon: Article, countKey: "sources", description: "추가한 원문", alwaysShow: true },
  { id: "diff", label: "변경 영향", icon: GitDiff, countKey: "diff", description: "버전 간 변경 사항 비교", alwaysShow: true },
  { id: "runs", label: "활동 기록", icon: ClockCounterClockwise, countKey: "runs", description: "정리 실행 기록", alwaysShow: true },
] as const;

function buildMergeNote(
  merge: { added?: number; deduplicated?: number; preservedCompletedTasks?: number; preservedAnsweredQuestions?: number } | undefined,
): string {
  if (!merge) return "정리가 완료됐어요";
  const parts: string[] = ["정리 완료"];
  if ((merge.added ?? 0) > 0) parts.push(`새 항목 ${merge.added}개`);
  if ((merge.deduplicated ?? 0) > 0) parts.push(`중복 ${merge.deduplicated}개 병합`);
  if ((merge.preservedCompletedTasks ?? 0) > 0) parts.push(`완료 작업 ${merge.preservedCompletedTasks}개 유지`);
  if ((merge.preservedAnsweredQuestions ?? 0) > 0) parts.push(`답변 ${merge.preservedAnsweredQuestions}개 유지`);
  return parts.join(" · ");
}

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
  const [nameSaved, setNameSaved] = useState(false);
  const nameSavedTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [notionDialog, setNotionDialog] = useState(false);
  const [exportOpen, setExportOpen] = useState(false);
  const [notionPageId, setNotionPageId] = useState("");
  const [notionPending, setNotionPending] = useState(false);
  const [notionResult, setNotionResult] = useState<{ url: string } | null>(null);
  const [sources, setSources] = useState<ProjectSource[]>(() =>
    structuredClone(project.sources),
  );
  const [lastDeletedTaskId, setLastDeletedTaskId] = useState<string | null>(null);
  const [canvasCollapsed, setCanvasCollapsed] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const {
    canvasHeight,
    setCanvasHeight,
    evidencePanelCollapsed,
    setEvidencePanelCollapsed,
  } = useWorkspacePreferences();
  const [needsRecompile, setNeedsRecompile] = useState(project.needsRecompile ?? false);
  const [compileStep, setCompileStep] = useState<CompileStep>("idle");
  const [compileStartedAt, setCompileStartedAt] = useState<number | null>(null);
  const [compileElapsed, setCompileElapsed] = useState(0);
  const [sourceOperationCount, setSourceOperationCount] = useState(0);
  const prevPositions = useRef<Record<string, { x: number; y: number }> | null>(null);
  const documentRef = useRef(document);
  const pendingSaveCount = useRef(0);
  const recompilingRef = useRef(false);
  const sourceChangeVersionRef = useRef(0);
  const saveQueue = useRef<ReturnType<typeof createDocumentSaveQueue> | null>(null);
  const sourcePending = sourceOperationCount > 0;

  if (!saveQueue.current) {
    saveQueue.current = createDocumentSaveQueue(project.revision, sendDocument);
  }

  useEffect(() => {
    if (!note || noteIsError) return;
    const id = setTimeout(() => setNote(""), 3000);
    return () => clearTimeout(id);
  }, [note, noteIsError]);

  useEffect(() => {
    if (!lastDeletedTaskId) return;
    const id = window.setTimeout(() => setLastDeletedTaskId(null), 6000);
    return () => window.clearTimeout(id);
  }, [lastDeletedTaskId]);

  useEffect(() => {
    if (!editing) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [editing]);

  useEffect(() => {
    if (!compileStartedAt) return;
    const id = setInterval(() => setCompileElapsed(Date.now() - compileStartedAt), 1000);
    return () => { clearInterval(id); setCompileElapsed(0); };
  }, [compileStartedAt]);

  useEffect(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const nextTasks = documentRef.current.tasks.filter((task) => {
      if (!task.deletedAt) return true;
      return new Date(task.deletedAt).getTime() >= cutoff;
    });
    if (nextTasks.length !== documentRef.current.tasks.length) {
      commitDocument({ ...documentRef.current, tasks: nextTasks });
    }
    // Expired trash is normalized once when the workspace opens.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
      sources: sources.length,
      requirements: document.requirements.length,
      questions: document.questions.length,
      decisions:
        document.requirements.filter((r) => r.evidence.reviewStatus === "confirmed").length +
        document.questions.filter((q) => q.resolved).length,
      screens: document.screens.length,
      states: document.states.length,
      roles: document.roles.length,
      tasks: document.tasks.filter((task) => !task.deletedAt).length,
      diff: 0,
      runs: project.runs.length,
    }),
    [document, project.runs.length, sources.length],
  );

  function replaceScreen(next: Screen) {
    if (recompilingRef.current) return;
    const nextDocument = {
      ...documentRef.current,
      screens: documentRef.current.screens.map((screen) =>
        screen.id === next.id ? next : screen,
      ),
    };
    documentRef.current = nextDocument;
    setDocument(nextDocument);
  }

  function replaceEvidence(status: Evidence["reviewStatus"]) {
    if (!selectedScreen) return;
    const current = documentRef.current;
    commitDocument({
      ...current,
      screens: current.screens.map((screen) =>
        screen.id === selectedScreen.id
          ? { ...screen, evidence: { ...screen.evidence, reviewStatus: status } }
          : screen,
      ),
    });
  }

  async function sendDocument(rev: number, doc: SpecDocument) {
    const response = await fetch(`/api/projects/${project.id}/document`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ revision: rev, document: doc }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "저장하지 못했어요.");
    return data.revision as number;
  }

  function queueDocumentSave(doc: SpecDocument) {
    pendingSaveCount.current += 1;
    setPending(true);
    clearNote();
    return saveQueue.current!.enqueue(structuredClone(doc))
      .then((nextRevision) => {
        setRevision(nextRevision);
        setNote("저장했어요");
        setNoteIsError(false);
        return nextRevision;
      })
      .catch((error: unknown) => {
        const message = error instanceof Error ? error.message : "저장하지 못했어요.";
        setError(message, () => queueDocumentSave(doc));
        throw error;
      })
      .finally(() => {
        pendingSaveCount.current -= 1;
        if (pendingSaveCount.current === 0) setPending(false);
      });
  }

  function commitDocument(next: SpecDocument, save = true) {
    if (recompilingRef.current) return;
    documentRef.current = next;
    setDocument(next);
    if (save) void queueDocumentSave(next).catch(() => undefined);
  }

  const saveDocument = useCallback(async () => {
    if (recompilingRef.current) return;
    await queueDocumentSave(documentRef.current);
    setEditing(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function toggleQuestionResolved(id: string) {
    const current = documentRef.current;
    const nextDoc = {
      ...current,
      questions: current.questions.map((q) =>
        q.id === id ? { ...q, resolved: !q.resolved } : q,
      ),
    };
    commitDocument(nextDoc);
  }

  function handleBriefProblemChange(problem: string) {
    const current = documentRef.current;
    const userEditedFields = [...new Set([...(current.brief.userEditedFields ?? []), "problem"])];
    const next = { ...current, brief: { ...current.brief, problem, userEditedFields } };
    commitDocument(next);
  }

  async function handleQuestionUpdate(id: string, patch: Partial<SpecQuestion>) {
    const current = documentRef.current;
    const next = {
      ...current,
      questions: current.questions.map((question) =>
        question.id === id ? { ...question, ...patch } : question,
      ),
    };
    documentRef.current = next;
    setDocument(next);
    try {
      await queueDocumentSave(next);
    } catch (error) {
      documentRef.current = current;
      setDocument(current);
      throw error;
    }
  }

  function handleTaskCreate(task: Task) {
    const current = documentRef.current;
    commitDocument({ ...current, tasks: [...current.tasks, task] });
  }

  function handleTaskUpdate(id: string, patch: Partial<Task>) {
    const current = documentRef.current;
    const nextDoc = {
      ...current,
      tasks: current.tasks.map((task) =>
        task.id === id ? { ...task, ...patch } : task,
      ),
    };
    commitDocument(nextDoc);
  }

  function handleTaskDelete(id: string) {
    handleTaskUpdate(id, { deletedAt: new Date().toISOString() });
    setLastDeletedTaskId(id);
  }

  function handleTaskRestore(id: string) {
    handleTaskUpdate(id, { deletedAt: null });
    if (lastDeletedTaskId === id) setLastDeletedTaskId(null);
  }

  function handleTaskPurge(id: string) {
    const current = documentRef.current;
    commitDocument({
      ...current,
      tasks: current.tasks.filter((task) => task.id !== id),
    });
  }

  async function handleFigmaMappingChange(mapping: SpecDocument["figmaMapping"]) {
    const current = documentRef.current;
    const next = { ...current, figmaMapping: mapping };
    documentRef.current = next;
    setDocument(next);
    try {
      await queueDocumentSave(next);
    } catch (error) {
      documentRef.current = current;
      setDocument(current);
      throw error;
    }
  }

  function handleUxCopyChange(items: UxCopy[]) {
    if (!selectedScreen) return;
    const current = documentRef.current;
    const others = current.uxCopy.filter((c) => c.screenId !== selectedScreen.id);
    commitDocument({ ...current, uxCopy: [...others, ...items] });
  }

  function handleAutoLayout(positions: Record<string, { x: number; y: number }>) {
    const current = documentRef.current;
    prevPositions.current = Object.fromEntries(
      [
        ...current.screens.map((screen) => [screen.id, { ...screen.position }] as const),
        ...current.states
          .filter((state) => state.position)
          .map((state) => [state.id, { ...state.position! }] as const),
      ],
    );
    const nextDoc = {
      ...current,
      screens: current.screens.map((s) =>
        positions[s.id] ? { ...s, position: positions[s.id] } : s,
      ),
      states: current.states.map((state) =>
        positions[state.id] ? { ...state, position: positions[state.id] } : state,
      ),
    };
    commitDocument(nextDoc);
  }

  function handleUndoLayout() {
    if (!prevPositions.current) return;
    const saved = prevPositions.current;
    prevPositions.current = null;
    const current = documentRef.current;
    const nextDoc = {
      ...current,
      screens: current.screens.map((s) =>
        saved[s.id] ? { ...s, position: saved[s.id] } : s,
      ),
      states: current.states.map((state) =>
        saved[state.id]
          ? { ...state, position: saved[state.id] }
          : { ...state, position: undefined },
      ),
    };
    commitDocument(nextDoc);
  }

  function handlePositionUpdate(id: string, pos: { x: number; y: number }, nodeType: "screen" | "state" = "screen") {
    const current = documentRef.current;
    const nextDoc = nodeType === "state"
      ? { ...current, states: current.states.map((s) => s.id === id ? { ...s, position: pos } : s) }
      : { ...current, screens: current.screens.map((s) => s.id === id ? { ...s, position: pos } : s) };
    commitDocument(nextDoc);
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
        if (recompilingRef.current) return;
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

  async function recompile() {
    if (compileStep !== "idle" && compileStep !== "completed" && compileStep !== "failed") {
      return;
    }
    if (sourcePending) {
      setError("원문 저장이 끝난 뒤 다시 정리해 주세요.");
      return;
    }
    if (!window.confirm("원문 변경사항을 반영해서 다시 정리할까요? 직접 수정한 답변과 작업은 유지해요.")) return;
    try {
      await queueDocumentSave(documentRef.current);
    } catch {
      return;
    }

    setEditing(false);
    setPending(true);
    setCompileStartedAt(Date.now());
    setCompileStep("preparing");
    setNote("원문을 준비하고 있어요");
    setNoteIsError(false);
    setRetryFn(null);
    const sourceVersionAtStart = sourceChangeVersionRef.current;
    recompilingRef.current = true;
    try {
      setCompileStep("reading-sources");
      let capturedMerge: { added?: number; deduplicated?: number; preservedCompletedTasks?: number; preservedAnsweredQuestions?: number } | undefined;
      const result = await saveQueue.current!.runExclusive(async () => {
        setCompileStep("analyzing");
        const response = await fetch(`/api/projects/${project.id}/compile`, {
          method: "POST",
        });
        setCompileStep("merging");
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error ?? "정리하지 못했습니다.");
        }
        capturedMerge = data.merge;
        return {
          revision: data.revision as number,
          value: data.document as SpecDocument,
        };
      });
      const compiledDocument = result.value;
      setCompileStep("saving");
      documentRef.current = compiledDocument;
      setDocument(compiledDocument);
      setRevision(result.revision);
      setSelectedId(compiledDocument.screens[0]?.id ?? "");
      setCompileStep("completed");
      const mergeNote = buildMergeNote(capturedMerge);
      setNote(mergeNote);
      setNoteIsError(false);
      setNeedsRecompile(
        sourceChangeVersionRef.current !== sourceVersionAtStart,
      );
    } catch (error) {
      setCompileStep("failed");
      setError(
        error instanceof Error ? error.message : "정리하지 못했습니다.",
        recompile,
      );
    } finally {
      recompilingRef.current = false;
      setCompileStartedAt(null);
      if (pendingSaveCount.current === 0) setPending(false);
    }

  }

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
    setNameSaved(true);
    if (nameSavedTimerRef.current) clearTimeout(nameSavedTimerRef.current);
    nameSavedTimerRef.current = setTimeout(() => setNameSaved(false), 2000);
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

  const visiblePrimaryNavItems = primaryNavItems.filter((item) => {
    if (item.alwaysShow) return true;
    return (counts[item.countKey as keyof typeof counts] ?? 0) > 0;
  });
  const visibleReferenceNavItems = referenceNavItems.filter((item) => {
    if (item.alwaysShow) return true;
    return (counts[item.countKey as keyof typeof counts] ?? 0) > 0;
  });

  const navToSection: Record<string, string> = {
    overview: "section-brief",
    requirements: "section-requirements",
    questions: "section-questions",
    tasks: "section-tasks",
    states: "section-states",
    permissions: "section-permissions",
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
              <>
                <button
                  className="sidebar-project-name"
                  title="클릭하여 이름 변경"
                  onClick={() => setNameEditing(true)}
                >
                  {projectName}
                </button>
                {nameSaved && (
                  <span className="sidebar-name-saved" role="status" aria-live="polite">저장됐어요</span>
                )}
              </>
            )}
          </div>
          <nav className="sidebar-nav" aria-label="프로젝트 문서">
            <div className="sidebar-nav-group">
              <span className="sidebar-nav-label">작업 흐름</span>
            {visiblePrimaryNavItems.map((item) => {
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
            </div>
            <div className="sidebar-nav-group sidebar-nav-group--reference">
              <span className="sidebar-nav-label">참고</span>
              {visibleReferenceNavItems.map((item) => {
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
                    <span className="nav-count">
                      {counts[item.countKey as keyof typeof counts]}
                    </span>
                  </button>
                );
              })}
            </div>
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
            <strong>{projectName}</strong>
          </div>
          <div className="header-actions">
            {needsRecompile && (
              <span className="recompile-banner">
                원문이 변경되었어요.
                <button className="button button-primary button--sm" disabled={pending || sourcePending} onClick={recompile}>
                  <ArrowClockwise size={13} />
                  다시 정리하기
                </button>
              </span>
            )}
            <span className={`compile-status${noteIsError ? " compile-status--error" : ""}`}>
              <span className={`status-dot${pending ? " status-dot--pending" : ""}`} />
              {compileStep !== "idle" && compileStep !== "completed"
                ? compileStepLabel[compileStep]
                : note || `정리 완료 · 버전 ${revision}`}
              {compileStartedAt && compileElapsed > 10_000
                ? " 시간이 조금 걸리고 있어요."
                : ""}
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
            {!needsRecompile && (
              <button className="button" disabled={pending || sourcePending} onClick={recompile}>
                <ArrowClockwise size={17} />
                다시 정리하기
              </button>
            )}
            <div className="export-menu">
              <button
                className="button"
                aria-expanded={exportOpen}
                aria-haspopup="true"
                onClick={() => setExportOpen((v) => !v)}
                onKeyDown={(e) => e.key === "Escape" && setExportOpen(false)}
              >
                <DownloadSimple size={17} />
                내보내기
              </button>
              {exportOpen && (
                <>
                  <div
                    className="export-overlay"
                    onClick={() => setExportOpen(false)}
                    onKeyDown={(e) => e.key === "Escape" && setExportOpen(false)}
                    aria-hidden="true"
                  />
                  <div className="export-dropdown" role="menu">
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
                        role="menuitem"
                        href={`/api/projects/${project.id}/export?format=markdown&template=${tmpl}`}
                        onClick={() => setExportOpen(false)}
                      >
                        {label}
                      </a>
                    ))}
                    <div className="export-divider" />
                    <div className="export-group-label">데이터</div>
                    <a
                      className="export-option"
                      role="menuitem"
                      href={`/api/projects/${project.id}/export?format=json`}
                      onClick={() => setExportOpen(false)}
                    >
                      JSON (원본)
                    </a>
                    <div className="export-divider" />
                    <div className="export-group-label">연동</div>
                    <button
                      className="export-option"
                      type="button"
                      role="menuitem"
                      onClick={() => { setExportOpen(false); setNotionDialog(true); setNotionResult(null); }}
                    >
                      Notion으로 내보내기
                    </button>
                    <button
                      className="export-option"
                      type="button"
                      role="menuitem"
                      onClick={() => { setExportOpen(false); setView("figma"); }}
                    >
                      Figma 매핑 확인
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <section
          className={`workspace-main${recompilingRef.current ? " workspace-main--busy" : ""}`}
          aria-busy={recompilingRef.current}
          style={view === "flow" ? { display: "flex", flexDirection: "column" } : { gridTemplateRows: "1fr" }}
        >
          <CompileProgress step={compileStep} startedAt={compileStartedAt} />
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
                    onUndoLayout={prevPositions.current ? handleUndoLayout : undefined}
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
                      {note === "저장했어요" ? <span className="save-note">✓ 저장했어요</span> : null}
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
                <p>화면 정보가 없어요. 원문을 확인하고 다시 정리해봐요.</p>
              </div>
            )
          ) : view === "document" ? (
            <DocumentView
              document={document}
              username={username}
              onToggleResolved={toggleQuestionResolved}
              onQuestionUpdate={handleQuestionUpdate}
              onBriefProblemChange={handleBriefProblemChange}
              onTaskCreate={handleTaskCreate}
              onTaskUpdate={handleTaskUpdate}
              onTaskDelete={handleTaskDelete}
              onTaskRestore={handleTaskRestore}
              onTaskPurge={handleTaskPurge}
            />
          ) : view === "decisions" ? (
            <DecisionsView document={document} />
          ) : view === "matrix" ? (
            <MatrixView document={document} />
          ) : view === "diff" ? (
            <DiffView projectId={project.id} current={document} currentRevision={revision} />
          ) : view === "figma" ? (
            <FigmaView
              projectId={project.id}
              document={document}
              mapping={document.figmaMapping}
              onMappingChange={handleFigmaMappingChange}
            />
          ) : view === "sources" ? (
            <SourceViewer
              projectId={project.id}
              sources={sources}
              onSourcesChange={setSources}
              onSourceChange={() => {
                sourceChangeVersionRef.current += 1;
                setNeedsRecompile(true);
              }}
              onBusyChange={(busy) =>
                setSourceOperationCount((count) =>
                  Math.max(0, count + (busy ? 1 : -1)),
                )
              }
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

      {lastDeletedTaskId && (
        <div className="undo-toast" role="status">
          <span>작업을 휴지통으로 옮겼어요.</span>
          <button
            type="button"
            onClick={() => handleTaskRestore(lastDeletedTaskId)}
          >
            되돌리기
          </button>
          <button
            type="button"
            aria-label="알림 닫기"
            onClick={() => setLastDeletedTaskId(null)}
          >
            ×
          </button>
        </div>
      )}

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
