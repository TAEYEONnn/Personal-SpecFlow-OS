import { NextResponse } from "next/server";
import { compileSpecDocument } from "@/lib/ai/compiler";
import { apiError } from "@/lib/api/response";
import {
  createCompilationRun,
  finishCompilationRun,
  getProject,
  saveProjectDocument,
} from "@/lib/projects/service";

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
        { error: "컴파일할 업무 내용을 먼저 추가해 주세요." },
        { status: 422 },
      );
    }

    const run = await createCompilationRun(projectId);
    runId = run.id;
    const document = await compileSpecDocument(combined);
    const revision = await saveProjectDocument(
      projectId,
      project.revision,
      document,
      run.id,
    );
    await finishCompilationRun(projectId, run.id, {
      status: "completed",
      durationMs: Date.now() - startedAt,
      output: document,
    });

    return NextResponse.json({ runId: run.id, revision, status: "completed", document });
  } catch (error) {
    if (runId) {
      await finishCompilationRun(projectId, runId, {
        status: "failed",
        durationMs: Date.now() - startedAt,
        errorCode: "compile_failed",
        errorMessage: error instanceof Error ? error.message : "컴파일 실패",
      }).catch(() => undefined);
    }
    const response = apiError(error);
    return response.status === 500
      ? NextResponse.json(
          { error: error instanceof Error ? error.message : "컴파일에 실패했습니다." },
          { status: 502 },
        )
      : response;
  }
}
