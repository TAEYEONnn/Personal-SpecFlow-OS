import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { getProject } from "@/lib/projects/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    return apiError(error);
  }
}
