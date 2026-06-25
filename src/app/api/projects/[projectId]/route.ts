import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { deleteProject, getProject, renameProject } from "@/lib/projects/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const project = await getProject(projectId);
    if (!project) {
      return NextResponse.json({ error: "프로젝트를 찾을 수 없어요." }, { status: 404 });
    }
    return NextResponse.json({ project });
  } catch (error) {
    return apiError(error);
  }
}

const renameSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  teamId: z.string().uuid().nullable().optional(),
}).refine((value) => value.name !== undefined || "teamId" in value, {
  message: "변경할 내용을 입력해요.",
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const body = renameSchema.parse(await request.json());
    await renameProject(projectId, body);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "프로젝트 이름을 확인해요." }, { status: 422 });
    }
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    await deleteProject(projectId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
