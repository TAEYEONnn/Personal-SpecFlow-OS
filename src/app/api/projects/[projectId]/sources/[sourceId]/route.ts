import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { deleteSource, updateSource } from "@/lib/projects/service";
import { validateSourceInput } from "@/lib/sources/source-input";

const patchSchema = z.object({
  name: z.string().min(1).max(200).optional(),
  content: z.string().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string; sourceId: string }> },
) {
  try {
    const { projectId, sourceId } = await params;
    const body = patchSchema.parse(await request.json());

    if (body.content !== undefined) {
      const validated = validateSourceInput({ text: body.content });
      body.content = validated.text;
    }

    const source = await updateSource(projectId, sourceId, body);
    return NextResponse.json({ source });
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
