import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { transferOwnership } from "@/lib/teams/service";

const schema = z.object({ toUserId: z.string().uuid() });

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    const body = schema.parse(await request.json());
    await transferOwnership(teamId, body.toUserId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "대상 사용자 ID를 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}
