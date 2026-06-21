import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import {
  exportByTemplate,
  exportTemplateFileSuffix,
  type ExportTemplate,
} from "@/lib/export/markdown";
import { getProject } from "@/lib/projects/service";

const validTemplates = new Set<ExportTemplate>([
  "full",
  "screen-spec",
  "qa-checklist",
  "daily-report",
]);

function encodeFileName(fileName: string): string {
  return encodeURIComponent(fileName).replace(
    /['()*]/g,
    (character) =>
      `%${character.charCodeAt(0).toString(16).toUpperCase()}`,
  );
}

function createContentDisposition(
  fileName: string,
  fallbackFileName: string,
): string {
  return [
    "attachment",
    `filename="${fallbackFileName}"`,
    `filename*=UTF-8''${encodeFileName(fileName)}`,
  ].join("; ");
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const project = await getProject(projectId);

    if (!project?.document) {
      return NextResponse.json(
        { error: "내보낼 문서가 없습니다." },
        { status: 404 },
      );
    }

    const url = new URL(request.url);
    const format = url.searchParams.get("format");
    const template = (
      url.searchParams.get("template") ?? "full"
    ) as ExportTemplate;

    if (!validTemplates.has(template)) {
      return NextResponse.json(
        { error: "지원하지 않는 템플릿입니다." },
        { status: 422 },
      );
    }

    const safeName =
      project.name
        .trim()
        .replace(/[^\p{L}\p{N}_-]+/gu, "-")
        .replace(/^-+|-+$/g, "") || "specflow-document";

    if (format === "json") {
      const fileName = `${safeName}.json`;

      return new NextResponse(
        JSON.stringify(project.document, null, 2),
        {
          headers: {
            "content-type": "application/json; charset=utf-8",
            "content-disposition": createContentDisposition(
              fileName,
              "specflow-document.json",
            ),
          },
        },
      );
    }

    if (format === "markdown") {
      const suffix = exportTemplateFileSuffix[template];
      const fileName = `${safeName}${suffix}.md`;

      return new NextResponse(
        exportByTemplate(project.document, template),
        {
          headers: {
            "content-type": "text/markdown; charset=utf-8",
            "content-disposition": createContentDisposition(
              fileName,
              `specflow-${template}.md`,
            ),
          },
        },
      );
    }

    return NextResponse.json(
      { error: "지원하지 않는 내보내기 형식입니다." },
      { status: 422 },
    );
  } catch (error) {
    return apiError(error);
  }
}