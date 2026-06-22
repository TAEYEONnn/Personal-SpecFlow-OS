import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { getDocumentAtRevision } from "@/lib/projects/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string; revision: string }> },
) {
  try {
    const { projectId, revision } = await params;
    const revNum = Number(revision);
    if (!Number.isInteger(revNum) || revNum < 1) {
      return NextResponse.json({ error: "버전 번호를 확인해 주세요." }, { status: 400 });
    }
    const document = await getDocumentAtRevision(projectId, revNum);
    if (!document) {
      return NextResponse.json({ error: "해당 버전의 문서를 찾을 수 없습니다." }, { status: 404 });
    }
    return NextResponse.json({ revision: revNum, document });
  } catch (error) {
    return apiError(error);
  }
}
