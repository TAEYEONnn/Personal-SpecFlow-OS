"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowClockwise,
  CalendarBlank,
  CheckSquare,
  DownloadSimple,
  FileText,
  ListChecks,
  PencilSimple,
  Question,
  SquaresFour,
  TextT,
  UsersThree,
  Warning,
} from "@phosphor-icons/react";
import { LogoutButton } from "@/components/auth/logout-button";
import { DocumentView } from "@/components/workspace/document-view";
import { EvidencePanel } from "@/components/workspace/evidence-panel";
import { FlowCanvas } from "@/components/workspace/flow-canvas";
import { MatrixView } from "@/components/workspace/matrix-view";
import { ScreenDetail } from "@/components/workspace/screen-detail";
import type { Evidence, Screen, SpecDocument } from "@/lib/spec/schema";
import type { ProjectView } from "@/lib/projects/service";

type ViewMode = "document" | "flow" | "matrix";

const navItems = [
  { id: "brief", label: "브리프", icon: FileText, countKey: "brief" },
  { id: "questions", label: "확인 질문", icon: Question, countKey: "questions" },
  { id: "screens", label: "화면 목록", icon: SquaresFour, countKey: "screens" },
  { id: "permissions", label: "역할·권한", icon: UsersThree, countKey: "permissions" },
  { id: "states", label: "상태·예외", icon: Warning, countKey: "states" },
  { id: "copy", label: "UX 문구", icon: TextT, countKey: "uxCopy" },
  { id: "tasks", label: "작업 목록", icon: CheckSquare, countKey: "tasks" },
  { id: "report", label: "일일보고", icon: CalendarBlank, countKey: "report" },
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
  const selectedScreen =
    document.screens.find((screen) => screen.id === selectedId) ?? document.screens[0];

  const counts = useMemo(
    () => ({
      brief: 1,
      questions: document.questions.length,
      screens: document.screens.length,
      permissions: document.permissions.length,
      states: document.states.length,
      uxCopy: document.uxCopy.length,
      tasks: document.tasks.length,
      report: 1,
    }),
    [document],
  );

  function replaceScreen(next: Screen) {
    setDocument((current) => ({
      ...current,
      screens: current.screens.map((screen) => (screen.id === next.id ? next : screen)),
    }));
  }

  function replaceEvidence(status: Evidence["reviewStatus"]) {
    replaceScreen({
      ...selectedScreen,
      evidence: { ...selectedScreen.evidence, reviewStatus: status },
    });
  }

  async function saveDocument() {
    setPending(true);
    setNote("");
    const response = await fetch(`/api/projects/${project.id}/document`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ revision, document }),
    });
    const data = await response.json();
    if (response.ok) {
      setRevision(data.revision);
      setEditing(false);
      setNote("저장됨");
    } else {
      setNote(data.error ?? "저장하지 못했습니다.");
    }
    setPending(false);
  }

  async function recompile() {
    if (!window.confirm("현재 문서를 보존하고 최신 원문으로 다시 컴파일할까요?")) return;
    setPending(true);
    setNote("컴파일 중…");
    const response = await fetch(`/api/projects/${project.id}/compile`, { method: "POST" });
    const data = await response.json();
    if (response.ok) {
      setDocument(data.document);
      setRevision(data.revision);
      setSelectedId(data.document.screens[0]?.id ?? "");
      setNote("컴파일 완료");
    } else {
      setNote(data.error ?? "컴파일하지 못했습니다.");
    }
    setPending(false);
  }

  function chooseNav(id: string) {
    setActiveNav(id);
    if (id === "screens") setView("flow");
    else if (id === "permissions" || id === "states") setView("matrix");
    else setView("document");
  }

  return (
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
          <div className="sidebar-project-name">{project.name}</div>
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
              onClick={() => setView(id as ViewMode)}
            >
              {label}
            </button>
          ))}
        </div>
        <div className="header-actions">
          <span className="compile-status">
            <span className="status-dot" />
            {note || `컴파일 완료 · revision ${revision}`}
          </span>
          <button className="button" disabled={pending} onClick={recompile}>
            <ArrowClockwise size={17} />
            재컴파일
          </button>
          <a className="button" href={`/api/projects/${project.id}/export?format=markdown`}>
            <DownloadSimple size={17} />
            Markdown
          </a>
          <a className="button" href={`/api/projects/${project.id}/export?format=json`}>
            <DownloadSimple size={17} />
            JSON
          </a>
        </div>
      </header>

      <section className="workspace-main">
        {view === "flow" ? (
          <>
            <FlowCanvas
              document={document}
              selectedScreenId={selectedScreen.id}
              onSelect={setSelectedId}
            />
            <section className="detail-panel">
              <div className="detail-heading">
                <div />
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
        ) : view === "document" ? (
          <DocumentView document={document} />
        ) : (
          <MatrixView document={document} />
        )}
      </section>

      <EvidencePanel evidence={selectedScreen.evidence} onStatusChange={replaceEvidence} />
    </main>
  );
}
