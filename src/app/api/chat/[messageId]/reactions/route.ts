import { NextResponse } from "next/server";
import { z } from "zod";
import { apiError } from "@/lib/api/response";
import { requireAuthContext } from "@/lib/auth/context";
import { reactionSchema } from "@/lib/chat/schema";
import { addReaction } from "@/lib/chat/service";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ messageId: string }> },
) {
  try {
    const auth = await requireAuthContext();
    const { messageId } = await params;
    const body = reactionSchema.parse(await request.json());
    const message = await addReaction(messageId, body.emoji, auth.userId);
    return NextResponse.json({ message });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "이모지를 확인해요." }, { status: 422 });
    }
    return apiError(error);
  }
}
