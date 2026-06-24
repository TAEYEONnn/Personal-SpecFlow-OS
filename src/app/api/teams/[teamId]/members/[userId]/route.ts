import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { changeMemberRole, removeMember } from "@/lib/teams/service";

const roleSchema = z.object({ role: z.enum(["admin", "member"]) });

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> },
) {
  try {
    const { teamId, userId } = await params;
    const body = roleSchema.parse(await request.json());
    await changeMemberRole(teamId, userId, body.role);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "역할을 확인해 주세요." }, { status: 422 });
    }
    return apiError(error);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; userId: string }> },
) {
  try {
    const { teamId, userId } = await params;
    await removeMember(teamId, userId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
