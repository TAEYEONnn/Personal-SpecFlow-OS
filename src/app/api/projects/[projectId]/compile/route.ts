import { NextResponse } from "next/server";
import { compileSpecDocument } from "@/lib/ai/compiler";
import { apiError } from "@/lib/api/response";
import { isDevelopmentDemo } from "@/lib/env";
import {
  createCompilationRun,
  finishCompilationRun,
  getProject,
  saveProjectDocument,
} from "@/lib/projects/service";
import { mergeCompiledDocument } from "@/lib/spec/merge";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  const { projectId } = await params;
  const startedAt = Date.now();
  let runId: string | undefined;

  try {
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }
    const combined = project.sources
      .map((s) => s.content)
      .filter(Boolean)
      .join("\n\n---\n\n");
    if (!combined.trim()) {
      return NextResponse.json(
        { error: "원문을 먼저 올려 주세요." },
        { status: 422 },
      );
    }

    const run = await createCompilationRun(projectId);
    runId = run.id;
    const compiledDocument = await compileSpecDocument(combined, {
      mode: isDevelopmentDemo ? "demo" : "live",
    });
    // Re-fetch latest state after AI compilation to pick up any user edits made during compilation.
    const latestProject = await getProject(projectId).catch(() => null);
    const baseDocument = latestProject?.document ?? project.document;
    const baseRevision = latestProject?.revision ?? project.revision;
    const { document, stats } = mergeCompiledDocument(baseDocument, compiledDocument);
    const revision = await saveProjectDocument(
      projectId,
      baseRevision,
      document,
      run.id,
    );
    await finishCompilationRun(projectId, run.id, {
      status: "completed",
      durationMs: Date.now() - startedAt,
      output: document,
    });

    return NextResponse.json({ runId: run.id, revision, status: "completed", document, merge: stats });
  } catch (error) {
    if (runId) {
      await finishCompilationRun(projectId, runId, {
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorCode: "compile_failed",
        errorMessage: error instanceof Error ? error.message : "정리 실패",
      }).catch(() => undefined);
    }
    const response = apiError(error);
    return response.status === 500
      ? NextResponse.json(
          { error: error instanceof Error ? error.message : "정리하지 못했습니다." },
          { status: 502 },
        )
      : response;
  }
}
