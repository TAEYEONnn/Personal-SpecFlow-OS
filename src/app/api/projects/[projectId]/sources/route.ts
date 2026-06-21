import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { addSource } from "@/lib/projects/service";
import { validateSourceInput } from "@/lib/sources/source-input";

const sourceSchema = z.object({
  name: z.string().min(1).max(200),
  type: z.enum(["paste", "txt", "md"]),
  content: z.string(),
  fileSize: z.number().optional(),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const body = sourceSchema.parse(await request.json());
    const validated = validateSourceInput({
      text: body.content,
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
    if (error instanceof Error && /입력|100,000|1MB|TXT/.test(error.message)) {
      return NextResponse.json({ error: error.message }, { status: 422 });
    }
    return apiError(error);
  }
}
