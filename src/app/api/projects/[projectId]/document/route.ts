import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { saveProjectDocument } from "@/lib/projects/service";
import { specDocumentSchema } from "@/lib/spec/schema";

const updateSchema = z.object({
  revision: z.number().int().nonnegative(),
  document: specDocumentSchema,
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> },
) {
  try {
    const { projectId } = await params;
    const body = updateSchema.parse(await request.json());
    const revision = await saveProjectDocument(projectId, body.revision, body.document);
    return NextResponse.json({ revision, document: body.document });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "문서 형식을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}
