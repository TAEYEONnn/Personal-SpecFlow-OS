import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { leaveTeam } from "@/lib/teams/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ teamId: string }> },
) {
  try {
    const { teamId } = await params;
    await leaveTeam(teamId);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
