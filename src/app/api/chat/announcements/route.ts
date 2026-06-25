import { NextResponse } from "next/server";
import { apiError } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/context";
import { listAnnouncements, toggleAnnouncement } from "@/lib/chat/service";

export async function GET(request: Request) {
  try {
    await requireAuthContext();
    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId");
    if (!teamId) {
      return NextResponse.json(
        { error: "teamId가 필요해요." },
        { status: 400 },
      );
    }
    const announcements = await listAnnouncements(teamId);
    return NextResponse.json({ announcements });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext();
    const body = await request.json();
    const { teamId, messageId } = body as {
      teamId?: string;
      messageId?: string;
    };
    if (!teamId || !messageId) {
      return NextResponse.json(
        { error: "teamId와 messageId가 필요해요." },
        { status: 400 },
      );
    }
    const result = await toggleAnnouncement(teamId, messageId, auth.userId);
    return NextResponse.json(result);
  } catch (error) {
    return apiError(error);
  }
}
