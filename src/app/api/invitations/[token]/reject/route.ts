import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { rejectInvitation } from "@/lib/teams/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    await rejectInvitation(token);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return apiError(error);
  }
}
