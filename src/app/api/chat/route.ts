import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/context";
import { createMessageSchema } from "@/lib/chat/schema";
import { listMessages, createMessage } from "@/lib/chat/service";

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const teamId = url.searchParams.get("teamId");
    if (!teamId) {
      return NextResponse.json({ error: "teamId가 필요해요." }, { status: 422 });
    }
    const limit = url.searchParams.get("limit")
      ? Number(url.searchParams.get("limit"))
      : undefined;
    const before = url.searchParams.get("before") ?? undefined;
    const after = url.searchParams.get("after") ?? undefined;

    const messages = await listMessages(teamId, { limit, before, after });
    return NextResponse.json({ messages });
  } catch (error) {
    return apiError(error);
  }
}

export async function POST(request: Request) {
  try {
    const auth = await requireAuthContext();
    const body = createMessageSchema.parse(await request.json());
    const message = await createMessage(body, auth.userId);
    return NextResponse.json({ message }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "메시지 내용을 확인해요." }, { status: 422 });
    }
    return apiError(error);
  }
}
