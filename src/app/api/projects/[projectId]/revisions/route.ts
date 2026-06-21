import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { listDocumentRevisions } from "@/lib/projects/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const revisions = await listDocumentRevisions(projectId);
    return NextResponse.json({ revisions });
  } catch (error) {
    return apiError(error);
  }
}
