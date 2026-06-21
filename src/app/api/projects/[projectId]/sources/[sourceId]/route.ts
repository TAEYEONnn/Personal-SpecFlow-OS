import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { deleteSource } from "@/lib/projects/service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; sourceId: string }> },
) {
  try {
    const { projectId, sourceId } = await params;
    await deleteSource(projectId, sourceId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
