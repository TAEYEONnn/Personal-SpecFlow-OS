"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { ClipboardText, FileText, Sparkle } from "@phosphor-icons/react";
import { SourceViewer, type ProjectSource } from "./source-viewer";

export function ProjectOnboarding({
  project,
  username,
}: {
  project: { id: string; name: string; sources: ProjectSource[] };
  username: string;
}) {
  const router = useRouter();
  const [sources, setSources] = useState<ProjectSource[]>(project.sources);
  const [compileStep, setCompileStep] = useState<"idle" | "compiling" | "failed">("idle");
  const [error, setError] = useState("");
  const [sourcePending, setSourcePending] = useState(false);
  const hasSources = sources.some((s) => s.content?.trim());

  async function handleCompile() {
    if (!hasSources || compileStep === "compiling") return;
    setCompileStep("compiling");
    setError("");
    try {
      const res = await fetch(`/api/projects/${project.id}/compile`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "정리하지 못했습니다.");
      router.refresh();
    } catch (e) {
      setError(e instanceof Error ? e.message : "정리하지 못했습니다.");
      setCompileStep("failed");
    }
  }

  return (
    <main className="project-onboarding">
      <nav className="onboarding-nav">
        <Link href="/projects" className="onboarding-back">← 프로젝트 목록</Link>
      </nav>

      <header className="onboarding-header" aria-labelledby="project-onboarding-title">
        <div className="onboarding-header-copy">
          <p className="onboarding-kicker">{username}님의 프로젝트</p>
          <h1 id="project-onboarding-title" className="onboarding-title">{project.name}</h1>
          <p className="onboarding-description">
            원문이 없어도 프로젝트는 바로 열 수 있어요. 아래에서 텍스트를 붙여넣거나
            파일을 올리면 다음 단계로 정리할 수 있어요.
          </p>
        </div>
        <span className={`onboarding-badge${hasSources ? " onboarding-badge--ready" : ""}`}>
          {hasSources ? "원문 준비됨" : "원문 없음"}
        </span>
      </header>

      <div className="onboarding-body">
        <section className="onboarding-status" aria-live="polite">
          {!hasSources ? (
            <>
              <div className="onboarding-status-icon" aria-hidden="true">
                <ClipboardText size={24} weight="duotone" />
              </div>
              <div className="onboarding-status-copy">
                <p className="onboarding-status-text">
                  아직 정리할 원문이 없어요.
                </p>
                <p className="onboarding-status-sub">
                  빈 프로젝트 상태로 둘 수 있고, 필요할 때 원문을 추가하면 돼요.
                </p>
              </div>
              <a className="button button-primary" href="#project-sources">
                원문 추가하기
              </a>
            </>
          ) : (
            <>
              <div className="onboarding-status-icon onboarding-status-icon--ready" aria-hidden="true">
                <FileText size={24} weight="duotone" />
              </div>
              <div className="onboarding-status-copy">
                <p className="onboarding-status-text">
                  원문이 준비됐어요.
                </p>
                <p className="onboarding-status-sub">
                  정리를 시작하면 요구사항, 화면 흐름, 작업 목록을 만들어요.
                </p>
              </div>
              <button
                className="button button-primary"
                disabled={compileStep === "compiling" || sourcePending}
                onClick={handleCompile}
              >
                <Sparkle size={16} weight="fill" />
                {compileStep === "compiling" ? "정리 중이에요…" : "정리 시작하기"}
              </button>
            </>
          )}
        </section>

        {compileStep === "failed" && error && (
          <p className="onboarding-error" role="alert">
            {error}{" "}
            <button className="retry-button" onClick={handleCompile}>다시 시도</button>
          </p>
        )}

        {!hasSources && (
          <section className="onboarding-empty-card" aria-labelledby="empty-project-title">
            <div>
              <p className="onboarding-kicker">빈 프로젝트</p>
              <h2 id="empty-project-title">먼저 구조를 잡아두고, 원문은 나중에 넣어도 돼요.</h2>
              <p className="onboarding-status-sub">
                아직 분석 결과가 없어서 문서 영역은 비어 있어요. 원문을 추가하면 이 프로젝트 안에서
                바로 다시 정리할 수 있어요.
              </p>
            </div>
          </section>
        )}

        <section className="onboarding-source-card" id="project-sources" aria-label="프로젝트 원문">
          <SourceViewer
            projectId={project.id}
            sources={sources}
            onSourcesChange={setSources}
            onBusyChange={(busy) => setSourcePending(busy)}
          />
        </section>

        <div className="onboarding-footer">
          <Link href="/projects" className="button button-ghost">프로젝트 목록으로</Link>
        </div>
      </div>
    </main>
  );
}
