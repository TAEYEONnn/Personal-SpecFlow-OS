import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { renameTeam, deleteTeam } from "@/lib/teams/service";

const renameSchema = z.object({ name: z.string().trim().min(1).max(120) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    const body = renameSchema.parse(await request.json());
    await renameTeam(teamId, body.name);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "팀 이름을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    await deleteTeam(teamId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
