"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Plus, Trash, MagnifyingGlass, ArrowsLeftRight } from "@phosphor-icons/react";
import { formatKoreanDateTime } from "@/lib/format-date";
import { TeamSwitcher, useLastTeamId } from "./team-switcher";

type ProjectSummary = {
  id: string;
  name: string;
  revision: number;
  updatedAt: string;
  teamId?: string | null;
  teamName?: string | null;
};

type Team = { id: string; name: string };

export function ProjectList({
  projects,
  teams = [],
}: {
  projects: ProjectSummary[];
  teams?: Team[];
}) {
  const router = useRouter();
  const [activeTeamId, setActiveTeamId] = useLastTeamId(teams);
  const [search, setSearch] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [movingId, setMovingId] = useState<string | null>(null);
  const [moveTarget, setMoveTarget] = useState("");
  const [movePending, setMovePending] = useState(false);

  // Filter
  const filtered = projects.filter((p) => {
    const matchesTeam = activeTeamId === null
      ? true
      : p.teamId === activeTeamId;
    const matchesSearch = !search.trim() || p.name.toLowerCase().includes(search.trim().toLowerCase());
    return matchesTeam && matchesSearch;
  });

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`"${name}" 프로젝트를 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return;
    setDeleting(id);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  async function handleMove(id: string) {
    setMovePending(true);
    try {
      const res = await fetch(`/api/projects/${id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ teamId: moveTarget || null }),
      });
      if (res.ok) { setMovingId(null); setMoveTarget(""); router.refresh(); }
    } finally { setMovePending(false); }
  }

  const activeTeamName = teams.find((t) => t.id === activeTeamId)?.name;

  return (
    <>
      <div className="projects-title-row">
        <div>
          <h1>프로젝트</h1>
          {teams.length > 0 ? (
            <TeamSwitcher teams={teams} activeTeamId={activeTeamId} onSwitch={setActiveTeamId} />
          ) : (
            <p>이어서 작업할 프로젝트를 골라요.</p>
          )}
        </div>
        <Link className="button button-primary" href="/projects/new">
          <Plus size={17} weight="bold" />
          새 프로젝트
        </Link>
      </div>

      {/* Search */}
      <div className="project-search-row">
        <div className="project-search-wrap">
          <MagnifyingGlass size={16} className="project-search-icon" />
          <input
            className="field project-search-input"
            placeholder="프로젝트 검색…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>

      <div className="project-list">
        {filtered.length ? (
          filtered.map((project) => (
            <div className="project-row-wrapper" key={project.id}>
              <Link className="project-row" href={`/projects/${project.id}`}>
                <div>
                  <strong>{project.name}</strong>
                  <span>
                    {project.teamName && (
                      <span className="project-team-badge">{project.teamName}</span>
                    )}
                    문서 버전 {project.revision}
                  </span>
                </div>
                <span>{formatKoreanDateTime(project.updatedAt)}</span>
                <ArrowRight size={18} />
              </Link>
              <button
                className="project-action-button"
                aria-label={`${project.name} 팀 이동`}
                title="다른 팀으로 이동"
                onClick={(e) => { e.preventDefault(); setMovingId(project.id); setMoveTarget(project.teamId ?? ""); }}
              >
                <ArrowsLeftRight size={16} />
              </button>
              <button
                className="project-delete-button"
                aria-label={`${project.name} 삭제`}
                disabled={deleting === project.id}
                onClick={(e) => handleDelete(e, project.id, project.name)}
              >
                <Trash size={16} />
              </button>

              {/* Inline move panel */}
              {movingId === project.id && (
                <div className="project-move-panel">
                  <select className="field" value={moveTarget} onChange={(e) => setMoveTarget(e.target.value)}>
                    <option value="">개인 프로젝트</option>
                    {teams.map((t) => (
                      <option key={t.id} value={t.id}>{t.name}</option>
                    ))}
                  </select>
                  <button className="button button-primary button-sm" disabled={movePending}
                    onClick={() => handleMove(project.id)}>
                    {movePending ? "이동 중…" : "이동"}
                  </button>
                  <button className="button button-ghost button-sm"
                    onClick={() => { setMovingId(null); setMoveTarget(""); }}>
                    취소
                  </button>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="empty-projects">
            <div>
              {search.trim() ? (
                <>
                  <h2>검색 결과가 없어요.</h2>
                  <p>&ldquo;{search}&rdquo; 와 일치하는 프로젝트가 없어요.</p>
                </>
              ) : activeTeamId ? (
                <>
                  <h2>아직 프로젝트가 없어요.</h2>
                  <p>
                    {activeTeamName ? `"${activeTeamName}" 팀의 ` : ""}첫 프로젝트를 만들고 팀 작업을 시작해 보세요.
                  </p>
                  <Link className="button button-primary" href="/projects/new"
                    style={{ marginTop: 16, display: "inline-flex" }}>
                    <Plus size={17} weight="bold" />
                    프로젝트 만들기
                  </Link>
                </>
              ) : (
                <>
                  <h2>첫 프로젝트를 만들어 볼까요?</h2>
                  <p>회의록이나 요청 메모를 올리면 화면 구조와 요구사항으로 정리해 드려요.</p>
                  <Link className="button button-primary" href="/projects/new"
                    style={{ marginTop: 16, display: "inline-flex" }}>
                    <Plus size={17} weight="bold" />
                    첫 프로젝트 만들기
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
