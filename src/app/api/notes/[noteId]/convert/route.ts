import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/context";
import { convertScratchSchema } from "@/lib/notes/schema";
import { convertScratch } from "@/lib/notes/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ noteId: string }> },
) {
  try {
    const auth = await requireAuthContext();
    const { noteId } = await params;
    const body = convertScratchSchema.parse(await request.json());
    const result = await convertScratch(noteId, body.target, auth.userId);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "전환 대상을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}
