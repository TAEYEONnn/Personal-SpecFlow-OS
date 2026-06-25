import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/context";
import { getTeamMembersForMention } from "@/lib/chat/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    await requireAuthContext();
    const { teamId } = await params;
    const members = await getTeamMembersForMention(teamId);
    return NextResponse.json({ members });
  } catch (error) {
    return apiError(error);
  }
}
