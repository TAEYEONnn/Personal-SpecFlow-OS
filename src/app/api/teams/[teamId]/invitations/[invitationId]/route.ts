import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { cancelInvitation } from "@/lib/teams/service";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ teamId: string; invitationId: string }> },
) {
  try {
    const { invitationId } = await params;
    await cancelInvitation(invitationId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
