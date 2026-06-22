"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ArrowRight, Plus, Trash } from "@phosphor-icons/react";
import { formatKoreanDateTime } from "@/lib/format-date";

type ProjectSummary = {
  id: string;
  name: string;
  revision: number;
  updatedAt: string;
};

export function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  const router = useRouter();
  const [deleting, setDeleting] = useState<string | null>(null);

  async function handleDelete(e: React.MouseEvent, id: string, name: string) {
    e.preventDefault();
    e.stopPropagation();
    if (!window.confirm(`"${name}" 프로젝트를 삭제할까요? 삭제하면 되돌릴 수 없어요.`)) return;
    setDeleting(id);
    await fetch(`/api/projects/${id}`, { method: "DELETE" });
    setDeleting(null);
    router.refresh();
  }

  return (
    <>
      <div className="projects-title-row">
        <div>
          <h1>프로젝트</h1>
          <p>이어서 작업할 프로젝트를 골라요.</p>
        </div>
        <Link className="button button-primary" href="/projects/new">
          <Plus size={17} weight="bold" />
          새 프로젝트
        </Link>
      </div>
      <div className="project-list">
        {projects.length ? (
          projects.map((project) => (
            <div className="project-row-wrapper" key={project.id}>
              <Link className="project-row" href={`/projects/${project.id}`}>
                <div>
                  <strong>{project.name}</strong>
                  <span>문서 버전 {project.revision}</span>
                </div>
                <span>{formatKoreanDateTime(project.updatedAt)}</span>
                <ArrowRight size={18} />
              </Link>
              <button
                className="project-delete-button"
                aria-label={`${project.name} 삭제`}
                disabled={deleting === project.id}
                onClick={(e) => handleDelete(e, project.id, project.name)}
              >
                <Trash size={16} />
              </button>
            </div>
          ))
        ) : (
          <div className="empty-projects">
            <div>
              <h2>첫 프로젝트를 만들어 볼까요?</h2>
              <p>회의록이나 요청 메모를 올리면 화면 구조와 요구사항으로 정리해 드려요.</p>
              <Link className="button button-primary" href="/projects/new" style={{ marginTop: 16, display: "inline-flex" }}>
                <Plus size={17} weight="bold" />
                첫 프로젝트 만들기
              </Link>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
