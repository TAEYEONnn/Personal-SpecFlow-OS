import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { specDocumentToMarkdown } from "@/lib/export/markdown";
import { getProject } from "@/lib/projects/service";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const project = await getProject(projectId);
    if (!project?.document) {
      return NextResponse.json({ error: "내보낼 문서가 없습니다." }, { status: 404 });
    }
    const format = new URL(request.url).searchParams.get("format");
    const safeName = project.name.replace(/[^\p{L}\p{N}_-]+/gu, "-");
    if (format === "json") {
      return new NextResponse(JSON.stringify(project.document, null, 2), {
        headers: {
          "content-type": "application/json; charset=utf-8",
          "content-disposition": `attachment; filename="${safeName}.json"`,
        },
      });
    }
    if (format === "markdown") {
      return new NextResponse(specDocumentToMarkdown(project.document), {
        headers: {
          "content-type": "text/markdown; charset=utf-8",
          "content-disposition": `attachment; filename="${safeName}.md"`,
        },
      });
    }
    return NextResponse.json({ error: "지원하지 않는 내보내기 형식입니다." }, { status: 422 });
  } catch (error) {
    return apiError(error);
  }
}
