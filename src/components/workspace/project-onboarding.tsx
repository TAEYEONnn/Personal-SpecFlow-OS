"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Sparkle } from "@phosphor-icons/react";
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

  void username;

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
    <div className="project-onboarding">
      <nav className="onboarding-nav">
        <Link href="/projects" className="onboarding-back">← 프로젝트 목록</Link>
      </nav>

      <header className="onboarding-header">
        <h1 className="onboarding-title">{project.name}</h1>
      </header>

      <div className="onboarding-body">
        <div className="onboarding-status">
          {!hasSources ? (
            <>
              <p className="onboarding-status-text">
                아직 원문이 없어요.
              </p>
              <p className="onboarding-status-sub">
                원문을 추가하면 요구사항과 화면 흐름을 정리할 수 있어요.
                원문은 나중에 추가해도 괜찮아요.
              </p>
            </>
          ) : (
            <>
              <p className="onboarding-status-text">
                원문이 준비됐어요. 정리하기를 눌러 문서를 생성해 보세요.
              </p>
              <button
                className="button button-primary"
                disabled={compileStep === "compiling" || sourcePending}
                onClick={handleCompile}
              >
                <Sparkle size={16} weight="fill" />
                {compileStep === "compiling" ? "AI가 정리 중이에요…" : "정리 시작하기"}
              </button>
              {compileStep === "failed" && error && (
                <p className="onboarding-error">
                  {error}{" "}
                  <button className="retry-button" onClick={handleCompile}>다시 시도</button>
                </p>
              )}
            </>
          )}
        </div>

        <SourceViewer
          projectId={project.id}
          sources={sources}
          onSourcesChange={setSources}
          onBusyChange={(busy) => setSourcePending(busy)}
        />

        <div className="onboarding-footer">
          {hasSources ? (
            <Link href="/projects" className="button button-ghost">나중에 추가하기</Link>
          ) : (
            <Link href="/projects" className="button button-ghost">나중에 추가하기</Link>
          )}
        </div>
      </div>
    </div>
  );
}
