import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { getInvitation } from "@/lib/teams/service";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    return NextResponse.json({ invitation: await getInvitation(token) });
  } catch (error) {
    return apiError(error);
  }
}
