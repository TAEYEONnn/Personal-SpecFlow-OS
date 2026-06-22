import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { getCompilationRun } from "@/lib/projects/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; runId: string }> },
) {
  try {
    const { projectId, runId } = await params;
    const run = await getCompilationRun(projectId, runId);
    if (!run) {
      return NextResponse.json({ error: "정리 기록을 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ run });
  } catch (error) {
    return apiError(error);
  }
}
