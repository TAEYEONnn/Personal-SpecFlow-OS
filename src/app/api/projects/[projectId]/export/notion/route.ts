import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { createNotionPage, specDocumentToNotionBlocks } from "@/lib/export/notion";
import { getProject } from "@/lib/projects/service";

const bodySchema = z.object({
  parentPageId: z.string().min(1),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const project = await getProject(projectId);
    if (!project?.document) {
      return NextResponse.json({ error: "내보낼 문서가 없습니다." }, { status: 404 });
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("notion_token")?.value;
    if (!token) {
      return NextResponse.json(
        { error: "Notion 계정이 연결되어 있지 않습니다.", notionAuthRequired: true },
        { status: 401 },
      );
    }

    const body = bodySchema.parse(await request.json());
    const blocks = specDocumentToNotionBlocks(project.document);

    const result = await createNotionPage({
      parentPageId: body.parentPageId,
      title: project.document.brief.title,
      blocks,
      token,
    });

    return NextResponse.json({ pageId: result.pageId, url: result.url });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "parentPageId가 필요합니다." }, { status: 422 });
    }
    return apiError(error);
  }
}
