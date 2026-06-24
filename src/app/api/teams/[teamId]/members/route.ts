import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { getTeam } from "@/lib/teams/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    const team = await getTeam(teamId);
    return NextResponse.json({ members: team.members });
  } catch (error) {
    return apiError(error);
  }
}
