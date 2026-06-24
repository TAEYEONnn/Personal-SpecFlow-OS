import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { acceptInvitation } from "@/lib/teams/service";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ token: string }> },
) {
  try {
    const { token } = await params;
    const result = await acceptInvitation(token);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
