import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { inviteMember, listPendingInvitations } from "@/lib/teams/service";

const inviteSchema = z.object({
  username: z.string().trim().max(32).optional(),
  role: z.enum(["admin", "member"]).default("member"),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    return NextResponse.json({ invitations: await listPendingInvitations(teamId) });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    const body = inviteSchema.parse(await request.json());
    const invitation = await inviteMember(teamId, body.username ?? "", body.role);
    return NextResponse.json({ invitation }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "아이디를 확인해요." }, { status: 422 });
    }
    return apiError(error);
  }
}
