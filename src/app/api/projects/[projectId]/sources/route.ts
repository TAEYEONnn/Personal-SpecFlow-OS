import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { addSource } from "@/lib/projects/service";
import { extractPdfText, pdfResultToSourceText } from "@/lib/sources/pdf-extract";
import { validateSourceInput } from "@/lib/sources/source-input";

const sourceSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["paste", "txt", "md", "pdf"]),
  content: z.string(),
  fileSize: z.number().optional(),
  isPdfBase64: z.boolean().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const body = sourceSchema.parse(await request.json());

    let text = body.content;
    if (body.isPdfBase64 && body.type === "pdf") {
      const buffer = Buffer.from(body.content, "base64");
      const result = extractPdfText(buffer);
      text = pdfResultToSourceText(result);
      if (!text.trim()) {
        return NextResponse.json(
          { error: "PDF에서 텍스트를 추출할 수 없습니다. 텍스트 기반 PDF인지 확인해 주세요." },
          { status: 422 },
        );
      }
    }

    const validated = validateSourceInput({
      text,
      fileName: body.type === "paste" ? undefined : body.name,
      fileSize: body.fileSize,
    });
    const source = await addSource(projectId, {
      name: body.name,
      type: body.type,
      content: validated.text,
    });
    return NextResponse.json({ source }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "입력 형식을 확인해 주세요." }, { status: 422 });
    }
    if (error instanceof Error && /입력|100,000|10MB|TXT|PDF/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return apiError(error);
  }
}
