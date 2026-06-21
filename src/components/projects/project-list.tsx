"use client";

import Link from "next/link";
import { ArrowRight, Plus } from "@phosphor-icons/react";

type ProjectSummary = {
  id: string;
  name: string;
  revision: number;
  updatedAt: string;
};

export function ProjectList({ projects }: { projects: ProjectSummary[] }) {
  return (
    <>
      <div className="projects-title-row">
        <div>
          <h1>프로젝트</h1>
          <p>컴파일한 업무 명세를 이어서 검토하세요.</p>
        </div>
        <Link className="button button-primary" href="/projects/new">
          <Plus size={17} weight="bold" />
          새 프로젝트
        </Link>
      </div>
      <div className="project-list">
        {projects.length ? (
          projects.map((project) => (
            <Link className="project-row" href={`/projects/${project.id}`} key={project.id}>
              <div>
                <strong>{project.name}</strong>
                <span>문서 revision {project.revision}</span>
              </div>
              <span>{new Date(project.updatedAt).toLocaleString("ko-KR")}</span>
              <ArrowRight size={18} />
            </Link>
          ))
        ) : (
          <div className="empty-projects">
            <div>
              <h2>첫 업무를 컴파일해 볼까요?</h2>
              <p>회의록이나 요청 메시지를 넣으면 설계 명세로 정리해 드려요.</p>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
